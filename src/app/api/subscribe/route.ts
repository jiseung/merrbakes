import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fetchVariantForCheckout } from '@/lib/notion';
import { syncStripePrice } from '@/lib/reconcile';
import { displayName } from '@/lib/shopItems';
import { firstRecurringCharge } from '@/lib/billing';
import { cleanTwitchHandle } from '@/lib/streamAlert';

// Membership signup via Stripe Checkout in subscription mode (called from
// /club's join section). Card payments only (owner: no bank payments).
// - weekly (Tweat of the Week): the first box is paid at checkout (a one-time
//   line at the level's price); the weekly price then starts at the Friday 6pm
//   charge after that box's cutoff — Stripe models the gap as a trial, which is
//   also what anchors every later charge to Friday 6pm.
// - monthly (Cookie / Tasting / Confectioner's): charged at signup, then the
//   same date each month (Stripe's default; matches /club's FAQ and Ko-fi).
// Members manage/switch through /api/clubs/manage.
export async function POST(req: NextRequest) {
  try {
    const { variantId, email, twitchHandle, streamAnonymous } = await req.json();
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

    const recurring = await stripe.prices.retrieve(price);
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price, quantity: 1 },
        ...(weekly ? [{
          price_data: {
            currency: 'usd',
            unit_amount: recurring.unit_amount ?? 0,
            // notion_page_id lets /api/stripe-webhook count this as a box of the level
            product_data: { name: `${label} — first box`, metadata: { notion_page_id: variant.id } },
          },
          quantity: 1,
        }] : []),
      ],
      ...(trimmedEmail ? { customer_email: trimmedEmail } : {}),
      // on-stream alert name, read back in /api/stripe-webhook (see lib/streamAlert)
      metadata: {
        twitch_handle: cleanTwitchHandle(twitchHandle),
        stream_anonymous: streamAnonymous === true ? 'yes' : '',
      },
      subscription_data: {
        ...(weekly ? { trial_end: Math.floor(firstRecurringCharge().getTime() / 1000) } : {}),
        metadata: { notion_variant_id: variant.id },
      },
      shipping_address_collection: { allowed_countries: ['US'] },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/club#join`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.log('subscribe error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
