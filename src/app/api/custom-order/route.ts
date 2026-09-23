import { NextRequest, NextResponse } from 'next/server';
import { CONTACT_QUERIES_DB_ID, notionHeaders } from '@/lib/notion';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: 'Missing required field' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
    }

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        parent: { database_id: CONTACT_QUERIES_DB_ID },
        properties: {
          Name: { title: [{ text: { content: name } }] },
          Email: { email },
          Message: { rich_text: [{ text: { content: message } }] },
          'Sent on': { date: { start: new Date().toISOString() } },
        },
      }),
    });

    if (!res.ok) {
      console.log('custom-order: Notion write failed', await res.text());
      return NextResponse.json({ success: false, message: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.log(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
