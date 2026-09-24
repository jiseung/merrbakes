import { NextResponse } from 'next/server';
import { getClubs } from '@/lib/clubs';
import { nextBillingTime, firstRecurringCharge } from '@/lib/billing';
import { skippedFridays } from '@/lib/cookieWeek';

// Backs /club's join section: every membership sold on merrbakes.com (live from
// Notion) + the weekly club's billing dates for its "you'll pay…" note. Stripe
// price ids stay server-side.
export async function GET() {
  try {
    const [clubs, skip] = await Promise.all([getClubs(), skippedFridays()]);
    const now = new Date();
    return NextResponse.json({
      clubs: clubs.map((c) => ({ ...c, options: c.options.map(({ stripePriceId: _omit, ...o }) => o) })),
      weekly: {
        firstBoxCutoff: nextBillingTime(now, skip).toISOString(),
        firstWeeklyCharge: firstRecurringCharge(now, skip).toISOString(),
        // upcoming no-charge Fridays ("YYYY-MM-DD", Chicago), for the page note
        skippedFridays: [...skip].filter((d) => d >= now.toISOString().slice(0, 10)).sort(),
      },
    });
  } catch (error) {
    console.log('clubs error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
