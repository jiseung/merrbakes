export const NOTION_VERSION = '2022-06-28';
export const SHOP_ITEMS_DB_ID = '3cb75009-8304-808e-bb4a-cc8156af562e';
export const VARIANTS_DB_ID = '3cb75009-8304-80f4-b28b-f9ee459e06f2';
export const MONTHLY_MENUS_DB_ID = '3cc75009-8304-805f-a26b-f57ae34148c8';
export const STREAM_CALENDAR_DB_ID = '3cd75009-8304-80e8-8cd2-c6b92b340119';
export const FULFILLMENT_DB_ID = '3cf75009-8304-80b5-baab-f76317b77432';
export const CONTACT_QUERIES_DB_ID = '3d075009-8304-80c4-adfb-c6a06d4e9827';

export function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

// One row per purchased line (not per order) so a variant's "units ordered" can be
// a real rollup sum, not just a count of orders that happened to include it. Orders
// keeps its existing one-row-per-buyer shape untouched — this is an additive table
// alongside it. No-ops if NOTION_ORDER_LINE_ITEMS_DB_ID isn't set yet (Line Items db
// not created) or there's nothing resolved to write.
export async function createOrderLineItems(
  lineItemsDbId: string | undefined,
  orderId: string,
  lines: { title: string; variantId: string; quantity: number }[]
): Promise<void> {
  if (!lineItemsDbId || lines.length === 0) return;
  await Promise.all(
    lines.map(async (line) => {
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders(),
        body: JSON.stringify({
          parent: { database_id: lineItemsDbId },
          properties: {
            Name: { title: [{ text: { content: line.title } }] },
            Quantity: { number: line.quantity },
            'Item Variant': { relation: [{ id: line.variantId }] },
            Order: { relation: [{ id: orderId }] },
          },
        }),
      });
      if (!res.ok) {
        console.log('createOrderLineItems: failed for variant', line.variantId, await res.text());
      }
    })
  );
}

// Looks up a Shop Item Variants row directly by its Notion page ID (the cart's
// line-item identity) and returns its Stripe Price ID — a single GET, no
// scanning/matching needed since the checkout request already carries the
// exact variant ID the cart added.
export async function fetchStripePriceIdByVariantId(
  variantId: string
): Promise<{ stripePriceId: string } | null> {
  const res = await fetch(`https://api.notion.com/v1/pages/${variantId}`, {
    headers: notionHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const page = await res.json();
  const stripePriceId = page.properties?.['Stripe Price ID']?.rich_text?.map((t: any) => t.plain_text).join('') ?? '';
  return stripePriceId ? { stripePriceId } : null;
}

function parseDollarAmount(richText: { plain_text: string }[] | undefined): number {
  const text = richText?.map((t) => t.plain_text).join('') ?? '';
  const n = parseFloat(text.replace('$', ''));
  return Number.isFinite(n) ? n : 0;
}

// Same lookup as fetchStripePriceIdByVariantId, but also resolves the variant's
// parent Shop Item to get shipping-relevant fields, plus the Notion price/names
// checkout needs to verify (or create) the Stripe Price before charging it. An
// empty stripePriceId is returned as-is rather than treated as unavailable —
// checkout syncs it first (see /api/checkout). Two sequential GETs (variant,
// then its Shop Item relation) since there's no joined endpoint - callers running
// this per cart line should do so in parallel across lines.
export async function fetchVariantForCheckout(variantId: string): Promise<{
  id: string;
  name: string;
  price: string;
  shopItemName: string;
  stripePriceId: string;
  shopItemType: string;
  shippingUS: number;
  additionalItemShippingUS: number;
} | null> {
  const variantRes = await fetch(`https://api.notion.com/v1/pages/${variantId}`, {
    headers: notionHeaders(),
    cache: 'no-store',
  });
  if (!variantRes.ok) return null;
  const variantPage = await variantRes.json();
  const stripePriceId =
    variantPage.properties?.['Stripe Price ID']?.rich_text?.map((t: any) => t.plain_text).join('') ?? '';

  const shopItemId = variantPage.properties?.['Shop Item']?.relation?.[0]?.id;
  if (!shopItemId) return null;

  const shopItemRes = await fetch(`https://api.notion.com/v1/pages/${shopItemId}`, {
    headers: notionHeaders(),
    cache: 'no-store',
  });
  if (!shopItemRes.ok) return null;
  const shopItemPage = await shopItemRes.json();

  return {
    id: variantPage.id,
    name: variantPage.properties?.['Variant Name']?.title?.map((t: any) => t.plain_text).join('') ?? '',
    price: variantPage.properties?.Price?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
    shopItemName: shopItemPage.properties?.Name?.title?.map((t: any) => t.plain_text).join('') ?? '',
    stripePriceId,
    shopItemType: shopItemPage.properties?.Type?.select?.name ?? '',
    shippingUS: parseDollarAmount(shopItemPage.properties?.['Shipping (US)']?.rich_text),
    additionalItemShippingUS: parseDollarAmount(shopItemPage.properties?.['Additional Item Shipping (US)']?.rich_text),
  };
}
