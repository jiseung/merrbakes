import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fetchVariantForCheckout, notionHeaders } from '@/lib/notion';

const ORDERS_DB_ID = process.env.NOTION_ORDERS_DB_ID;

type CartLine = { variantId: string; quantity?: number };

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
    const { items, email, referredBy } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'missing items' }, { status: 400 });
    }

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
      const quantity = Number(line.quantity) > 0 ? Number(line.quantity) : 1;
      lineItems.push({ price: variant.stripePriceId, quantity });
      shippingInputs.push({ ...variant, quantity });
    }

    const shippingCents = computeShippingCents(shippingInputs);

    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      // one-time payments default to customer_creation: 'if_required', which
      // often skips creating a retained Customer record — without this, most
      // buyers wouldn't be searchable/selectable in the Dashboard later (e.g.
      // to restrict a referral promo code to a specific person).
      customer_creation: 'always',
      // pre-fills Stripe's own email field with what the pre-checkout step
      // already collected, so the customer isn't asked twice — still editable.
      ...(trimmedEmail ? { customer_email: trimmedEmail } : {}),
      // read back in /api/stripe-webhook to fill in the Orders row's "Referred
      // By" field — only set at all if the server-side eligibility check above
      // agreed the buyer is new, regardless of what the client sent.
      metadata: { referred_by: referralEligible ? trimmedReferral : '' },
      // these are baked-to-order and shipped — collect an address so a completed
      // order actually has somewhere to go (see /api/stripe-webhook).
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: shippingCents, currency: 'usd' },
            display_name: 'Shipping',
          },
        },
      ],
      success_url: `${origin}/shop?checkout=success`,
      cancel_url: `${origin}/shop?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const err = error as Error;
    console.log('checkout error:', err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
