import { NextRequest, NextResponse } from 'next/server';
import { REVIEWS_DB_ID, notionHeaders } from '@/lib/notion';
import type { Review } from '@/components/ProductReviews';

// Reviews for one shop item, from Notion's "merrbakes.com shop item reviews" db
// (Author, Review Text, Date, Shop Item relation, Files), newest first.
// /api/notion-reviews?item=<Shop Items page id>
export async function GET(req: NextRequest) {
  const item = req.nextUrl.searchParams.get('item');
  if (!item) return NextResponse.json({ error: 'missing item' }, { status: 400 });

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${REVIEWS_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        filter: { property: 'Shop Item', relation: { contains: item } },
        sorts: [{ property: 'Date', direction: 'descending' }],
      }),
      cache: 'no-store',
    });
    const data = await res.json();

    // rows with no text are skipped, so a half-filled row in Notion doesn't show as an empty card
    const reviews: Review[] = (data.results ?? [])
      .map((page: any) => {
        const props = page.properties;
        // Notion-hosted file URLs expire after an hour, so they're fetched fresh on each page load
        const photo = (props.Files?.files ?? []).find((f: any) => f.file?.url || f.external?.url);
        return {
          name: props.Author?.title?.map((t: any) => t.plain_text).join('') ?? '',
          date: props.Date?.date?.start ?? page.created_time.slice(0, 10),
          text: props['Review Text']?.rich_text?.map((t: any) => t.plain_text).join('') ?? '',
          photoUrl: photo?.file?.url ?? photo?.external?.url ?? null,
        };
      })
      .filter((r: Review) => r.text.trim());

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.log((error as Error).stack);
    return NextResponse.json({ error: 'Error fetching reviews' }, { status: 500 });
  }
}
