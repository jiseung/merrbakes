import type { Plate } from "@/content/option16";

export type DropItem = {
  id?: string; // Shop Items Notion page ID — used to match this item to its variants
  name: string;
  price: string;
  description?: string;
  photoUrl?: string | null;
  icon?: string;
  plate?: Plate;
  tag?: string;
  limited?: boolean;
};

export type Variant = {
  id: string; // Shop Item Variants Notion page ID — the unique identity a cart line/checkout resolves by
  shopItemId: string;
  name: string;
  price: string;
  isDefault: boolean;
  onSchedule: boolean; // this variant is featured on the monthly bake calendar
};

export function priceToCents(price: string): number {
  return Math.round(parseFloat(price.replace(/[^0-9.]/g, "")) * 100) || 0;
}

// Cart/detail-page display name for a specific variant. Items with only one
// variant (the "Standard" default rows backfilled for items without real
// quantity/flavor tiers) don't need that variant name cluttering the display.
export function variantDisplayName(itemName: string, variantName: string, totalVariantsForItem: number): string {
  return totalVariantsForItem > 1 ? `${itemName} — ${variantName}` : itemName;
}

// Notion names carry a "(pre-order)"-style tag on every row (all current stock is
// preorder) — redundant once it's the page title, so strip it for display.
export function displayName(name: string): string {
  return name.replace(/\s*[([].*?pre.?order.*?[)\]]\s*$/i, "").trim();
}

// URL slug for a product's detail page (/shop/[slug]), derived from its display name
// so it's stable without needing a separate id from Notion.
export function slugify(name: string): string {
  return displayName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
