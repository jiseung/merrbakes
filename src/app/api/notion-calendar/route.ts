import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from "next/cache";
import { STREAM_CALENDAR_DB_ID, notionHeaders } from '@/lib/notion';

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
    const externalResponse = await fetch(`https://api.notion.com/v1/databases/${STREAM_CALENDAR_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      // "latest" means the most recent month (the Date title, e.g. "2026-08"), not whichever
      // row was created last in Notion — those can diverge if past months get backfilled.
      body: JSON.stringify({
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 1,
      }),
      cache: 'no-store',
    });
    const data = await externalResponse.json();

    const items = (data.results ?? []).map((page: any) => {
      const props = page.properties;
      const photoFile = props.Image?.files?.[0];
      return {
        month: props.Date?.title?.map((t: any) => t.plain_text).join('') ?? '',
        photoUrl: photoFile?.external?.url ?? photoFile?.file?.url ?? null,
      };
    });

    return new NextResponse(JSON.stringify({ data: items }), { headers });
  } catch (error) {
    const err = error as Error;
    console.log(err.stack);
    return new NextResponse(JSON.stringify({ error: 'Error fetching data' }), { headers, status: 500 });
  }
}
