import { SHOP_ITEMS_DB_ID, VARIANTS_DB_ID, notionHeaders } from '@/lib/notion';
import { priceToCents, displayName } from '@/lib/shopItems';

// Tweat of the Week Club = the weekly membership: the Shop Item with Type
// "Recurring" and Billing Interval "week". Its variants are the levels
// (Level 1/2/3 — Quantity multiplier = tweats per week).

export type TweatLevel = { variantId: string; name: string; price: string; priceCents: number; tweats: number | null; stripePriceId: string; isDefault: boolean };
export type TweatClub = { id: string; name: string; description: string; photoUrl: string | null; levels: TweatLevel[] };

const text = (p: any) => (p?.title ?? p?.rich_text ?? []).map((t: any) => t.plain_text).join('');

async function query(db: string, body: object): Promise<any[]> {
  const res = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
    method: 'POST', headers: notionHeaders(), body: JSON.stringify(body), cache: 'no-store',
  });
  return (await res.json()).results ?? [];
}

export async function getTweatClub(): Promise<TweatClub | null> {
  const [item] = await query(SHOP_ITEMS_DB_ID, {
    filter: { and: [
      { property: 'Type', select: { equals: 'Recurring' } },
      { property: 'Billing Interval', select: { equals: 'week' } },
    ] },
  });
  if (!item) return null;
  const variants = await query(VARIANTS_DB_ID, { filter: { property: 'Shop Item', relation: { contains: item.id } } });
  const photo = item.properties?.Photo?.files?.[0];
  return {
    id: item.id,
    name: displayName(text(item.properties?.Name)),
    description: text(item.properties?.Description),
    photoUrl: photo?.file?.url ?? photo?.external?.url ?? null,
    levels: variants
      .filter((v) => !v.properties?.Hide?.checkbox)
      .map((v) => ({
        variantId: v.id,
        name: text(v.properties?.['Variant Name']),
        price: text(v.properties?.Price),
        priceCents: priceToCents(text(v.properties?.Price)),
        tweats: v.properties?.['Quantity multiplier']?.number ?? null,
        stripePriceId: text(v.properties?.['Stripe Price ID']),
        isDefault: v.properties?.Default?.checkbox ?? false,
      }))
      .sort((a, b) => a.priceCents - b.priceCents),
  };
}
