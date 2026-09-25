import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { notionHeaders, createOrderLineItems } from '@/lib/notion';
import { alertSummary, sendStreamAlert, streamName, cleanStreamName } from '@/lib/streamAlert';
import { voidIfSkippedFriday } from '@/lib/tweatSkip';

const ORDERS_DB_ID = process.env.NOTION_ORDERS_DB_ID;
const ORDER_LINE_ITEMS_DB_ID = process.env.NOTION_ORDER_LINE_ITEMS_DB_ID;

async function orderAlreadyRecorded(sessionId: string): Promise<boolean> {
  const res = await fetch(`https://api.notion.com/v1/databases/${ORDERS_DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: 'Transaction or Session ID', rich_text: { equals: sessionId } },
    }),
    cache: 'no-store',
  });
  const data = await res.json();
  return (data.results ?? []).length > 0;
}

// name for the on-stream alert, from the checkout's shout-out fields (set by
// /api/checkout and /api/subscribe)
function sessionStreamName(session: Stripe.Checkout.Session): string {
  return streamName({
    anonymous: session.metadata?.stream_anonymous === 'yes',
    // the standalone tip page asks via a Stripe custom field instead of our form
    chosenName: session.metadata?.stream_name || cleanStreamName(customField(session, 'stream_name')),
    fullName: session.customer_details?.name,
  });
}

// a tip added to a cart order or club signup gets its own "donation" alert,
// sent after the order/signup alert (owner, 2026-09-25) — set by /api/checkout
// and /api/subscribe (lib/tips)
async function sendTipAlert(session: Stripe.Checkout.Session): Promise<void> {
  if (!(Number(session.metadata?.tip_cents) > 0)) return;
  await sendStreamAlert({ source: 'merrbakes.com', kind: 'donation', name: sessionStreamName(session), summary: '' });
}

function customField(session: Stripe.Checkout.Session, key: string): string {
  return session.custom_fields?.find((f) => f.key === key)?.text?.value ?? '';
}


function formatShipping(session: Stripe.Checkout.Session): string {
  const shipping = session.collected_information?.shipping_details;
  const addr = shipping?.address ?? session.customer_details?.address;
  if (!addr) return '';
  return [
    shipping?.name ?? session.customer_details?.name,
    addr.line1,
    addr.line2,
    `${addr.city ?? ''}, ${addr.state ?? ''} ${addr.postal_code ?? ''}`.trim(),
    addr.country,
  ].filter(Boolean).join('\n');
}

export async function POST(req: NextRequest) {
  if (!ORDERS_DB_ID) {
    console.log('stripe-webhook: NOTION_ORDERS_DB_ID not set');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.log('stripe-webhook: signature verification failed', (err as Error).message);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  // Friday 6pm Tweat charge just created (still a draft): cancel it if it's the
  // Friday before cookie club week — how a blank "Cookie Club Monday" (the
  // 3rd-Monday default) gets applied, at the moment of the charge
  if (event.type === 'invoice.created') {
    try {
      const voided = await voidIfSkippedFriday(event.data.object as Stripe.Invoice);
      return NextResponse.json({ ok: true, cookieWeekSkip: voided });
    } catch (error) {
      console.log('stripe-webhook invoice.created error:', (error as Error).stack);
      return NextResponse.json({ error: 'internal error' }, { status: 500 });
    }
  }
  // weekly membership charges (Tweat of the Week) — one Orders row per paid box
  if (event.type === 'invoice.paid') {
    return recordSubscriptionInvoice(event.data.object as Stripe.Invoice);
  }
  // a checkout is recorded once its money has actually cleared: at completion
  // for cards, or later (async_payment_succeeded) for delayed methods like a
  // bank payment through Link — so a bank payment that fails is never recorded
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ ignored: true, type: event.type });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'unpaid') {
      return NextResponse.json({ ok: true, waitingForPayment: true });
    }

    // standalone tip (/api/tip): a stream alert like a Ko-fi donation, and no
    // Orders row — tips aren't orders (owner, 2026-09-24). The note stays in
    // Stripe; buyer messages never go on stream.
    if (session.metadata?.tip === 'standalone') {
      await sendStreamAlert({
        source: 'merrbakes.com',
        kind: 'donation',
        name: sessionStreamName(session),
        summary: '',
      });
      return NextResponse.json({ ok: true, tip: true });
    }

    if (await orderAlreadyRecorded(session.id)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
    });

    // membership signup: the first box is paid on the subscription's first
    // invoice, which invoice.paid records like every weekly charge — so no Orders
    // row here (it'd double-count), just save the address on the customer so
    // every future invoice carries it.
    if (session.mode === 'subscription') {
      if (session.customer) {
        // save the collected address on the customer so every weekly invoice
        // carries it (invoice.customer_shipping)
        const shipping = session.collected_information?.shipping_details;
        if (shipping?.address) {
          const a = shipping.address;
          await stripe.customers.update(typeof session.customer === 'string' ? session.customer : session.customer.id, {
            shipping: {
              name: shipping.name,
              address: {
                line1: a.line1 ?? undefined, line2: a.line2 ?? undefined, city: a.city ?? undefined,
                state: a.state ?? undefined, postal_code: a.postal_code ?? undefined, country: a.country ?? undefined,
              },
            },
          });
        }
      }
      // stream alert on signup only — the weekly charges (invoice.paid) don't get one.
      // line 0 is the recurring price, named after the club/level
      await sendStreamAlert({
        source: 'merrbakes.com',
        kind: 'subscription',
        name: sessionStreamName(session),
        summary: lineItems.data[0]?.description ?? '',
      });
      await sendTipAlert(session);
      return NextResponse.json({ ok: true, subscriptionSignup: true });
    }

    // each Stripe Product was created with metadata.notion_page_id pointing back
    // at its Shop Item Variants row (see merrbakes.md, "rebuilt at the variant
    // level") — reading it back here avoids a second name-matching lookup.
    const relationIds = new Set<string>();
    const lineItemsToRecord: { title: string; variantId: string; quantity: number }[] = [];
    // a tip added in the cart rides along in Stripe but isn't part of the order
    // (lib/tips: product metadata kind=tip) — left out of the Notion row
    const orderLines = lineItems.data.filter((li) => {
      const product = li.price?.product;
      return !(typeof product === 'object' && product && !product.deleted && product.metadata?.kind === 'tip');
    });
    const summaryLines = orderLines.map((li) => {
      const product = li.price?.product;
      const notionPageId = typeof product === 'object' && product && !product.deleted ? product.metadata?.notion_page_id : undefined;
      if (notionPageId) {
        relationIds.add(notionPageId);
        lineItemsToRecord.push({ title: li.description ?? 'Item', variantId: notionPageId, quantity: li.quantity ?? 1 });
      }
      return `${li.quantity}x ${li.description}`;
    });

    const isGift = session.metadata?.gift === 'yes';
    const giftAddressFromMerr = session.metadata?.gift_address_from_merr === 'yes';
    const shippingText = isGift && giftAddressFromMerr
      ? `(gift for ${session.metadata?.gift_recipient ?? 'recipient'} — Merr to get the address from the recipient)`
      : formatShipping(session);

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        parent: { database_id: ORDERS_DB_ID },
        properties: {
          Name: { title: [{ text: { content: `${session.customer_details?.name ?? 'Stripe order'} — ${session.id.slice(-8)}` } }] },
          Source: { select: { name: 'merrbakes.com' } },
          'Buyer Name': { rich_text: [{ text: { content: session.customer_details?.name ?? '' } }] },
          'Buyer Email': { rich_text: [{ text: { content: session.customer_details?.email ?? '' } }] },
          'Items Summary': { rich_text: [{ text: { content: summaryLines.join(', ') || '(no items listed)' } }] },
          Items: { relation: Array.from(relationIds).map((id) => ({ id })) },
          'Shipping Address': { rich_text: [{ text: { content: shippingText } }] },
          Gift: { checkbox: isGift },
          'Gift Recipient': { rich_text: [{ text: { content: session.metadata?.gift_recipient ?? '' } }] },
          'Gift Message': { rich_text: [{ text: { content: session.metadata?.gift_message ?? '' } }] },
          Amount: { number: (session.amount_total ?? 0) / 100 },
          'Ordered on': { date: { start: new Date().toISOString() } },
          'Transaction or Session ID': { rich_text: [{ text: { content: session.id } }] },
          'Referred By': { rich_text: [{ text: { content: session.metadata?.referred_by ?? '' } }] },
        },
      }),
    });

    if (!notionRes.ok) {
      const errBody = await notionRes.text();
      console.log('stripe-webhook: Notion page create failed', notionRes.status, errBody);
      return NextResponse.json({ error: 'notion create failed' }, { status: 500 });
    }

    const orderPage = await notionRes.json();
    await createOrderLineItems(ORDER_LINE_ITEMS_DB_ID, orderPage.id, lineItemsToRecord);

    await sendStreamAlert({
      source: 'merrbakes.com',
      kind: 'purchase',
      name: sessionStreamName(session),
      // item — variant names without quantities; the shipping line that
      // name-only gifts add as a line item isn't an item
      summary: alertSummary(orderLines.map((li) => li.description ?? '').filter((d) => !d.startsWith('Shipping'))),
    });
    await sendTipAlert(session);

    return NextResponse.json({ ok: true, unmatchedItems: orderLines.length - relationIds.size });
  } catch (error) {
    const err = error as Error;
    console.log('stripe-webhook error:', err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

function formatCustomerShipping(shipping: Stripe.Invoice.CustomerShipping | null): string {
  const addr = shipping?.address;
  if (!addr) return '';
  return [
    shipping?.name,
    addr.line1,
    addr.line2,
    `${addr.city ?? ''}, ${addr.state ?? ''} ${addr.postal_code ?? ''}`.trim(),
    addr.country,
  ].filter(Boolean).join('\n');
}

// the address collected at signup — used when an invoice has no
// customer_shipping yet (the signup invoice can be paid before
// checkout.session.completed has copied the address onto the customer)
async function signupSession(subscriptionId: string): Promise<Stripe.Checkout.Session | null> {
  const sessions = await stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 1 });
  return sessions.data[0] ?? null;
}

// One Orders row (+ line items, so the packing-list rollups count it) per paid
// membership charge: the signup invoice (first box, paid at checkout) and each
// Friday 6pm charge after it. $0 invoices/lines (e.g. the trial line for the
// weekly price at signup) aren't boxes and are skipped.
async function recordSubscriptionInvoice(invoice: Stripe.Invoice) {
  if (!invoice.parent?.subscription_details || invoice.amount_paid <= 0 || !invoice.id) {
    return NextResponse.json({ ignored: true, reason: 'not a paid membership charge' });
  }
  try {
    if (await orderAlreadyRecorded(invoice.id)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    const lines = await stripe.invoices.listLineItems(invoice.id, { limit: 100 });
    const relationIds = new Set<string>();
    const lineItemsToRecord: { title: string; variantId: string; quantity: number }[] = [];
    const summaryLines: string[] = [];
    for (const line of lines.data) {
      if (line.amount <= 0) continue;
      const productId = line.pricing?.price_details?.product;
      const product = productId ? await stripe.products.retrieve(productId) : null;
      if (product?.metadata?.kind === 'tip') continue; // signup tip — not part of the order
      const variantId = product?.metadata?.notion_page_id;
      const title = product?.name ?? line.description ?? 'Membership';
      if (variantId) {
        relationIds.add(variantId);
        lineItemsToRecord.push({ title, variantId, quantity: line.quantity ?? 1 });
      }
      summaryLines.push(`${line.quantity ?? 1}x ${title}`);
    }

    const subscriptionRef = invoice.parent.subscription_details.subscription;
    const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id;
    const isSignupInvoice = invoice.billing_reason === 'subscription_create';
    const session = isSignupInvoice || !invoice.customer_shipping ? await signupSession(subscriptionId) : null;
    const shippingText = formatCustomerShipping(invoice.customer_shipping) || (session ? formatShipping(session) : '');
    const label = isSignupInvoice ? 'first box' : 'renewal';

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        parent: { database_id: ORDERS_DB_ID },
        properties: {
          Name: { title: [{ text: { content: `${invoice.customer_name ?? 'Member'} — ${label} — ${invoice.id.slice(-8)}` } }] },
          Source: { select: { name: 'merrbakes.com' } },
          'Buyer Name': { rich_text: [{ text: { content: invoice.customer_name ?? '' } }] },
          'Buyer Email': { rich_text: [{ text: { content: invoice.customer_email ?? '' } }] },
          'Items Summary': { rich_text: [{ text: { content: summaryLines.join(', ') || '(membership)' } }] },
          Items: { relation: Array.from(relationIds).map((id) => ({ id })) },
          'Shipping Address': { rich_text: [{ text: { content: shippingText } }] },
          Amount: { number: invoice.amount_paid / 100 },
          'Ordered on': { date: { start: new Date().toISOString() } },
          'Transaction or Session ID': { rich_text: [{ text: { content: invoice.id } }] },
        },
      }),
    });
    if (!notionRes.ok) {
      console.log('stripe-webhook: Notion page create failed (invoice)', notionRes.status, await notionRes.text());
      return NextResponse.json({ error: 'notion create failed' }, { status: 500 });
    }
    const orderPage = await notionRes.json();
    await createOrderLineItems(ORDER_LINE_ITEMS_DB_ID, orderPage.id, lineItemsToRecord);
    return NextResponse.json({ ok: true, invoice: invoice.id });
  } catch (error) {
    console.log('stripe-webhook invoice error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
