import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { chicagoDay } from '@/lib/billing';
import { setSkippedFridays, skippedFridays } from '@/lib/cookieWeek';

// No Tweat charge on the Friday before cookie club week (owner, 2026-09-24).
// Two parts:
// - applyCookieWeekSkips (sync: cron + /admin/sync): for a Friday Merr SET in
//   Notion, pauses each weekly subscription ahead of time with pause_collection
//   'void' — Stripe creates that Friday's invoice but voids it (no charge, no
//   invoice.paid, so no Orders row / box) and resumes an hour later. Idempotent.
// - voidIfSkippedFriday (webhook invoice.created, at the Friday 6pm charge):
//   checks Notion at that moment and voids the new invoice if the day is a
//   skipped Friday — this is the only thing that applies a DEFAULT (blank field)
//   skip (owner, 2026-09-25), and a backstop for set ones.
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

// Also the "undo": a pause this job added (tagged in subscription metadata) is
// lifted if that Friday is no longer one Merr set — she changed or cleared the
// date in Notion. So changing the date + "sync now" on /admin/sync is how she
// stops a skip; pauses added by hand in Stripe are never touched.
const TAG = 'cookie_week_skip';

export async function applyCookieWeekSkips(now = new Date()): Promise<string[]> {
  const skip = await setSkippedFridays(now);
  const changes: string[] = [];
  for (const sub of await weeklySubscriptions()) {
    const tagged = sub.metadata?.[TAG];
    if (tagged && !skip.has(tagged) && sub.pause_collection?.resumes_at && sub.pause_collection.resumes_at * 1000 > now.getTime()) {
      await stripe.subscriptions.update(sub.id, { pause_collection: '', metadata: { [TAG]: '' } });
      changes.push(`${sub.id} — skip on ${tagged} lifted (date changed in Notion)`);
      continue;
    }
    const charge = nextCharge(sub);
    const chargeDate = new Date(charge * 1000);
    if (chargeDate.getTime() - now.getTime() > LOOKAHEAD_MS || chargeDate <= now) continue;
    const day = chicagoDay(chargeDate);
    if (!skip.has(day)) continue;
    const resumesAt = charge + 60 * 60;
    if (sub.pause_collection?.behavior === 'void' && sub.pause_collection.resumes_at === resumesAt) continue;
    await stripe.subscriptions.update(sub.id, { pause_collection: { behavior: 'void', resumes_at: resumesAt }, metadata: { [TAG]: day } });
    changes.push(`${sub.id} — no charge ${day} (cookie club week)`);
  }
  return changes;
}

// invoice.created for a weekly membership charge: void it before Stripe
// attempts payment (~1 hour after creation) if it falls on a skipped Friday.
// Draft subscription invoices can't be deleted, so: finalize without
// auto-advancing (no payment attempt), then void. Returns true if voided.
export async function voidIfSkippedFriday(invoice: Stripe.Invoice): Promise<boolean> {
  if (invoice.status !== 'draft' || !invoice.id || invoice.billing_reason !== 'subscription_cycle') return false;
  if (!invoice.parent?.subscription_details) return false;
  const lines = await stripe.invoices.listLineItems(invoice.id, { limit: 100 });
  const weekly = await Promise.all(lines.data.map(async (line) => {
    const priceRef = line.pricing?.price_details?.price;
    if (!priceRef) return false;
    const price = typeof priceRef === 'string' ? await stripe.prices.retrieve(priceRef) : priceRef;
    return price.recurring?.interval === 'week';
  }));
  if (!weekly.some(Boolean)) return false;

  const chargeDay = chicagoDay(new Date(invoice.created * 1000));
  if (!(await skippedFridays(new Date(invoice.created * 1000))).has(chargeDay)) return false;

  // re-read: on a Friday Merr set, pause_collection may already have voided it
  if ((await stripe.invoices.retrieve(invoice.id)).status !== 'draft') return false;
  await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: false });
  await stripe.invoices.voidInvoice(invoice.id);
  return true;
}
