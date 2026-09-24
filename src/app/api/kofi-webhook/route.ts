import { NextRequest, NextResponse } from 'next/server';
import { KofiAPIResponseType, KofiWebhookPayloadType } from '../types';
import { SHOP_ITEMS_DB_ID, VARIANTS_DB_ID, notionHeaders, createOrderLineItems } from '@/lib/notion';
import { kofiStreamName, sendStreamAlert } from '@/lib/streamAlert';

const ORDERS_DB_ID = process.env.NOTION_ORDERS_DB_ID;
const ORDER_LINE_ITEMS_DB_ID = process.env.NOTION_ORDER_LINE_ITEMS_DB_ID;

// Resolves Ko-fi's opaque `direct_link_code` (item alias) to a display name,
// the same way /api/kofi/route.ts strips "(pre-order)" off the raw item name.
async function resolveItemNames(): Promise<Map<string, string>> {
  const res = await fetch('https://ko-fi.com/shop/T6T4XU0H6/items/0/50?productType=0');
  const data: KofiAPIResponseType[] = await res.json();
  const map = new Map<string, string>();
  data.forEach((item) => {
    const preorderIndex = item.Name.toLowerCase().indexOf('(pre-order)');
    const name = preorderIndex > -1 ? item.Name.substring(0, preorderIndex).trim() : item.Name;
    map.set(item.Alias, name);
  });
  return map;
}

// Shop Items rows, keyed by lowercased name, for resolving which item a Ko-fi
// line item is (before picking a specific variant of it — see below).
async function fetchShopItemIdsByName(): Promise<Map<string, string>> {
  const res = await fetch(`https://api.notion.com/v1/databases/${SHOP_ITEMS_DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({}),
    cache: 'no-store',
  });
  const data = await res.json();
  const map = new Map<string, string>();
  (data.results ?? []).forEach((page: any) => {
    const name = page.properties?.Name?.title?.map((t: any) => t.plain_text).join('') ?? '';
    if (name) map.set(name.toLowerCase(), page.id);
  });
  return map;
}

type VariantInfo = { id: string; name: string; isDefault: boolean };

// Shop Item Variants rows, grouped by their parent Shop Item's page ID — the
// Orders `Items` relation points at variants, not items, so a Ko-fi line item
// has to resolve down to a specific variant, not just its parent item.
async function fetchVariantsByShopItemId(): Promise<Map<string, VariantInfo[]>> {
  const res = await fetch(`https://api.notion.com/v1/databases/${VARIANTS_DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({}),
    cache: 'no-store',
  });
  const data = await res.json();
  const map = new Map<string, VariantInfo[]>();
  (data.results ?? []).forEach((page: any) => {
    const shopItemId = page.properties?.['Shop Item']?.relation?.[0]?.id;
    if (!shopItemId) return;
    const name = page.properties?.['Variant Name']?.title?.map((t: any) => t.plain_text).join('') ?? '';
    const isDefault = page.properties?.Default?.checkbox ?? false;
    const list = map.get(shopItemId) ?? [];
    list.push({ id: page.id, name, isDefault });
    map.set(shopItemId, list);
  });
  return map;
}

// Picks the variant matching Ko-fi's variation_name (case-insensitive,
// matched either direction since naming conventions may not align exactly),
// falling back to the item's Default variant if no variation was given or
// nothing matched. Untested against a real Ko-fi order — variation_name's
// real-world format/values aren't confirmed yet.
function pickVariant(variants: VariantInfo[], variationName: string | undefined): VariantInfo | null {
  if (!variants.length) return null;
  if (variationName) {
    const needle = variationName.toLowerCase();
    const match = variants.find((v) => v.name.toLowerCase().includes(needle) || needle.includes(v.name.toLowerCase()));
    if (match) return match;
  }
  return variants.find((v) => v.isDefault) ?? variants[0];
}

// Tasting Club is one Cookie Club box + one Confectioner's Club box, not its own
// product — so a Tasting payment resolves to *two* Shop Items, each getting its
// own Order Line Item. A separate "Tasting Club" Shop Item still exists in Notion
// (for its own record-keeping) but never gets a line item itself.
// Keyed by keyword, not the item's exact display name — Notion's real "Confectioner's
// Club" title uses a curly apostrophe (’), which would silently fail an exact
// string match against a plain ' typed in source. Matching a plain substring like
// "confection" sidesteps that, and is also more forgiving of tier_name's exact
// wording, which Ko-fi hasn't sent us a real example of yet.
const CLUB_ITEM_KEYWORDS = { cookie: 'cookie club', confectioner: 'confection' } as const;
type ClubKind = keyof typeof CLUB_ITEM_KEYWORDS;

