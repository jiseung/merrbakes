import Stripe from 'stripe';
import { SHOP_ITEMS_DB_ID, VARIANTS_DB_ID, FULFILLMENT_DB_ID, notionHeaders } from '@/lib/notion';
import { stripe } from '@/lib/stripe';
import { priceToCents, variantDisplayName, displayName } from '@/lib/shopItems';
import { applyChargeSkips } from '@/lib/chargeSkips';

// Keeps Shop Items / Shop Item Variants / Fulfillment / Stripe in sync with each
// other, since none of these update automatically as new rows get added by hand
// (or by the webhooks) — see merrbakes.md for the full checklist this covers.
// Shared by /api/notion-reconcile (cron, bearer secret), /api/admin/sync (Merr's
// "sync now" page, password) and /api/checkout (per-variant price check).

export type ReconcileReport = {
  fulfillmentRowsCreated: string[];
  variantsCreated: string[];
  defaultsFixed: string[];
  stripePricesCreated: { variant: string; priceId: string; reason: string }[];
  stripePricesUpdated: { variant: string; oldPriceId: string; newPriceId: string; oldCents: number | null; newCents: number; reason: string }[];
  flagged: string[];
  errors: string[];
  // membership charges paused/unpaused for cookie club week or a break (src/lib/chargeSkips.ts)
  chargesSkipped: string[];
};

export type ShopItemRow = {
  id: string;
  name: string;
  price: string;
  type: string;
  // Recurring items only: how often Stripe bills (Notion "Billing Interval")
  interval: 'week' | 'month' | null;
};

export type VariantRow = {
  id: string;
  shopItemId: string;
  name: string;
  price: string;
  isDefault: boolean;
  variantType: string | null;
  quantityMultiplier: number | null;
  stripePriceId: string;
};

async function queryAll(databaseId: string): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify(cursor ? { start_cursor: cursor } : {}),
      cache: 'no-store',
    });
    const data = await res.json();
    results.push(...(data.results ?? []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function fetchShopItems(): Promise<ShopItemRow[]> {
  const pages = await queryAll(SHOP_ITEMS_DB_ID);
  return pages.map((page) => ({
    id: page.id,
    name: page.properties?.Name?.title?.map((t: any) => t.plain_text).join('') ?? '',
    price: page.properties?.Price?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
    type: page.properties?.Type?.select?.name ?? '',
    interval: page.properties?.Type?.select?.name === 'Recurring'
      ? (page.properties?.['Billing Interval']?.select?.name === 'week' ? 'week' : 'month')
      : null,
  }));
}

async function fetchVariants(): Promise<VariantRow[]> {
  const pages = await queryAll(VARIANTS_DB_ID);
  return pages
    .map((page) => {
      const shopItemId = page.properties?.['Shop Item']?.relation?.[0]?.id;
      if (!shopItemId) return null;
      return {
        id: page.id,
        shopItemId,
        name: page.properties?.['Variant Name']?.title?.map((t: any) => t.plain_text).join('') ?? '',
        price: page.properties?.Price?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
        isDefault: page.properties?.Default?.checkbox ?? false,
        variantType: page.properties?.['Variant Type']?.select?.name ?? null,
        quantityMultiplier: page.properties?.['Quantity multiplier']?.number ?? null,
        stripePriceId: page.properties?.['Stripe Price ID']?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
      };
    })
    .filter((v): v is VariantRow => v !== null);
}

async function fetchFulfillmentShopItemIds(): Promise<Set<string>> {
  const pages = await queryAll(FULFILLMENT_DB_ID);
  const ids = new Set<string>();
  pages.forEach((page) => {
    const id = page.properties?.['Shop Item']?.relation?.[0]?.id;
    if (id) ids.add(id);
  });
  return ids;
}

async function createStandardVariant(shopItem: ShopItemRow): Promise<VariantRow> {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: VARIANTS_DB_ID },
      properties: {
        'Variant Name': { title: [{ text: { content: 'Standard' } }] },
        'Shop Item': { relation: [{ id: shopItem.id }] },
        Price: { rich_text: [{ text: { content: shopItem.price } }] },
        'Variant Type': { select: { name: 'flavor' } },
        Default: { checkbox: true },
      },
    }),
  });
  const page = await res.json();
  return {
    id: page.id, shopItemId: shopItem.id, name: 'Standard', price: shopItem.price,
    isDefault: true, variantType: 'flavor', quantityMultiplier: null, stripePriceId: '',
  };
}

