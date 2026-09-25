import Stripe from 'stripe';

// Merr's Stripe account is shared with Ko-fi: Ko-fi runs all her Ko-fi sales and
// memberships through it (found 2026-09-25 before the live switch — Ko-fi's
// objects carry `application` = Ko-fi's Connect app and Ko-fi metadata). A
// webhook endpoint receives events for the whole account, and the sync lists
// the whole account's subscriptions, so the site must only act on what it
// created itself — never record, alert on, pause or void Ko-fi's.
//
// Ours = tagged with SITE_METADATA (checkout sessions and subscriptions this
// code creates), or — for subscriptions/invoices created before the tag
// existed — carrying our Notion link (notion_variant_id). Anything created by
// another app (Ko-fi) is never ours.
export const SITE_METADATA = { site: 'merrbakes.com' } as const;

const hasApp = (app: unknown) => !!app;

function oursByMetadata(md: Stripe.Metadata | null | undefined): boolean {
  return md?.site === SITE_METADATA.site || !!md?.notion_variant_id;
}

export function isOurSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.site === SITE_METADATA.site;
}

export function isOurSubscription(sub: Stripe.Subscription): boolean {
  return !hasApp(sub.application) && oursByMetadata(sub.metadata);
}

// invoices snapshot their subscription's metadata at creation
export function isOurInvoice(invoice: Stripe.Invoice): boolean {
  if (hasApp((invoice as { application?: unknown }).application)) return false;
  return oursByMetadata(invoice.parent?.subscription_details?.metadata);
}
