import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { notionHeaders, createOrderLineItems } from '@/lib/notion';

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

  // only preorder payments feed the packing list right now — subscription
  // lifecycle events (customer.subscription.*, invoice.paid) will need their
  // own handling once the weekly-subscription product exists.
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ ignored: true, type: event.type });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;

    if (await orderAlreadyRecorded(session.id)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
    });

    // each Stripe Product was created with metadata.notion_page_id pointing back
    // at its Shop Item Variants row (see merrbakes.md, "rebuilt at the variant
    // level") — reading it back here avoids a second name-matching lookup.
    const relationIds = new Set<string>();
    const lineItemsToRecord: { title: string; variantId: string; quantity: number }[] = [];
    const summaryLines = lineItems.data.map((li) => {
      const product = li.price?.product;
      const notionPageId = typeof product === 'object' && product && !product.deleted ? product.metadata?.notion_page_id : undefined;
      if (notionPageId) {
        relationIds.add(notionPageId);
        lineItemsToRecord.push({ title: li.description ?? 'Item', variantId: notionPageId, quantity: li.quantity ?? 1 });
      }
      return `${li.quantity}x ${li.description}`;
    });

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
          'Shipping Address': { rich_text: [{ text: { content: formatShipping(session) } }] },
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

    return NextResponse.json({ ok: true, unmatchedItems: lineItems.data.length - relationIds.size });
  } catch (error) {
    const err = error as Error;
    console.log('stripe-webhook error:', err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
