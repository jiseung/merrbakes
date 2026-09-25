import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { chicagoDay } from '@/lib/billing';
import { chargeCalendar, isSkippedCharge } from '@/lib/chargeCalendar';

// Skipping recurring charges on the days lib/chargeCalendar says don't charge
// (cookie club week for Tweat; Merr's breaks for every membership). Pauses,
// never cancels — memberships stay active and pick back up after. Two parts:
// - applyChargeSkips (sync: cron + /admin/sync): for a skip Merr SET in Notion
//   (a Cookie Club Monday or a Break), pauses each affected subscription ahead
//   of time with pause_collection 'void' — Stripe creates that day's invoice but
//   voids it (no charge, no invoice.paid, so no Orders row / box) and resumes an
//   hour later. Tagged in subscription metadata so it can be undone: if Merr
//   changes or removes the date, the next sync lifts the pause ("sync now" on
//   /admin/sync does it immediately). Pauses added by hand in Stripe are never
//   touched. Idempotent.
// - voidIfSkippedCharge (webhook invoice.created, at the moment of the charge):
//   re-checks Notion then and voids the new draft invoice if the day is skipped
//   — the only thing that applies a DEFAULT (blank Cookie Club Monday) skip,
//   and a backstop for set ones.
// short on purpose: while paused, Stripe's portal hides "Update subscription"
// (no switching club/level), and the charge-time check covers every skip anyway
const LOOKAHEAD_MS = 2 * 24 * 60 * 60 * 1000;
const TAG = 'charge_skip';

type Interval = 'week' | 'month';

function intervalOf(sub: Stripe.Subscription): Interval | null {
  const intervals = sub.items.data.map((i) => i.price.recurring?.interval);
  return intervals.includes('week') ? 'week' : intervals.includes('month') ? 'month' : null;
}

async function membershipSubscriptions(): Promise<Stripe.Subscription[]> {
  const subs: Stripe.Subscription[] = [];
  for (const status of ['active', 'trialing'] as const) {
    for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
      if (intervalOf(sub)) subs.push(sub);
    }
  }
  return subs;
}

// when the subscription next charges: trial end while trialing, else period end
function nextCharge(sub: Stripe.Subscription): number {
  if (sub.status === 'trialing' && sub.trial_end) return sub.trial_end;
  return Math.min(...sub.items.data.map((i) => i.current_period_end));
}

export async function applyChargeSkips(now = new Date()): Promise<string[]> {
  const cal = await chargeCalendar(now);
  const changes: string[] = [];
  for (const sub of await membershipSubscriptions()) {
    const interval = intervalOf(sub)!;
    const tagged = sub.metadata?.[TAG];
    if (tagged && !isSkippedCharge(tagged, interval, cal, false)
        && sub.pause_collection?.resumes_at && sub.pause_collection.resumes_at * 1000 > now.getTime()) {
      await stripe.subscriptions.update(sub.id, { pause_collection: '', metadata: { [TAG]: '' } });
      changes.push(`${sub.id} — skip on ${tagged} lifted (date changed in Notion)`);
      continue;
    }
    const charge = nextCharge(sub);
    const chargeDate = new Date(charge * 1000);
    if (chargeDate.getTime() - now.getTime() > LOOKAHEAD_MS || chargeDate <= now) continue;
    const day = chicagoDay(chargeDate);
    if (!isSkippedCharge(day, interval, cal, false)) continue;
    const resumesAt = charge + 60 * 60;
    if (sub.pause_collection?.behavior === 'void' && sub.pause_collection.resumes_at === resumesAt) continue;
    await stripe.subscriptions.update(sub.id, { pause_collection: { behavior: 'void', resumes_at: resumesAt }, metadata: { [TAG]: day } });
    changes.push(`${sub.id} — no ${interval === 'week' ? 'weekly' : 'monthly'} charge ${day}`);
  }
  return changes;
}

// invoice.created for a membership renewal: void it before Stripe attempts
// payment (~1 hour after creation) if its day is skipped. Draft subscription
// invoices can't be deleted, so: finalize without auto-advancing (no payment
// attempt), then void. Returns true if voided.
export async function voidIfSkippedCharge(invoice: Stripe.Invoice): Promise<boolean> {
  if (invoice.status !== 'draft' || !invoice.id || invoice.billing_reason !== 'subscription_cycle') return false;
  if (!invoice.parent?.subscription_details) return false;
  const lines = await stripe.invoices.listLineItems(invoice.id, { limit: 100 });
  const intervals = await Promise.all(lines.data.map(async (line) => {
    const priceRef = line.pricing?.price_details?.price;
    if (!priceRef) return null;
    const price = typeof priceRef === 'string' ? await stripe.prices.retrieve(priceRef) : priceRef;
    return price.recurring?.interval ?? null;
  }));
  const interval: Interval | null = intervals.includes('week') ? 'week' : intervals.includes('month') ? 'month' : null;
  if (!interval) return false;

  const created = new Date(invoice.created * 1000);
  if (!isSkippedCharge(chicagoDay(created), interval, await chargeCalendar(created), true)) return false;

  // re-read: for a skip Merr set, pause_collection may already have voided it
  if ((await stripe.invoices.retrieve(invoice.id)).status !== 'draft') return false;
  await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: false });
  await stripe.invoices.voidInvoice(invoice.id);
  return true;
}
