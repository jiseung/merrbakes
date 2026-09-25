import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fetchVariantForCheckout } from '@/lib/notion';
import { syncStripePrice } from '@/lib/reconcile';
import { displayName } from '@/lib/shopItems';
import { plannedFirstCharge, WEEKLY_SIGNUP } from '@/lib/weeklySignup';
import { clubCopy } from '@/content/club';
import { parseTip, tipLineItem } from '@/lib/tips';
import { cleanStreamName } from '@/lib/streamAlert';

// Membership signup via Stripe Checkout (called from /club's join section).
// Card payments only (owner: no bank payments).
// - weekly (Tweat of the Week): a payment-mode Checkout for just the first box
//   (at the level's price) that saves the card; once it's paid,
//   /api/stripe-webhook starts the weekly subscription from the Friday 6pm
//   charge after that box's cutoff (lib/weeklySignup — why it's two steps).
// - monthly (Cookie / Tasting / Confectioner's): a subscription-mode Checkout,
//   charged at signup, then the same date each month (Stripe's default; matches
//   /club's FAQ and Ko-fi).
// Members manage/switch through /api/clubs/manage.
export async function POST(req: NextRequest) {
  try {
    const { variantId, email, streamName, tipCents, tipNote } = await req.json();
    // optional one-time tip, charged with the signup (not every renewal)
    const tip = parseTip(tipCents, tipNote);
    if (typeof variantId !== 'string') {
      return NextResponse.json({ error: 'pick a level' }, { status: 400 });
    }
    const variant = await fetchVariantForCheckout(variantId);
    if (!variant || !variant.billingInterval) {
      return NextResponse.json({ error: "that level isn't available" }, { status: 404 });
    }

    const interval = variant.billingInterval;
    const weekly = interval === 'week';
    // make sure Stripe has a recurring Price matching Notion's price + interval
    // (label mirrors variantDisplayName: single-option clubs are just the club name)
    const label = variant.name && variant.name !== 'Standard'
      ? `${displayName(variant.shopItemName)} — ${variant.name}`
      : displayName(variant.shopItemName);
    const synced = await syncStripePrice(variant, label, undefined, interval);
    if (synced.action === 'error') {
      console.log('subscribe price sync error:', variant.id, synced.error);
      return NextResponse.json({ error: 'prices are being updated — please try again in a minute' }, { status: 409 });
    }
    const price = synced.action === 'created' ? synced.priceId
      : synced.action === 'updated' ? synced.newPriceId
      : variant.stripePriceId;

    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const origin = new URL(req.url).origin;
    // on-stream alert name, read back in /api/stripe-webhook (see lib/streamAlert)
    const metadata = {
      stream_name: cleanStreamName(streamName),
      tip_cents: tip ? String(tip.cents) : '',
      tip_note: tip?.note ?? '',
    };
    const shared = {
      payment_method_types: ['card' as const],
      // card-only isn't enough on its own: Stripe's Link wallet brings its own
      // bank option, so hide Link too — no bank payments for orders/memberships
      // (owner, 2026-09-24; tips at /api/tip keep Link/bank)
      wallet_options: { link: { display: 'never' as const } },
      ...(trimmedEmail ? { customer_email: trimmedEmail } : {}),
      shipping_address_collection: { allowed_countries: ['US' as const] },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/club#join`,
    };

    if (weekly) {
      const recurring = await stripe.prices.retrieve(price);
      const amount = recurring.unit_amount ?? 0;
      // first box / first weekly charge both step over the Friday before cookie club week
      const firstCharge = await plannedFirstCharge();
      const firstChargeDay = firstCharge.toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' });
      const session = await stripe.checkout.sessions.create({
        ...shared,
        mode: 'payment',
        customer_creation: 'always',
        // saves the card for the weekly charges (Stripe shows its own consent line)
        payment_intent_data: { setup_future_usage: 'off_session' },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: amount,
              // notion_page_id lets /api/stripe-webhook count this as a box of the
              // level, and the order page recognise it as a membership
              product_data: { name: `${label} — first box`, metadata: { notion_page_id: variant.id } },
            },
            quantity: 1,
          },
          ...(tip ? [tipLineItem(tip.cents)] : []),
        ],
        custom_text: { submit: { message: clubCopy.join.weeklyCheckoutNote(`$${(amount / 100).toFixed(2)}`, firstChargeDay) } },
        metadata: {
          ...metadata,
          membership: WEEKLY_SIGNUP,
          membership_label: label,
          notion_variant_id: variant.id,
          weekly_price: price,
          trial_end: String(Math.floor(firstCharge.getTime() / 1000)),
        },
      });
      return NextResponse.json({ url: session.url });
    }

    const session = await stripe.checkout.sessions.create({
      ...shared,
      mode: 'subscription',
      line_items: [
        { price, quantity: 1 },
        ...(tip ? [tipLineItem(tip.cents)] : []),
      ],
      metadata,
      subscription_data: { metadata: { notion_variant_id: variant.id } },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.log('subscribe error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
