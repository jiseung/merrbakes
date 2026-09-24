import { NextResponse } from 'next/server';
import { getClubs } from '@/lib/clubs';
import { nextBillingTime, firstRecurringCharge } from '@/lib/billing';

// Backs /club's join section: every membership sold on merrbakes.com (live from
// Notion) + the weekly club's billing dates for its "you'll pay…" note. Stripe
// price ids stay server-side.
export async function GET() {
  try {
    const clubs = await getClubs();
    return NextResponse.json({
      clubs: clubs.map((c) => ({ ...c, options: c.options.map(({ stripePriceId: _omit, ...o }) => o) })),
      weekly: { firstBoxCutoff: nextBillingTime().toISOString(), firstWeeklyCharge: firstRecurringCharge().toISOString() },
    });
  } catch (error) {
    console.log('clubs error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
