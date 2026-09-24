import { NextRequest, NextResponse } from 'next/server';
import { getPaidOrder } from '@/lib/orders';

// Backs the /order/[session] receipt page.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  try {
    const order = await getPaidOrder(session);
    if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    console.log('order lookup error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
