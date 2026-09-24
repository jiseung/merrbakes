import { stripe } from '@/lib/stripe';

// Tips for Merr (owner, 2026-09-24 — merrbakes.com's version of Ko-fi's
// donations). Two ways in:
// - an optional tip added to a cart checkout or club signup: chosen on our side
//   and sent as its own one-time line (Stripe's own "customer picks the amount"
//   price can't share a checkout with other items)
// - a standalone tip (/api/tip): a Stripe checkout with only the tip, where the
//   customer types the amount and an optional note
// Tip lines carry product metadata kind=tip so the webhook can keep them out
// of the Notion Orders rows (tips aren't orders — owner, 2026-09-24).

export const TIP_NAME = 'tip for merr 💖';
export const TIP_NOTE_MAX = 450; // Stripe metadata values cap at 500 chars
const TIP_MAX_CENTS = 50000;

// validated tip from a request body: whole cents, $1–$500, or null for no tip
export function parseTip(tipCents: unknown, note: unknown): { cents: number; note: string } | null {
  const cents = Math.round(Number(tipCents));
  if (!Number.isFinite(cents) || cents < 100 || cents > TIP_MAX_CENTS) return null;
  return { cents, note: typeof note === 'string' ? note.trim().slice(0, TIP_NOTE_MAX) : '' };
}

export function tipLineItem(cents: number) {
  return {
    price_data: { currency: 'usd', unit_amount: cents, product_data: { name: TIP_NAME, metadata: { kind: 'tip' } } },
    quantity: 1,
  };
}

// the standalone tip's pay-what-you-want Price, created on first use
const LOOKUP_KEY = 'merrbakes_tip';
export async function standaloneTipPrice(): Promise<string> {
  const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const product = await stripe.products.create({ name: TIP_NAME, metadata: { kind: 'tip' } });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    custom_unit_amount: { enabled: true, minimum: 100, maximum: TIP_MAX_CENTS, preset: 500 },
    lookup_key: LOOKUP_KEY,
  });
  return price.id;
}
