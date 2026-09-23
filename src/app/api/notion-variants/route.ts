import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { VARIANTS_DB_ID, notionHeaders } from '@/lib/notion';

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

  try {
    // Notion caps each query response at 100 rows — the Variants db has grown past
    // that, so a single unpaginated fetch silently drops rows (including whichever
    // "On Schedule" variants happen to fall after the first page). Loop until
    // has_more is false to get everything.
    const results: any[] = [];
    let cursor: string | undefined;
    do {
      const externalResponse = await fetch(`https://api.notion.com/v1/databases/${VARIANTS_DB_ID}/query`, {
        method: 'POST',
        headers: notionHeaders(),
        body: JSON.stringify(cursor ? { start_cursor: cursor } : {}),
        cache: 'no-store',
      });
      const data = await externalResponse.json();
      results.push(...(data.results ?? []));
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    const variants = results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        shopItemId: props['Shop Item']?.relation?.[0]?.id ?? null,
        name: props['Variant Name']?.title?.map((t: any) => t.plain_text).join('') ?? '',
        price: props.Price?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
        isDefault: props.Default?.checkbox ?? false,
        onSchedule: props['On Schedule']?.checkbox ?? false,
      };
    });

    return new NextResponse(JSON.stringify({ data: variants }), { headers });
  } catch (error) {
    const err = error as Error;
    console.log(err.stack);
    return new NextResponse(JSON.stringify({ error: 'Error fetching data' }), { headers, status: 500 });
  }
}