function resolveClubKinds(tierName: string): ClubKind[] {
  const t = tierName.toLowerCase();
  if (t.includes('tasting')) return ['cookie', 'confectioner'];
  const kinds: ClubKind[] = [];
  if (t.includes('cookie')) kinds.push('cookie');
  if (t.includes('confection') || t.includes('chocolat')) kinds.push('confectioner');
  return kinds;
}

function findShopItemIdByKeyword(shopItemIdsByName: Map<string, string>, keyword: string): string | undefined {
  for (const [name, id] of shopItemIdsByName) {
    if (name.includes(keyword)) return id;
  }
  return undefined;
}

// display-only — matching against Notion uses CLUB_ITEM_KEYWORDS above instead,
// specifically to avoid depending on getting this apostrophe right.
const CLUB_ITEM_TITLES: Record<ClubKind, string> = { cookie: 'Cookie Club', confectioner: 'Confectioner’s Club' };

async function orderAlreadyRecorded(transactionId: string): Promise<boolean> {
  const res = await fetch(`https://api.notion.com/v1/databases/${ORDERS_DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: 'Transaction or Session ID', rich_text: { equals: transactionId } },
    }),
    cache: 'no-store',
  });
  const data = await res.json();
  return (data.results ?? []).length > 0;
}

function formatShipping(shipping: KofiWebhookPayloadType['shipping']): string {
  if (!shipping) return '';
  return [
    shipping.full_name,
    shipping.street_address,
    `${shipping.city}, ${shipping.state_or_province} ${shipping.postal_code}`,
    shipping.country,
    shipping.telephone,
  ].filter(Boolean).join('\n');
}

// Shared by both Shop Order and Subscription handling: writes the Orders row
// (the packing-list-by-buyer view) plus one Order Line Item per resolved item
// (the packing-list-by-item view, via the rollup chain on Shop Items/Variants).
async function createOrderRecord(params: {
  name: string;
  buyerName: string;
  buyerEmail: string;
  itemsSummary: string;
  relationIds: string[];
  shippingAddress: string;
  amount: number;
  orderedOn: string;
  transactionId: string;
  message: string;
  lineItems: { title: string; variantId: string; quantity: number }[];
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const notionRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: ORDERS_DB_ID },
      properties: {
        Name: { title: [{ text: { content: params.name } }] },
        Source: { select: { name: 'Ko-fi' } },
        'Buyer Name': { rich_text: [{ text: { content: params.buyerName } }] },
        'Buyer Email': { rich_text: [{ text: { content: params.buyerEmail } }] },
        'Items Summary': { rich_text: [{ text: { content: params.itemsSummary || '(no items listed)' } }] },
        Items: { relation: params.relationIds.map((id) => ({ id })) },
        'Shipping Address': { rich_text: [{ text: { content: params.shippingAddress } }] },
        Amount: { number: params.amount },
        'Ordered on': { date: { start: params.orderedOn } },
        'Transaction or Session ID': { rich_text: [{ text: { content: params.transactionId } }] },
        'Order Message from Buyer': { rich_text: [{ text: { content: params.message } }] },
      },
    }),
  });

  if (!notionRes.ok) {
    const errBody = await notionRes.text();
    return { ok: false, error: errBody };
  }

  const orderPage = await notionRes.json();
  await createOrderLineItems(ORDER_LINE_ITEMS_DB_ID, orderPage.id, params.lineItems);
  return { ok: true, orderId: orderPage.id };
}

export async function POST(req: NextRequest) {
  if (!ORDERS_DB_ID) {
    console.log('kofi-webhook: NOTION_ORDERS_DB_ID not set');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  try {
    const form = await req.formData();
    const raw = form.get('data');
    if (typeof raw !== 'string') {
      return NextResponse.json({ error: 'missing data field' }, { status: 400 });
    }
    const payload: KofiWebhookPayloadType = JSON.parse(raw);

    if (payload.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
      return NextResponse.json({ error: 'invalid verification token' }, { status: 401 });
    }

    // donations/tips aren't fulfillment items — no Orders row, just the stream alert
    if (payload.type === 'Donation') {
      await sendStreamAlert({
        source: 'Ko-fi',
        kind: 'donation',
        name: kofiStreamName(payload.from_name, payload.is_public),
        amount: parseFloat(payload.amount) || 0,
        summary: '',
      });
      return NextResponse.json({ ok: true, donation: true });
    }

    if (await orderAlreadyRecorded(payload.kofi_transaction_id)) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Club membership payments — Cookie Club / Confectioner's Club / Tasting Club
    // (Tasting decomposes into both of the others; see resolveClubItemNames).
    // is_subscription_payment covers both first payment and monthly renewals per
    // Ko-fi's docs, so this fires every month without any extra scheduling.
    if (payload.type === 'Subscription') {
      if (!payload.is_subscription_payment) {
        return NextResponse.json({ ignored: true, reason: 'subscription event without a payment' });
      }

      const [shopItemIdsByName, variantsByShopItemId] = await Promise.all([
        fetchShopItemIdsByName(),
        fetchVariantsByShopItemId(),
      ]);

      const clubKinds = resolveClubKinds(payload.tier_name ?? '');
      const relationIds = new Set<string>();
      const lineItemsToRecord: { title: string; variantId: string; quantity: number }[] = [];
      clubKinds.forEach((kind) => {
        const shopItemId = findShopItemIdByKeyword(shopItemIdsByName, CLUB_ITEM_KEYWORDS[kind]);
        const variant = shopItemId ? pickVariant(variantsByShopItemId.get(shopItemId) ?? [], undefined) : null;
        if (variant) {
          relationIds.add(variant.id);
          lineItemsToRecord.push({ title: CLUB_ITEM_TITLES[kind], variantId: variant.id, quantity: 1 });
        }
      });

      const result = await createOrderRecord({
        name: `${payload.from_name} — ${payload.kofi_transaction_id.slice(0, 8)}`,
        buyerName: payload.from_name,
        buyerEmail: payload.email || '',
        itemsSummary: payload.tier_name ? `${payload.tier_name} (subscription)` : '(subscription)',
        relationIds: Array.from(relationIds),
        shippingAddress: formatShipping(payload.shipping),
        amount: parseFloat(payload.amount) || 0,
        orderedOn: payload.timestamp,
        transactionId: payload.kofi_transaction_id,
        message: payload.message ?? '',
        lineItems: lineItemsToRecord,
      });

      if (!result.ok) {
        console.log('kofi-webhook: Notion page create failed (subscription)', result.error);
        return NextResponse.json({ error: 'notion create failed' }, { status: 500 });
      }
      // stream alert for new members only, not monthly renewals
      if (payload.is_first_subscription_payment) {
        await sendStreamAlert({
          source: 'Ko-fi',
          kind: 'subscription',
          name: kofiStreamName(payload.from_name, payload.is_public),
          amount: parseFloat(payload.amount) || 0,
          summary: payload.tier_name ?? '',
        });
      }
      return NextResponse.json({ ok: true, tier: payload.tier_name, matchedItems: lineItemsToRecord.length });
    }

    // Only shop purchases and club subscriptions feed the packing-list — commissions aren't fulfillment items.
    if (payload.type !== 'Shop Order') {
      return NextResponse.json({ ignored: true, type: payload.type });
    }

    const [itemNamesByAlias, shopItemIdsByName, variantsByShopItemId] = await Promise.all([
      resolveItemNames(),
      fetchShopItemIdsByName(),
      fetchVariantsByShopItemId(),
    ]);

    const items = payload.shop_items ?? [];
    const relationIds = new Set<string>();
    const lineItemsToRecord: { title: string; variantId: string; quantity: number }[] = [];
    const summaryLines = items.map((item) => {
      const name = itemNamesByAlias.get(item.direct_link_code) ?? item.direct_link_code;
      const shopItemId = shopItemIdsByName.get(name.toLowerCase());
      const variant = shopItemId ? pickVariant(variantsByShopItemId.get(shopItemId) ?? [], item.variation_name) : null;
      const variation = item.variation_name ? ` (${item.variation_name})` : '';
      if (variant) {
        relationIds.add(variant.id);
        lineItemsToRecord.push({ title: `${name}${variation}`, variantId: variant.id, quantity: item.quantity });
      }
      return `${item.quantity}x ${name}${variation}`;
    });

    const result = await createOrderRecord({
      name: `${payload.from_name} — ${payload.kofi_transaction_id.slice(0, 8)}`,
      buyerName: payload.from_name,
      buyerEmail: payload.email || '',
      itemsSummary: summaryLines.join(', '),
      relationIds: Array.from(relationIds),
      shippingAddress: formatShipping(payload.shipping),
      amount: parseFloat(payload.amount) || 0,
      orderedOn: payload.timestamp,
      transactionId: payload.kofi_transaction_id,
      message: payload.message ?? '',
      lineItems: lineItemsToRecord,
    });

    if (!result.ok) {
      console.log('kofi-webhook: Notion page create failed', result.error);
      return NextResponse.json({ error: 'notion create failed' }, { status: 500 });
    }

    await sendStreamAlert({
      source: 'Ko-fi',
      kind: 'purchase',
      name: kofiStreamName(payload.from_name, payload.is_public),
      amount: parseFloat(payload.amount) || 0,
      summary: summaryLines.join(', '),
    });

    return NextResponse.json({ ok: true, unmatchedItems: items.length - relationIds.size });
  } catch (error) {
    const err = error as Error;
    console.log('kofi-webhook error:', err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
