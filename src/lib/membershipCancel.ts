// Membership cancellations → Merr's Discord (owner, 2026-09-30), for both
// merrbakes.com memberships and Ko-fi's: Ko-fi's own webhook only sends
// payments, but Ko-fi runs its memberships as subscriptions on Merr's Stripe
// account (lib/siteMarker), so this endpoint hears their cancellations too.
// Notify-only — nothing here records, pauses or changes a subscription.
//
// Needs customer.subscription.updated + customer.subscription.deleted enabled
// on the Stripe webhook endpoint.

import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { isOurSubscription } from '@/lib/siteMarker';
import { notifyMembershipChange, type MembershipNotice } from '@/lib/discordNotify';

type Phase = MembershipNotice['phase'];

const isScheduled = (s: { cancel_at_period_end?: boolean | null; cancel_at?: number | null }) =>
  !!s.cancel_at_period_end || !!s.cancel_at;

// Which step (if any) this event is. `updated` also fires for every pause
// (lib/chargeSkips), renewal and card change, so it only counts when the
// cancel fields themselves changed. Stripe marks a scheduled cancellation
// either way — cancel_at_period_end, or a cancel_at date — depending on how
// and where it was cancelled.
export function cancellationPhase(
  eventType: string,
  sub: Stripe.Subscription,
  previous?: Partial<Stripe.Subscription> | null
): Phase | null {
  if (eventType === 'customer.subscription.deleted') {
    // an abandoned signup that never paid isn't a member leaving
    return sub.status === 'incomplete_expired' ? null : 'ended';
  }
  if (eventType !== 'customer.subscription.updated' || !previous) return null;
  if (!('cancel_at_period_end' in previous) && !('cancel_at' in previous)) return null;
  const was = isScheduled({ ...sub, ...previous });
  const now = isScheduled(sub);
  if (now && !was) return 'scheduled';
  if (!now && was) return 'undone';
  return null;
}

const REASONS: Record<string, string> = {
  cancellation_requested: 'cancelled by the member or Merr',
  payment_failed: 'renewal payments failed',
  payment_disputed: 'payment disputed',
};

function sourceOf(sub: Stripe.Subscription): MembershipNotice['source'] {
  if (isOurSubscription(sub)) return 'merrbakes.com';
  return sub.application ? 'Ko-fi' : 'Stripe';
}

function periodEnd(sub: Stripe.Subscription): number | undefined {
  const ends = sub.items.data.map((i) => i.current_period_end).filter(Boolean);
  return ends.length ? Math.min(...ends) : undefined;
}

// Returns false only when Stripe itself couldn't be read — the webhook then
// answers 500 so Stripe retries (safe: nothing was sent yet).
export async function notifyIfCancellation(event: Stripe.Event): Promise<boolean> {
  const eventSub = event.data.object as Stripe.Subscription;
  const phase = cancellationPhase(
    event.type,
    eventSub,
    (event.data as { previous_attributes?: Partial<Stripe.Subscription> }).previous_attributes
  );
  if (!phase) return true;

  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(eventSub.id, { expand: ['customer', 'items.data.price.product'] });
  } catch (error) {
    console.log('membership cancel: could not read subscription', (error as Error).message);
    return false;
  }

  const customer = typeof sub.customer === 'object' && !sub.customer.deleted ? sub.customer : null;
  const membership = sub.items.data
    .map((i) => {
      const product = i.price.product;
      return (typeof product === 'object' && !product.deleted ? product.name : '') || i.price.nickname || '';
    })
    .filter(Boolean)
    .join(' + ');
  const details = sub.cancellation_details;
  const reason = [
    details?.reason ? REASONS[details.reason] ?? details.reason : '',
    details?.comment ? `“${details.comment}”` : '',
  ].filter(Boolean).join(' — ');

  await notifyMembershipChange({
    phase,
    source: sourceOf(sub),
    // no name on file (possible for Ko-fi's customers) → the email, so Merr can tell who
    member: customer?.name || customer?.email || '',
    membership,
    date: phase === 'ended' ? sub.ended_at ?? undefined : phase === 'scheduled' ? sub.cancel_at ?? periodEnd(sub) : periodEnd(sub),
    reason: phase === 'undone' ? undefined : reason || undefined,
    subscriptionId: sub.id,
  });
  return true;
}
