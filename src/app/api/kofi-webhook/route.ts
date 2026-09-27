import { NextRequest, NextResponse } from 'next/server';
import { KofiWebhookPayloadType } from '../types';
import { SHOP_ITEMS_DB_ID, VARIANTS_DB_ID, notionHeaders, createOrderLineItems, queryAll } from '@/lib/notion';
import { alertSummary, kofiStreamName, sendStreamAlert } from '@/lib/streamAlert';

const ORDERS_DB_ID = process.env.NOTION_ORDERS_DB_ID;
const ORDER_LINE_ITEMS_DB_ID = process.env.NOTION_ORDER_LINE_ITEMS_DB_ID;

const normalizeTitle = (s: string) => s.replace(/[’‘]/g, "'").trim().toLowerCase();

// A Ko-fi Shop Order only names items by `direct_link_code` (the end of the
// item's ko-fi.com/s/<code> link), never by title. Shop Items' "Ko-fi Code"
// maps codes to items: entries separated by commas or new lines, each either
// `code` or `code = Color` for merch where every colour is its own Ko-fi
// listing (the Color must match the variants' Color select).
type KofiCode = { code: string; color: string | null };
type ShopItemInfo = { id: string; name: string; kofiCodes: KofiCode[] };

function parseKofiCodes(text: string): KofiCode[] {
  return text
    .split(/[,\n]+/)
    .map((entry) => {
      const [rawCode, ...rest] = entry.split('=');
      const code = rawCode.trim().replace(/^https?:\/\/(www\.)?ko-fi\.com\/s\//i, '').replace(/\/+$/, '').toLowerCase();
      const color = rest.join('=').trim();
      return { code, color: color || null };
    })
    .filter((c) => c.code);
}

async function fetchShopItems(): Promise<ShopItemInfo[]> {
  const pages = await queryAll(SHOP_ITEMS_DB_ID);
  return pages
    .map((page: any) => ({
      id: page.id,
      name: page.properties?.Name?.title?.map((t: any) => t.plain_text).join('') ?? '',
      kofiCodes: parseKofiCodes(page.properties?.['Ko-fi Code']?.rich_text?.map((t: any) => t.plain_text).join('') ?? ''),
    }))
    .filter((item) => item.name);
}

type VariantInfo = { id: string; shopItemId: string; name: string; color: string | null; size: string | null; isDefault: boolean };

// Shop Item Variants rows — the Orders `Items` relation points at variants, not
// items, so a Ko-fi line item has to resolve down to a specific variant.
async function fetchVariants(): Promise<VariantInfo[]> {
  const pages = await queryAll(VARIANTS_DB_ID);
  return pages
    .map((page: any) => ({
      id: page.id,
      shopItemId: page.properties?.['Shop Item']?.relation?.[0]?.id ?? '',
      name: page.properties?.['Variant Name']?.title?.map((t: any) => t.plain_text).join('') ?? '',
      color: page.properties?.Color?.select?.name ?? null,
      size: page.properties?.Size?.select?.name ?? null,
      isDefault: page.properties?.Default?.checkbox ?? false,
    }))
    .filter((v) => v.shopItemId);
}

// Picks the variant matching Ko-fi's variation_name: an exact match on the
// variant name, its Size, or the part after "Color — ", then a substring match
// if only one variant has it. No variation → the Default variant. A variation
// that matches nothing (or several) returns null rather than guessing, so a
// wrong variant never lands in the Fulfillment counts; the order is still
// recorded, just unmatched.
function pickVariant(variants: VariantInfo[], variationName: string | undefined): VariantInfo | null {
  if (!variants.length) return null;
  if (!variationName) return variants.find((v) => v.isDefault) ?? variants[0];
  const needle = normalizeTitle(variationName);
  const exact = variants.filter((v) => {
    const name = normalizeTitle(v.name);
    return name === needle || normalizeTitle(v.size ?? '') === needle || name.endsWith(` — ${needle}`);
  });
  if (exact.length === 1) return exact[0];
  const loose = variants.filter((v) => normalizeTitle(v.name).includes(needle) || needle.includes(normalizeTitle(v.name)));
  if (loose.length === 1) return loose[0];
  return variants.length === 1 ? variants[0] : null;
}

// Ko-fi code → item (and colour) → variant. Without a code in Notion, falls
// back to a variation_name that exactly names one variant across the whole shop.
function resolveKofiItem(
  item: { direct_link_code: string; variation_name: string },
  shopItems: ShopItemInfo[],
  variants: VariantInfo[]
): { name: string; variant: VariantInfo | null } {
  const code = item.direct_link_code.trim().toLowerCase();
  for (const shopItem of shopItems) {
    const entry = shopItem.kofiCodes.find((c) => c.code === code);
    if (!entry) continue;
    const candidates = variants.filter(
      (v) => v.shopItemId === shopItem.id && (!entry.color || normalizeTitle(v.color ?? '') === normalizeTitle(entry.color))
    );
    return { name: entry.color ? `${shopItem.name} (${entry.color})` : shopItem.name, variant: pickVariant(candidates, item.variation_name) };
  }
  if (item.variation_name) {
    const needle = normalizeTitle(item.variation_name);
    const matches = variants.filter((v) => normalizeTitle(v.name) === needle);
    if (matches.length === 1) {
      const shopItem = shopItems.find((s) => s.id === matches[0].shopItemId);
      if (shopItem) return { name: shopItem.name, variant: matches[0] };
    }
  }
  return { name: `Ko-fi item ${item.direct_link_code}`, variant: null };
}

// Tasting Club is one Cookie Club box + one Confectioner's Club box, not its own
// product — so a Tasting payment resolves to *two* Shop Items, each getting its
// own Order Line Item. A separate "Tasting Club" Shop Item still exists in Notion
// (for its own record-keeping) but never gets a line item itself.
// The Shop Item is matched by its exact title, not a substring: "cookie club" is
// also inside "Cookie Club Member T-shirt", which is how a Tasting payment once
// landed on the T-shirt. Apostrophes are normalized because Notion's real
// "Confectioner’s Club" title uses a curly one.
const CLUB_ITEM_TITLES = { cookie: 'Cookie Club', confectioner: 'Confectioner’s Club' } as const;
type ClubKind = keyof typeof CLUB_ITEM_TITLES;

function resolveClubKinds(tierName: string): ClubKind[] {
  const t = tierName.toLowerCase();
  if (t.includes('tasting')) return ['cookie', 'confectioner'];
  const kinds: ClubKind[] = [];
  if (t.includes('cookie')) kinds.push('cookie');
  if (t.includes('confection') || t.includes('chocolat')) kinds.push('confectioner');
  return kinds;
}

function findClubShopItemId(shopItems: ShopItemInfo[], kind: ClubKind): string | undefined {
  const wanted = normalizeTitle(CLUB_ITEM_TITLES[kind]);
  return shopItems.find((item) => normalizeTitle(item.name) === wanted)?.id;
}

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

      const [shopItems, variants] = await Promise.all([fetchShopItems(), fetchVariants()]);

      const clubKinds = resolveClubKinds(payload.tier_name ?? '');
      const relationIds = new Set<string>();
      const lineItemsToRecord: { title: string; variantId: string; quantity: number }[] = [];
      clubKinds.forEach((kind) => {
        const shopItemId = findClubShopItemId(shopItems, kind);
        const variant = shopItemId ? pickVariant(variants.filter((v) => v.shopItemId === shopItemId), undefined) : null;
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
          summary: payload.tier_name ?? '',
        });
      }
      return NextResponse.json({ ok: true, tier: payload.tier_name, matchedItems: lineItemsToRecord.length });
    }

    // Only shop purchases and club subscriptions feed the packing-list — commissions aren't fulfillment items.
    if (payload.type !== 'Shop Order') {
      return NextResponse.json({ ignored: true, type: payload.type });
    }

    const [shopItems, variants] = await Promise.all([fetchShopItems(), fetchVariants()]);

    const items = payload.shop_items ?? [];
    const relationIds = new Set<string>();
    const lineItemsToRecord: { title: string; variantId: string; quantity: number }[] = [];
    const alertItemNames: string[] = [];
    const summaryLines = items.map((item) => {
      const { name, variant } = resolveKofiItem(item, shopItems, variants);
      const variation = item.variation_name ? ` (${item.variation_name})` : '';
      if (variant) {
        relationIds.add(variant.id);
        lineItemsToRecord.push({ title: `${name}${variation}`, variantId: variant.id, quantity: item.quantity });
        alertItemNames.push(item.variation_name ? `${name} — ${item.variation_name}` : name);
      } else {
        // keep raw Ko-fi codes off the stream
        alertItemNames.push('something from the shop');
      }
      return `${item.quantity}x ${name}${variation}${variant ? '' : ' (not matched)'}`;
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
      summary: alertSummary(alertItemNames),
    });

    return NextResponse.json({ ok: true, unmatchedItems: items.length - lineItemsToRecord.length });
  } catch (error) {
    const err = error as Error;
    console.log('kofi-webhook error:', err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