async function createFulfillmentRow(shopItem: ShopItemRow): Promise<void> {
  await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: FULFILLMENT_DB_ID },
      properties: {
        Name: { title: [{ text: { content: shopItem.name } }] },
        'Shop Item': { relation: [{ id: shopItem.id }] },
      },
    }),
  });
}

async function setVariantDefault(variantId: string): Promise<void> {
  await fetch(`https://api.notion.com/v1/pages/${variantId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({ properties: { Default: { checkbox: true } } }),
  });
}

async function setVariantStripePriceId(variantId: string, stripePriceId: string): Promise<void> {
  await fetch(`https://api.notion.com/v1/pages/${variantId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({ properties: { 'Stripe Price ID': { rich_text: [{ text: { content: stripePriceId } }] } } }),
  });
}

// Makes the variant's Stripe Price match Notion. The stored "Stripe Price ID" is
// checked against Notion every time (owner, 2026-09-25); it's replaced when:
// - it doesn't exist in this Stripe mode — e.g. switching to a live key, when
//   Notion still holds test-mode ids — or there isn't one yet
// - it's inactive, not USD, the wrong amount, or the wrong billing (one-time vs
//   recurring, week vs month) for Notion's Price / Type / Billing Interval
// - its Product is missing/archived or belongs to a different variant
//   (metadata.notion_page_id), e.g. an id copied from another row
// Stripe Prices are immutable, so replacing means: a new Price (on the same
// Product if that Product is fine, else on a new one), set as the Product's
// default, the old Price deactivated if it was this variant's own, and the new
// id written back to Notion. Completed orders/subscriptions are unaffected. The
// Product name is kept in step with the variant's label.
//
// `known` is the variant's current Stripe Price, with its product expanded, if
// the caller already fetched it (runReconcile lists all Prices up front).
// `interval` makes it a recurring (subscription) Price billed every week/month.
export async function syncStripePrice(
  variant: Pick<VariantRow, 'id' | 'price' | 'stripePriceId'>, shopItemName: string, known?: Stripe.Price,
  interval: 'week' | 'month' | null = null
): Promise<
  | { action: 'created'; priceId: string; reason: string }
  | { action: 'updated'; oldPriceId: string; newPriceId: string; oldCents: number | null; newCents: number; reason: string }
  | { action: 'unchanged' }
  | { action: 'error'; error: string }
> {
  const targetCents = priceToCents(variant.price);
  if (targetCents <= 0) {
    return { action: 'error', error: `no valid price to sync (Notion Price = "${variant.price}")` };
  }

  try {
    const current = variant.stripePriceId ? known ?? await retrievePrice(variant.stripePriceId) : null;
    const product = current ? await productOf(current) : null;
    const productOk = !!product && product.active && product.metadata?.notion_page_id === variant.id;

    const problems: string[] = [];
    if (!variant.stripePriceId) problems.push('no Stripe price yet');
    else if (!current) problems.push('stored price not found in this Stripe mode');
    else {
      if (!current.active) problems.push('price inactive');
      if (current.currency !== 'usd') problems.push(`currency ${current.currency}`);
      if (current.unit_amount !== targetCents) problems.push('amount differs from Notion');
      if ((current.recurring?.interval ?? null) !== interval) problems.push('billing differs from Notion');
      if (!product) problems.push('product missing');
      else if (!product.active) problems.push('product archived');
      else if (product.metadata?.notion_page_id !== variant.id) problems.push('product belongs to another variant');
    }

    if (problems.length === 0) {
      if (product!.name !== shopItemName) await stripe.products.update(product!.id, { name: shopItemName });
      return { action: 'unchanged' };
    }

    const productId = productOk
      ? product!.id
      : (await stripe.products.create({ name: shopItemName, metadata: { notion_page_id: variant.id } })).id;
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: targetCents,
      currency: 'usd',
      ...(interval ? { recurring: { interval } } : {}),
    });
    await stripe.products.update(productId, { default_price: newPrice.id, name: shopItemName });
    // only retire the old Price if it was this variant's own — a Price on
    // another variant's Product is still that variant's live price
    if (current?.active && productOk) await stripe.prices.update(current.id, { active: false });
    await setVariantStripePriceId(variant.id, newPrice.id);

    const reason = problems.join('; ');
    return current
      ? { action: 'updated', oldPriceId: current.id, newPriceId: newPrice.id, oldCents: current.unit_amount, newCents: targetCents, reason }
      : { action: 'created', priceId: newPrice.id, reason };
  } catch (error) {
    return { action: 'error', error: (error as Error).message };
  }
}

