// Weekly memberships bill every Friday at 6pm Central (owner, 2026-09-24 — when
// Merr usually goes live). Level changes made before then apply to that week's
// charge and box. America/Chicago handles CST/CDT automatically.
// Signup pays for the first box up front (owner, round 4), so the recurring
// Friday charges start one week after the first box's cutoff.
// No Tweat charge (or box) on the Friday before cookie club week (owner, round
// 7) — callers pass those Fridays as `skip` (see src/lib/chargeCalendar.ts), and a
// first box that would land on one moves to the following Friday.
const ZONE = 'America/Chicago';
const BILLING_WEEKDAY = 5; // Friday (0 = Sunday)
const BILLING_HOUR = 18;
// signups this close to the cutoff roll to the following Friday, so a slow
// checkout can't finish after the anchor time has already passed
const MIN_LEAD_MS = 30 * 60 * 1000;

// minutes east of UTC for Chicago at `at` (e.g. -300 for CDT)
function zoneOffsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = name.match(/GMT([+-]\d+)(?::(\d+))?/);
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 0;
}

export function chicagoDate(at: Date): { y: number; m: number; d: number; weekday: number } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
  }).formatToParts(at).map((p) => [p.type, p.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), weekday };
}

// UTC instant of y-m-d 18:00 Chicago time
function chicagoBillingTime(y: number, m: number, d: number): Date {
  const naive = Date.UTC(y, m - 1, d, BILLING_HOUR);
  const offset = zoneOffsetMinutes(new Date(naive));
  return new Date(naive - offset * 60 * 1000);
}

// Chicago calendar date of a billing instant, "YYYY-MM-DD" — the key `skip` uses
export function chicagoDay(at: Date): string {
  const { y, m, d } = chicagoDate(at);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// the next Friday 6pm Central at least MIN_LEAD_MS from now, passing over any
// Friday in `skip`
export function nextBillingTime(now = new Date(), skip: Set<string> = new Set()): Date {
  const { y, m, d, weekday } = chicagoDate(now);
  let days = (BILLING_WEEKDAY - weekday + 7) % 7;
  let when = chicagoBillingTime(y, m, d + days);
  while (when.getTime() - now.getTime() < MIN_LEAD_MS || skip.has(chicagoDay(when))) {
    days += 7;
    when = chicagoBillingTime(y, m, d + days);
  }
  return when;
}

// for a signup now: the first box (paid at checkout) is finalized at
// nextBillingTime(); the first recurring Friday charge is the one after that
export function firstRecurringCharge(now = new Date(), skip: Set<string> = new Set()): Date {
  return nextBillingTime(new Date(nextBillingTime(now, skip).getTime() + 60 * 60 * 1000), skip);
}
