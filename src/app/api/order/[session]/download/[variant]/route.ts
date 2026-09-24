import { NextRequest, NextResponse } from 'next/server';
import { getOrderDownload } from '@/lib/orders';

// Streams a digital item's file to the buyer after re-checking the order is
// paid and contains that item. The Notion file URL itself is never sent to the
// browser (it's short-lived and would otherwise be shareable while it lasts).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ session: string; variant: string }> }) {
  const { session, variant } = await params;
  try {
    const file = await getOrderDownload(session, variant);
    if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const upstream = await fetch(file.url, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'file unavailable' }, { status: 502 });
    }
    const safeName = file.filename.replace(/["\\\r\n]/g, '');
    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.log('order download error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
