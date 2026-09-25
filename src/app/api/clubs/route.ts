import { NextResponse } from 'next/server';
import { getClubs } from '@/lib/clubs';
import { nextBillingTime, firstRecurringCharge, chicagoDay } from '@/lib/billing';
import { chargeCalendar, skippedFridays } from '@/lib/chargeCalendar';

// Backs /club's join section: every membership sold on merrbakes.com (live from
// Notion), the weekly club's billing dates for its "you'll pay…" note, the next
// no-charge Friday before cookie club week, and Merr's upcoming breaks. Stripe
// price ids stay server-side.
export async function GET() {
  try {
    const now = new Date();
    const [clubs, skip, cal] = await Promise.all([getClubs(), skippedFridays(now), chargeCalendar(now)]);
    const today = chicagoDay(now);
    return NextResponse.json({
      clubs: clubs.map((c) => ({ ...c, options: c.options.map(({ stripePriceId: _omit, ...o }) => o) })),
      weekly: {
        // skip = cookie club Fridays + Fridays inside breaks
        firstBoxCutoff: nextBillingTime(now, skip).toISOString(),
        firstWeeklyCharge: firstRecurringCharge(now, skip).toISOString(),
        nextCookieFriday: [...cal.cookieFridays.keys()].filter((d) => d >= today).sort()[0] ?? null,
      },
      // current/upcoming breaks ("YYYY-MM-DD" ranges, Chicago), soonest first
      breaks: cal.breaks.filter((b) => b.end >= today).sort((a, b) => a.start.localeCompare(b.start)),
    });
  } catch (error) {
    console.log('clubs error:', (error as Error).stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
