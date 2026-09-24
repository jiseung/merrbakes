import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getTweatClub } from '@/lib/tweat';
import { syncStripePrice } from '@/lib/reconcile';

// "Change my level" for Tweat of the Week members: sends them to Stripe's hosted
// customer portal login page (they enter their email, Stripe emails a code — no
// accounts on our side). The portal configuration is created/updated here from
// the live Notion levels, so it follows price changes and works in test and
// live mode without manual dashboard setup. Level switches apply at the next
// Friday 6pm charge (no proration), so a change before then covers that box.
const CONFIG_TAG = 'merrbakes-tweat';

async function levelProducts(): Promise<{ product: string; prices: string[] }[] | null> {
  const club = await getTweatClub();
  if (!club || club.levels.length === 0) return null;
  const products = [];
  for (const level of club.levels) {
    const synced = await syncStripePrice(
      { id: level.variantId, price: level.price, stripePriceId: level.stripePriceId },
      `${club.name} — ${level.name}`, undefined, 'week'
    );
    if (synced.action === 'error') throw new Error(`${level.name}: ${synced.error}`);
    const priceId = synced.action === 'created' ? synced.priceId
      : synced.action === 'updated' ? synced.newPriceId
      : level.stripePriceId;
    const price = await stripe.prices.retrieve(priceId);
    products.push({ product: typeof price.product === 'string' ? price.product : price.product.id, prices: [price.id] });
  }
  return products;
}

export async function GET() {
  try {
    const products = await levelProducts();
    if (!products) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'none',
        products,
      },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['shipping', 'email'] },
      invoice_history: { enabled: true },
    };
    const business_profile = { headline: 'merrbakes — manage your Tweat of the Week membership' };

    const existing = (await stripe.billingPortal.configurations.list({ active: true, limit: 100 }))
      .data.find((c) => c.metadata?.app === CONFIG_TAG);
    const config = existing
      ? await stripe.billingPortal.configurations.update(existing.id, { features, business_profile, login_page: { enabled: true } })
      : await stripe.billingPortal.configurations.create({ features, business_profile, login_page: { enabled: true }, metadata: { app: CONFIG_TAG } });

    if (!config.login_page.url) throw new Error('portal login page not available');
    return NextResponse.redirect(config.login_page.url, 303);
  } catch (error) {
    console.log('tweat manage error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
