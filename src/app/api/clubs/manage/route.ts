import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getClubs } from '@/lib/clubs';
import { syncStripePrice } from '@/lib/reconcile';

// "Manage my membership" for anyone who joined a club on merrbakes.com: sends
// them to Stripe's hosted customer portal login page (they enter their email,
// Stripe emails a code — no accounts on our side). The portal configuration is
// created/updated here from the live Notion clubs, so it follows price changes
// and works in test and live mode without manual dashboard setup. Switching
// clubs/levels applies at the next charge (no proration) — for Tweat, a change
// before Friday 6pm covers that week's box. Ko-fi members manage on Ko-fi.
const CONFIG_TAG = 'merrbakes-tweat'; // original tag, kept so the existing config is reused

async function clubProducts(): Promise<{ product: string; prices: string[] }[]> {
  const products = [];
  for (const club of await getClubs()) {
    for (const option of club.options) {
      const label = club.options.length > 1 ? `${club.name} — ${option.name}` : club.name;
      const synced = await syncStripePrice(
        { id: option.variantId, price: option.price, stripePriceId: option.stripePriceId }, label, undefined, club.interval
      );
      if (synced.action === 'error') throw new Error(`${label}: ${synced.error}`);
      const priceId = synced.action === 'created' ? synced.priceId
        : synced.action === 'updated' ? synced.newPriceId
        : option.stripePriceId;
      const price = await stripe.prices.retrieve(priceId);
      products.push({ product: typeof price.product === 'string' ? price.product : price.product.id, prices: [price.id] });
    }
  }
  return products;
}

export async function GET() {
  try {
    const products = await clubProducts();
    if (products.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });

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
    const business_profile = { headline: 'merrbakes — manage your membership' };

    const existing = (await stripe.billingPortal.configurations.list({ active: true, limit: 100 }))
      .data.find((c) => c.metadata?.app === CONFIG_TAG);
    const config = existing
      ? await stripe.billingPortal.configurations.update(existing.id, { features, business_profile, login_page: { enabled: true } })
      : await stripe.billingPortal.configurations.create({ features, business_profile, login_page: { enabled: true }, metadata: { app: CONFIG_TAG } });

    if (!config.login_page.url) throw new Error('portal login page not available');
    return NextResponse.redirect(config.login_page.url, 303);
  } catch (error) {
    console.log('clubs manage error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
