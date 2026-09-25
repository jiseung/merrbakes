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
  stripePricesCreated: { variant: string; priceId: string }[];
  stripePricesUpdated: { variant: string; oldPriceId: string; newPriceId: string; oldCents: number | null; newCents: number }[];
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

// Stripe Prices are immutable, so "changing the price" means: create a new Price
// on the same Product, point the Product's default_price at it, deactivate the
// old Price so it can't be reused for new checkouts, and write the new Price ID
// back to Notion. Existing completed orders/subscriptions are unaffected either way.
//
// `known` is the variant's current Stripe Price if the caller already fetched it
// (runReconcile lists all Prices up front instead of one retrieve per variant).
// `interval` makes it a recurring (subscription) Price billed every week/month;
// a Price whose billing type doesn't match is replaced just like a wrong amount.
export async function syncStripePrice(
  variant: Pick<VariantRow, 'id' | 'price' | 'stripePriceId'>, shopItemName: string, known?: Stripe.Price,
  interval: 'week' | 'month' | null = null
): Promise<
  | { action: 'created'; priceId: string }
  | { action: 'updated'; oldPriceId: string; newPriceId: string; oldCents: number | null; newCents: number }
  | { action: 'unchanged' }
  | { action: 'error'; error: string }
> {
  const targetCents = priceToCents(variant.price);
  if (targetCents <= 0) {
    return { action: 'error', error: `no valid price to sync (Notion Price = "${variant.price}")` };
  }

  try {
    if (!variant.stripePriceId) {
      const product = await stripe.products.create({
        name: shopItemName,
        metadata: { notion_page_id: variant.id },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: targetCents,
        currency: 'usd',
        ...(interval ? { recurring: { interval } } : {}),
      });
      await stripe.products.update(product.id, { default_price: price.id });
      await setVariantStripePriceId(variant.id, price.id);
      return { action: 'created', priceId: price.id };
    }

    const currentPrice = known ?? await stripe.prices.retrieve(variant.stripePriceId);
    const billingMatches = interval ? currentPrice.recurring?.interval === interval : !currentPrice.recurring;
    if (currentPrice.unit_amount === targetCents && billingMatches) {
      return { action: 'unchanged' };
    }

    const productId = typeof currentPrice.product === 'string' ? currentPrice.product : currentPrice.product.id;
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: targetCents,
      currency: currentPrice.currency,
      ...(interval ? { recurring: { interval } } : {}),
    });
    // name refresh too — e.g. an item that grew from 1 to several variants
    // ("Tweat of the Week Club" -> "Tweat of the Week Club — Level 1")
    await stripe.products.update(productId, { default_price: newPrice.id, name: shopItemName });
    await stripe.prices.update(variant.stripePriceId, { active: false });
    await setVariantStripePriceId(variant.id, newPrice.id);
    return { action: 'updated', oldPriceId: variant.stripePriceId, newPriceId: newPrice.id, oldCents: currentPrice.unit_amount, newCents: targetCents };
  } catch (error) {
    return { action: 'error', error: (error as Error).message };
  }
}

// every Price on the account (active or not), keyed by id — a few paginated
// list calls instead of one retrieve per variant, so a full sync stays well
// inside a proxy's request timeout.
async function fetchAllStripePrices(): Promise<Map<string, Stripe.Price>> {
  const prices = new Map<string, Stripe.Price>();
  for await (const price of stripe.prices.list({ limit: 100 })) {
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
        report.stripePricesCreated.push({ variant: label, priceId: result.priceId });
      } else if (result.action === 'updated') {
        report.stripePricesUpdated.push({
          variant: label, oldPriceId: result.oldPriceId, newPriceId: result.newPriceId,
          oldCents: result.oldCents, newCents: result.newCents,
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
