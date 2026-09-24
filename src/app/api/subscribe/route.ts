import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fetchVariantForCheckout } from '@/lib/notion';
import { syncStripePrice } from '@/lib/reconcile';
import { displayName } from '@/lib/shopItems';
import { nextBillingTime } from '@/lib/billing';

// Weekly membership signup (Tweat of the Week) via Stripe Checkout in
// subscription mode. Billing is anchored to the next Friday 6pm Central with no
// proration, so nothing is charged at signup — the first charge (and first box)
// is that Friday. Members change level later through /api/tweat/manage.
export async function POST(req: NextRequest) {
  try {
    const { variantId, email } = await req.json();
    if (typeof variantId !== 'string') {
      return NextResponse.json({ error: 'pick a level' }, { status: 400 });
    }
    const variant = await fetchVariantForCheckout(variantId);
    if (!variant || variant.billingInterval !== 'week') {
      return NextResponse.json({ error: "that level isn't available" }, { status: 404 });
    }

    // make sure Stripe has a weekly recurring Price matching Notion's price
    const label = `${displayName(variant.shopItemName)} — ${variant.name}`;
    const synced = await syncStripePrice(variant, label, undefined, 'week');
    if (synced.action === 'error') {
      console.log('subscribe price sync error:', variant.id, synced.error);
      return NextResponse.json({ error: 'prices are being updated — please try again in a minute' }, { status: 409 });
    }
    const price = synced.action === 'created' ? synced.priceId
      : synced.action === 'updated' ? synced.newPriceId
      : variant.stripePriceId;

    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      ...(trimmedEmail ? { customer_email: trimmedEmail } : {}),
      subscription_data: {
        billing_cycle_anchor: Math.floor(nextBillingTime().getTime() / 1000),
        proration_behavior: 'none',
        metadata: { notion_variant_id: variant.id },
      },
      shipping_address_collection: { allowed_countries: ['US'] },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tweat`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.log('subscribe error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
