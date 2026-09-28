import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from "next/cache";
import { SHOP_ITEMS_DB_ID, notionHeaders } from '@/lib/notion';
import { ordersCloseAt } from '@/lib/shopItems';

function handleCors(req: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return headers;
}

export async function GET(req: NextRequest) {
  revalidatePath(req.url);
  const headers = handleCors(req);
  const hero = req.nextUrl.searchParams.get('hero') === 'true';
  // special=true → the limited-time banner (homepage + /shop): items with "Limited special"
  // ticked and Hide unticked, each flagged `closed` once its "Orders close" has passed
  const special = req.nextUrl.searchParams.get('special') === 'true';
  // type=recurring pulls the membership rows (Cookie Club, Tasting Club, Confectioner's
  // Club); type=merch pulls physical merch (t-shirts, stickers, etc.); type=digital
  // pulls digital goods (recipe cards) — used by /club and /shop respectively.
  // Defaults to Single, which is what /shop's main grid, the option16 menu teaser,
  // and the hero collage all want. Notion's merch option is named "Merrch" (renamed
  // from "Merch") — the query param stays "merch" either way.
  const typeParam = req.nextUrl.searchParams.get('type');
  const type = typeParam === 'recurring' ? 'Recurring'
    : typeParam === 'merch' ? 'Merrch'
    : typeParam === 'digital' ? 'Digital'
    : 'Single';

  try {
    // Status excludes draft/unpublished rows for Single/Recurring — but merch rows
    // currently sit in "In progress" (Notion's fulfillment-tracking status, not a
    // "not ready" flag) rather than "Preorders", so that filter doesn't apply to them.
    const typeFilter = { property: 'Type', select: { equals: type } };
    // limited specials live in their own banner (homepage + /shop), never in the grids
    const notSpecial = { property: 'Limited special', checkbox: { equals: false } };
    const filter = special
      // any Status: after preorders close Merr may move it to "In progress", and it should
      // still show as sold out until she ticks Hide
      ? { and: [{ property: 'Limited special', checkbox: { equals: true } }, { property: 'Hide', checkbox: { equals: false } }] }
      : type === 'Merrch'
      ? { and: [typeFilter, notSpecial] }
      : hero
        ? { and: [{ property: 'Status', status: { equals: 'Preorders' } }, typeFilter, { property: 'Featured in hero', checkbox: { equals: true } }] }
        : { and: [{ property: 'Status', status: { equals: 'Preorders' } }, typeFilter, notSpecial] };

    const externalResponse = await fetch(`https://api.notion.com/v1/databases/${SHOP_ITEMS_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({ filter }),
      cache: 'no-store',
    });
    const data = await externalResponse.json();

    const now = Date.now();
    const items = (data.results ?? []).map((page: any) => {
      const props = page.properties;
      const photoFile = props.Photo?.files?.[0];
      return {
        id: page.id,
        name: props.Name?.title?.map((t: any) => t.plain_text).join('') ?? '',
        price: props.Price?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
        description: props.Description?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
        photoUrl: photoFile?.external?.url ?? photoFile?.file?.url ?? null,
        status: props.Status?.status?.name ?? null,
        featured: props['Featured in hero']?.checkbox ?? false,
        ordersClose: ordersCloseAt(props['Orders close']?.date?.start),
      };
    })
      .map((it: { ordersClose: string | null }) => ({ ...it, closed: !!it.ordersClose && Date.parse(it.ordersClose) <= now }));

    return new NextResponse(JSON.stringify({ data: items }), { headers });
  } catch (error) {
    const err = error as Error;
    console.log(err.stack);
    return new NextResponse(JSON.stringify({ error: 'Error fetching data' }), { headers, status: 500 });
  }
}