// null when the id doesn't exist in this Stripe mode/account (resource_missing)
async function retrievePrice(id: string): Promise<Stripe.Price | null> {
  try {
    return await stripe.prices.retrieve(id, { expand: ['product'] });
  } catch (error) {
    if ((error as { code?: string }).code === 'resource_missing') return null;
    throw error;
  }
}

async function productOf(price: Stripe.Price): Promise<Stripe.Product | null> {
  const ref = price.product;
  const product = typeof ref === 'string' ? await stripe.products.retrieve(ref) : ref;
  return product.deleted ? null : (product as Stripe.Product);
}

// every Price on the account (active or not), keyed by id — a few paginated
// list calls instead of one retrieve per variant, so a full sync stays well
// inside a proxy's request timeout.
async function fetchAllStripePrices(): Promise<Map<string, Stripe.Price>> {
  const prices = new Map<string, Stripe.Price>();
  for await (const price of stripe.prices.list({ limit: 100, expand: ['data.product'] })) {
    prices.set(price.id, price);
  }
  return prices;
}

export async function runReconcile(): Promise<ReconcileReport> {
  const report: ReconcileReport = {
    fulfillmentRowsCreated: [],
    variantsCreated: [],
    defaultsFixed: [],
    stripePricesCreated: [],
    stripePricesUpdated: [],
    flagged: [],
    errors: [],
    chargesSkipped: [],
  };

  const [shopItems, existingVariants, fulfillmentShopItemIds, stripePrices] = await Promise.all([
    fetchShopItems(),
    fetchVariants(),
    fetchFulfillmentShopItemIds(),
    fetchAllStripePrices(),
  ]);

  const variantsByShopItemId = new Map<string, VariantRow[]>();
  existingVariants.forEach((v) => {
    const list = variantsByShopItemId.get(v.shopItemId) ?? [];
    list.push(v);
    variantsByShopItemId.set(v.shopItemId, list);
  });

  for (const shopItem of shopItems) {
    // 1. missing Fulfillment row — not for Digital items, which are delivered
    // automatically (download on the /order page), so there's nothing to pack.
    if (shopItem.type !== 'Digital' && !fulfillmentShopItemIds.has(shopItem.id)) {
      await createFulfillmentRow(shopItem);
      report.fulfillmentRowsCreated.push(shopItem.name);
    }

    // 2. missing variant entirely
    let variants = variantsByShopItemId.get(shopItem.id) ?? [];
    if (variants.length === 0) {
      const created = await createStandardVariant(shopItem);
      variants = [created];
      variantsByShopItemId.set(shopItem.id, variants);
      report.variantsCreated.push(shopItem.name);
    }

    // 3. no Default variant set
    if (!variants.some((v) => v.isDefault)) {
      if (variants.length === 1) {
        await setVariantDefault(variants[0].id);
        variants[0].isDefault = true;
        report.defaultsFixed.push(`${shopItem.name} — ${variants[0].name}`);
      } else {
        report.flagged.push(`${shopItem.name}: ${variants.length} variants, none marked Default — pick one manually`);
      }
    }

    // 4. per-variant checks
    for (const variant of variants) {
      const label = variantDisplayName(displayName(shopItem.name), variant.name, variants.length);

      if (variant.variantType === 'set' && variant.quantityMultiplier == null) {
        report.flagged.push(`${label}: Variant Type is "set" but Quantity multiplier is empty`);
      }

      const result = await syncStripePrice(variant, label, stripePrices.get(variant.stripePriceId), shopItem.interval);
      if (result.action === 'created') {
        report.stripePricesCreated.push({ variant: label, priceId: result.priceId, reason: result.reason });
      } else if (result.action === 'updated') {
        report.stripePricesUpdated.push({
          variant: label, oldPriceId: result.oldPriceId, newPriceId: result.newPriceId,
          oldCents: result.oldCents, newCents: result.newCents, reason: result.reason,
        });
      } else if (result.action === 'error') {
        report.errors.push(`${label}: ${result.error}`);
      }
    }
  }

  try {
    report.chargesSkipped = await applyChargeSkips();
  } catch (error) {
    report.errors.push(`charge skips (cookie club week / breaks): ${(error as Error).message}`);
  }

  return report;
}
