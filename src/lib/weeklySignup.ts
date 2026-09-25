import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { firstRecurringCharge, nextBillingTime } from '@/lib/billing';
import { skippedFridays } from '@/lib/chargeCalendar';

// Weekly (Tweat of the Week) signup, step 2 of 2 (owner, 2026-09-25). Step 1 is
// /api/subscribe: a payment-mode Checkout for just the first box that saves the
// card. A subscription-mode Checkout labels the delayed first charge "7 days
// free" (Stripe's wording for a trial, not editable), and Stripe won't delay it
// any other way from Checkout — see merrbakes.md, 2026-09-25. So once that
// payment clears, /api/stripe-webhook calls this to start the weekly
// subscription on the saved card. It still uses trial_end internally to land
// the first charge on the right Friday (lib/chargeSkips relies on that), but
// the buyer never sees Stripe's subscription summary.

// written onto the session by /api/subscribe
export const WEEKLY_SIGNUP = 'weekly';

export function isWeeklySignup(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.membership === WEEKLY_SIGNUP;
}

// Idempotent — Stripe retries webhooks, so the subscription's id is written
// onto the first box's PaymentIntent and a retry finds it there instead of
// creating a second subscription. Returns the subscription id.
export async function startWeeklySubscription(session: Stripe.Checkout.Session): Promise<string> {
  const piRef = session.payment_intent;
  const customerRef = session.customer;
  const price = session.metadata?.weekly_price;
  if (!piRef || !customerRef || !price) throw new Error(`weekly signup ${session.id}: missing payment, customer or price`);
  const customer = typeof customerRef === 'string' ? customerRef : customerRef.id;

  const pi = await stripe.paymentIntents.retrieve(typeof piRef === 'string' ? piRef : piRef.id);
  if (pi.metadata?.subscription) return pi.metadata.subscription;
  const paymentMethod = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id;
  if (!paymentMethod) throw new Error(`weekly signup ${session.id}: no saved card`);

  // the first Friday charge worked out at signup — unless the webhook is
  // running late (a retry) and that's passed, then the next one from now
  const planned = Number(session.metadata?.trial_end);
  const skip = await skippedFridays();
  const trialEnd = planned * 1000 > Date.now() + 60 * 60 * 1000
    ? planned
    : Math.floor(nextBillingTime(new Date(), skip).getTime() / 1000);

  // card on file for the portal ("update card") and every weekly invoice
  await stripe.customers.update(customer, { invoice_settings: { default_payment_method: paymentMethod } });
  const sub = await stripe.subscriptions.create({
    customer,
    items: [{ price }],
    default_payment_method: paymentMethod,
    trial_end: trialEnd,
    metadata: { notion_variant_id: session.metadata?.notion_variant_id ?? '', signup_session: session.id },
  }, { idempotencyKey: `weekly-signup-${session.id}` });
  await stripe.paymentIntents.update(pi.id, { metadata: { subscription: sub.id } });
  return sub.id;
}

// for /api/subscribe: when the weekly price first charges, for a signup now
export async function plannedFirstCharge(now = new Date()): Promise<Date> {
  return firstRecurringCharge(now, await skippedFridays());
}
