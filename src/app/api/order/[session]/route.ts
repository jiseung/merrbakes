import { NextRequest, NextResponse } from 'next/server';
import { getPaidOrder } from '@/lib/orders';
import { clubWeekCode } from '@/lib/promo';

// Backs the /order/[session] receipt page.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  try {
    const order = await getPaidOrder(session);
    if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
    // monthly clubs joined on merrbakes.com get free-shipping club week drops —
    // the order page is where they learn the code
    const monthlyMember = order.items.some((i) => i.membership === 'month');
    return NextResponse.json({ ...order, clubWeekCode: monthlyMember ? clubWeekCode() : null });
  } catch (error) {
    console.log('order lookup error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
