import { NextRequest, NextResponse } from 'next/server';
import { notionHeaders } from '@/lib/notion';

const ORDERS_DB_ID = process.env.NOTION_ORDERS_DB_ID;

// Used by the cart's pre-checkout step to decide whether to show the "who
// referred you?" field — it's only offered to people with no prior order on
// record (checked against Notion, so it catches Ko-fi orders too, not just
// Stripe ones), rather than trusting the client to know that on its own.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim();
  if (!email || !ORDERS_DB_ID) {
    return NextResponse.json({ error: 'missing email or not configured' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${ORDERS_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        filter: { property: 'Buyer Email', rich_text: { equals: email } },
        page_size: 1,
      }),
      cache: 'no-store',
    });
    const data = await res.json();
    const isNewCustomer = (data.results ?? []).length === 0;
    return NextResponse.json({ isNewCustomer });
  } catch (error) {
    const err = error as Error;
    console.log('customer-lookup error:', err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
