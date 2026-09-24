import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { chicagoDay } from '@/lib/billing';
import { skippedFridays } from '@/lib/cookieWeek';

// No Tweat charge on the Friday before cookie club week (owner, 2026-09-24).
// Stripe can't skip one cycle of a subscription, so for any weekly subscription
// whose next charge falls on a skipped Friday this sets pause_collection with
// behavior 'void': Stripe still creates that Friday's invoice but voids it (no
// charge, no invoice.paid, so no Orders row / box), and collection resumes
// automatically an hour later — the next Friday bills as normal. Run from the
// sync (cron + /admin/sync); idempotent.
const LOOKAHEAD_MS = 8 * 24 * 60 * 60 * 1000;

async function weeklySubscriptions(): Promise<Stripe.Subscription[]> {
  const subs: Stripe.Subscription[] = [];
  for (const status of ['active', 'trialing'] as const) {
    for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
      if (sub.items.data.some((i) => i.price.recurring?.interval === 'week')) subs.push(sub);
    }
  }
  return subs;
}

// when the subscription next charges: trial end while trialing, else period end
function nextCharge(sub: Stripe.Subscription): number {
  if (sub.status === 'trialing' && sub.trial_end) return sub.trial_end;
  return Math.min(...sub.items.data.map((i) => i.current_period_end));
}

export async function applyCookieWeekSkips(now = new Date()): Promise<string[]> {
  const skip = await skippedFridays(now);
  const applied: string[] = [];
  for (const sub of await weeklySubscriptions()) {
    const charge = nextCharge(sub);
    const chargeDate = new Date(charge * 1000);
    if (chargeDate.getTime() - now.getTime() > LOOKAHEAD_MS || chargeDate <= now) continue;
    if (!skip.has(chicagoDay(chargeDate))) continue;
    const resumesAt = charge + 60 * 60;
    if (sub.pause_collection?.behavior === 'void' && sub.pause_collection.resumes_at === resumesAt) continue;
    await stripe.subscriptions.update(sub.id, { pause_collection: { behavior: 'void', resumes_at: resumesAt } });
    applied.push(`${sub.id} — no charge ${chicagoDay(chargeDate)} (cookie club week)`);
  }
  return applied;
}
