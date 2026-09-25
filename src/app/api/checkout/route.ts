import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fetchVariantForCheckout, notionHeaders } from '@/lib/notion';
import { syncStripePrice } from '@/lib/reconcile';
import { displayName } from '@/lib/shopItems';
import { isClubWeekCode } from '@/lib/promo';
import { parseTip, tipLineItem } from '@/lib/tips';
import { cleanStreamName } from '@/lib/streamAlert';

const ORDERS_DB_ID = process.env.NOTION_ORDERS_DB_ID;

type CartLine = { variantId: string; quantity?: number };
// gift orders: either the buyer enters the recipient's address on Stripe's page
// as usual, or (addressFromMerr) just the recipient's name — e.g. a streamer who
// won't share their address with a viewer — and Merr gets the address herself.
type GiftInput = { recipientName?: string; message?: string; addressFromMerr?: boolean };
const GIFT_MESSAGE_MAX = 450; // Stripe metadata values cap at 500 chars

// Re-checks eligibility server-side rather than trusting the client's own
// /api/customer-lookup result — that call only gates whether the cart UI
// *shows* the referral field; someone could still hit this endpoint directly
// with a referredBy value set. Same Notion check either way.
async function isNewCustomer(email: string): Promise<boolean> {
  if (!ORDERS_DB_ID) return false;
  const res = await fetch(`https://api.notion.com/v1/databases/${ORDERS_DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: 'Buyer Email', rich_text: { equals: email } },
      page_size: 1,
    }),
    cache: 'no-store',
  });
  const data = await res.json();
  return (data.results ?? []).length === 0;
}

// Shipping policy (owner-specified, 2026-09-03):
// - Baking/food items (Shop Item Type "Single"): flat $8 for the first unit
//   ordered across the whole cart, +$2 for every additional unit - not per
//   line, per physical item. The $8/$2 figures live on each Shop Item's own
//   "Shipping (US)"/"Additional Item Shipping (US)" fields (all baking items
//   are set to the same $8/$2 today, but this reads the real per-item value
//   rather than hardcoding it).
// - Merch (Type "Merrch"): no combined-shipping-discount data exists (that's
//   set in Ko-fi's own seller dashboard, not visible on the public listing
//   pages), so each unit is charged its own item's full "Shipping (US)" cost -
//   this can overcharge vs. what Ko-fi would charge on a multi-merch-item
//   order, a known gap until real per-item combined values are supplied.
// - Digital (Type "Digital"): $0, no physical shipment.
function computeShippingCents(
  lines: { shopItemType: string; shippingUS: number; additionalItemShippingUS: number; quantity: number }[]
): number {
  let totalCents = 0;

  const bakingLines = lines.filter((l) => l.shopItemType === 'Single');
  const bakingQty = bakingLines.reduce((sum, l) => sum + l.quantity, 0);
  if (bakingQty > 0) {
    const first = bakingLines[0];
    totalCents += Math.round(first.shippingUS * 100);
    totalCents += Math.round(first.additionalItemShippingUS * 100) * (bakingQty - 1);
  }

  for (const line of lines) {
    if (line.shopItemType === 'Merrch') {
      totalCents += Math.round(line.shippingUS * 100) * line.quantity;
    }
  }

  return totalCents;
}

export async function POST(req: NextRequest) {
  try {
    const { items, email, referredBy, promoCode, gift, streamName, streamAnonymous, tipCents, tipNote } = await req.json();
    const tip = parseTip(tipCents, tipNote);
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'missing items' }, { status: 400 });
    }

    // one promo field in the cart: the club-week code (free shipping on drop
    // items, handled below) or any active Stripe promotion code, applied to the
    // session. Stripe's hosted page can't be pre-filled with typed text, so the
    // code is resolved here; with no code, buyers can still enter one on Stripe.
    const code = typeof promoCode === 'string' ? promoCode.trim() : '';
    const clubWeekCode = code !== '' && isClubWeekCode(code);
    let stripePromotionCode: string | null = null;
    if (code && !clubWeekCode) {
      const found = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
      if (!found.data[0]) {
        return NextResponse.json({ error: "that code isn't valid" }, { status: 400 });
      }
      stripePromotionCode = found.data[0].id;
    }

    const giftInput: GiftInput | null = gift && typeof gift === 'object' ? gift : null;
    const giftRecipient = typeof giftInput?.recipientName === 'string' ? giftInput.recipientName.trim().slice(0, 100) : '';
    const giftMessage = typeof giftInput?.message === 'string' ? giftInput.message.trim().slice(0, GIFT_MESSAGE_MAX) : '';
    if (giftInput && !giftRecipient) {
      return NextResponse.json({ error: "add the gift recipient's name" }, { status: 400 });
    }
    const giftAddressFromMerr = !!giftInput && giftInput.addressFromMerr === true;

    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedReferral = typeof referredBy === 'string' ? referredBy.trim() : '';
    const referralEligible = trimmedEmail && trimmedReferral ? await isNewCustomer(trimmedEmail) : false;

    const lineItems = [];
    const shippingInputs = [];
    for (const line of items as CartLine[]) {
      if (typeof line.variantId !== 'string') {
        return NextResponse.json({ error: 'invalid cart line' }, { status: 400 });
      }
      const variant = await fetchVariantForCheckout(line.variantId);
      if (!variant) {
        return NextResponse.json({ error: 'one of the items in your cart is no longer available' }, { status: 404 });
      }
      // memberships are subscriptions with their own signup (/api/subscribe) —
      // a one-time cart charge would bill them once and never again
      if (variant.shopItemType === 'Recurring') {
        return NextResponse.json({ error: 'memberships sign up on their own page, not through the cart' }, { status: 400 });
      }
      // Safety net for Notion edits the sync hasn't picked up yet: make sure the
      // Stripe Price matches Notion's current price (creating/replacing it if not)
      // before charging it, so a customer is never charged a stale price.
      // label only names a newly created Stripe Product (mirrors variantDisplayName).
      const label = variant.name && variant.name !== 'Standard'
        ? `${displayName(variant.shopItemName)} — ${variant.name}`
        : displayName(variant.shopItemName);
      const synced = await syncStripePrice(variant, label);
      if (synced.action === 'error') {
        console.log('checkout price sync error:', variant.id, synced.error);
        return NextResponse.json({ error: 'prices are being updated — please try again in a minute' }, { status: 409 });
      }
      const stripePriceId =
        synced.action === 'created' ? synced.priceId
        : synced.action === 'updated' ? synced.newPriceId
        : variant.stripePriceId;
      const quantity = Number(line.quantity) > 0 ? Number(line.quantity) : 1;
      lineItems.push({ price: stripePriceId, quantity });
      shippingInputs.push({ ...variant, quantity });
    }

    // with the club-week code, drop items ship free — they're left out of the
    // shipping math entirely, everything else in the cart pays as usual
    const dropApplied = clubWeekCode && shippingInputs.some((l) => l.clubWeekDrop);
    const shippingCents = computeShippingCents(clubWeekCode ? shippingInputs.filter((l) => !l.clubWeekDrop) : shippingInputs);
    const shippingLabel = dropApplied ? 'Shipping (club week drop ships free)' : 'Shipping';
    // digital-only carts (recipe cards) have nothing to ship — skip the address
    // form and the $0 shipping line entirely.
    const needsShipping = shippingInputs.some((l) => l.shopItemType !== 'Digital');
    // optional tip: its own line, never part of the shipping math
    if (tip) lineItems.push(tipLineItem(tip.cents));
    // name-only gifts: no address form (Merr asks the recipient), so shipping is
    // charged as a plain line item instead of a shipping option
    const collectAddress = needsShipping && !giftAddressFromMerr;
    if (needsShipping && giftAddressFromMerr && shippingCents > 0) {
      lineItems.push({
        price_data: { currency: 'usd', unit_amount: shippingCents, product_data: { name: shippingLabel } },
        quantity: 1,
      });
    }

    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // cards only (incl. Apple/Google Pay) — no bank payments (owner, 2026-09-24):
      // those settle days later, after the order is already recorded
      payment_method_types: ['card'],
      // card-only isn't enough on its own: Stripe's Link wallet brings its own
      // bank option, so hide Link too — no bank payments for orders/memberships
      // (owner, 2026-09-24; tips at /api/tip keep Link/bank)
      wallet_options: { link: { display: 'never' } },
      line_items: lineItems,
      // one-time payments default to customer_creation: 'if_required', which
      // often skips creating a retained Customer record — without this, most
      // buyers wouldn't be searchable/selectable in the Dashboard later (e.g.
      // to restrict a referral promo code to a specific person).
      customer_creation: 'always',
      // Stripe allows either a pre-applied discount or its own promo box, not both
      ...(stripePromotionCode ? { discounts: [{ promotion_code: stripePromotionCode }] } : { allow_promotion_codes: true }),
      // pre-fills Stripe's own email field with what the pre-checkout step
      // already collected, so the customer isn't asked twice — still editable.
      ...(trimmedEmail ? { customer_email: trimmedEmail } : {}),
      // read back in /api/stripe-webhook to fill in the Orders row's "Referred
      // By" field — only set at all if the server-side eligibility check above
      // agreed the buyer is new, regardless of what the client sent.
      metadata: {
        referred_by: referralEligible ? trimmedReferral : '',
        // read back in /api/stripe-webhook into the Orders row's Gift fields
        gift: giftInput ? 'yes' : '',
        gift_recipient: giftRecipient,
        gift_message: giftMessage,
        gift_address_from_merr: giftAddressFromMerr ? 'yes' : '',
        club_week_code: dropApplied ? 'yes' : '',
        tip_cents: tip ? String(tip.cents) : '',
        tip_note: tip?.note ?? '',
        // on-stream alert name, read back in /api/stripe-webhook (see lib/streamAlert)
        stream_name: cleanStreamName(streamName),
        stream_anonymous: streamAnonymous === true ? 'yes' : '',
      },
      // these are baked-to-order and shipped — collect an address so a completed
      // order actually has somewhere to go (see /api/stripe-webhook).
      ...(collectAddress ? {
        shipping_address_collection: { allowed_countries: ['US'] as const },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount' as const,
              fixed_amount: { amount: shippingCents, currency: 'usd' },
              display_name: shippingLabel,
            },
          },
        ],
      } : {}),
      // order page: confirms payment, clears the cart, and hands out downloads
      // for digital items. Stripe fills in {CHECKOUT_SESSION_ID} on redirect.
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const err = error as Error;
    console.log('checkout error:', err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
