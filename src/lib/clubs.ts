import { SHOP_ITEMS_DB_ID, VARIANTS_DB_ID, notionHeaders } from '@/lib/notion';
import { priceToCents, displayName } from '@/lib/shopItems';

// Memberships sold on merrbakes.com: every Shop Item with Type "Recurring".
// Billing Interval "week" (Tweat of the Week) or "month" (Cookie / Tasting /
// Confectioner's — also sold on Ko-fi, where existing members stay). Variants
// are the options: Tweat's Level 1/2/3 (Quantity multiplier = tweats per
// week), a single "Standard" for the monthly clubs.

export type ClubOption = { variantId: string; name: string; price: string; priceCents: number; tweats: number | null; stripePriceId: string; isDefault: boolean };
export type Club = { id: string; name: string; interval: 'week' | 'month'; description: string; photoUrl: string | null; options: ClubOption[] };

const text = (p: any) => (p?.title ?? p?.rich_text ?? []).map((t: any) => t.plain_text).join('');

async function query(db: string, body: object): Promise<any[]> {
  const res = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
    method: 'POST', headers: notionHeaders(), body: JSON.stringify(body), cache: 'no-store',
  });
  return (await res.json()).results ?? [];
}

export async function getClubs(): Promise<Club[]> {
  const items = (await query(SHOP_ITEMS_DB_ID, { filter: { property: 'Type', select: { equals: 'Recurring' } } }))
    .filter((item) => !item.properties?.Hide?.checkbox);
  const clubs = await Promise.all(items.map(async (item): Promise<Club> => {
    const variants = await query(VARIANTS_DB_ID, { filter: { property: 'Shop Item', relation: { contains: item.id } } });
    const photo = item.properties?.Photo?.files?.[0];
    return {
      id: item.id,
      name: displayName(text(item.properties?.Name)),
      interval: item.properties?.['Billing Interval']?.select?.name === 'week' ? 'week' : 'month',
      description: text(item.properties?.Description),
      photoUrl: photo?.file?.url ?? photo?.external?.url ?? null,
      options: variants
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
  }));
  // weekly first, then monthly clubs cheapest-first
  return clubs
    .filter((c) => c.options.length > 0)
    .sort((a, b) => (a.interval === b.interval ? a.options[0].priceCents - b.options[0].priceCents : a.interval === 'week' ? -1 : 1));
}
