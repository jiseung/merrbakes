import { stripe } from '@/lib/stripe';
import { notionHeaders } from '@/lib/notion';

// Order lookup for the /order/[session] receipt page and its download route.
// The Stripe Checkout Session id (long, random, only ever sent to the buyer via
// the success redirect) is the access key: anyone holding it can see that
// order's receipt and download its digital files — same model as Ko-fi's
// post-purchase download page.

export type OrderItem = {
  variantId: string;
  name: string;
  quantity: number;
  digital: boolean;
  hasFile: boolean;
  // memberships only: how often it bills
  membership: 'week' | 'month' | null;
  tip: boolean; // a tip line (src/lib/tips.ts)
};

export type DigitalFile = { url: string; filename: string };

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;

async function notionPage(id: string): Promise<any | null> {
  const res = await fetch(`https://api.notion.com/v1/pages/${id}`, { headers: notionHeaders(), cache: 'no-store' });
  return res.ok ? res.json() : null;
}

// variant row -> its Shop Item row (Type + Digital File live on the Shop Item)
async function shopItemForVariant(variantId: string): Promise<any | null> {
  const variant = await notionPage(variantId);
  const shopItemId = variant?.properties?.['Shop Item']?.relation?.[0]?.id;
  return shopItemId ? notionPage(shopItemId) : null;
}

// Notion-hosted file URLs expire after ~1 hour, so this is always read fresh
// at download time rather than stored anywhere.
function digitalFileOf(shopItem: any): DigitalFile | null {
  const f = shopItem?.properties?.['Digital File']?.files?.[0];
  const url = f?.file?.url ?? f?.external?.url;
  return url ? { url, filename: f.name || 'recipe' } : null;
}

// null = no such session, or not paid
export async function getPaidOrder(sessionId: string): Promise<{ email: string | null; items: OrderItem[] } | null> {
  if (!SESSION_ID.test(sessionId)) return null;
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return null;
  }
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null;

  const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 100, expand: ['data.price.product'] });
  const items = await Promise.all(lineItems.data.map(async (li): Promise<OrderItem> => {
    const product = li.price?.product;
    const productMeta = typeof product === 'object' && product && !product.deleted ? product.metadata : undefined;
    const variantId = productMeta?.notion_page_id ?? '';
    const shopItem = variantId ? await shopItemForVariant(variantId) : null;
    const type = shopItem?.properties?.Type?.select?.name;
    const digital = type === 'Digital';
    return {
      variantId,
      name: li.description ?? 'Item',
      quantity: li.quantity ?? 1,
      digital,
      hasFile: digital && !!digitalFileOf(shopItem),
      membership: type === 'Recurring'
        ? (shopItem?.properties?.['Billing Interval']?.select?.name === 'week' ? 'week' : 'month')
        : null,
      tip: productMeta?.kind === 'tip',
    };
  }));

  return { email: session.customer_details?.email ?? null, items };
}

// the file for one digital item in a paid order — null if the order doesn't
// contain that variant, it isn't digital, or no file has been uploaded yet
export async function getOrderDownload(sessionId: string, variantId: string): Promise<DigitalFile | null> {
  const order = await getPaidOrder(sessionId);
  const item = order?.items.find((i) => i.variantId === variantId && i.digital);
  if (!item) return null;
  return digitalFileOf(await shopItemForVariant(variantId));
}
