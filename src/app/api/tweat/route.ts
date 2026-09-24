import { NextResponse } from 'next/server';
import { getTweatClub } from '@/lib/tweat';
import { nextBillingTime } from '@/lib/billing';

// Backs /tweat: the club's levels (live from Notion) + when the next weekly
// charge happens, for the "first charge" note. Stripe price ids stay server-side.
export async function GET() {
  try {
    const club = await getTweatClub();
    if (!club) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({
      name: club.name,
      description: club.description,
      photoUrl: club.photoUrl,
      levels: club.levels.map(({ stripePriceId: _omit, ...l }) => l),
      nextBilling: nextBillingTime().toISOString(),
    });
  } catch (error) {
    console.log('tweat error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
