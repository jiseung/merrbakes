// Weekly memberships bill every Friday at 6pm Central (owner, 2026-09-24 — when
// Merr usually goes live). Level changes made before then apply to that week's
// charge and box. America/Chicago handles CST/CDT automatically.
// Signup pays for the first box up front (owner, round 4), so the recurring
// Friday charges start one week after the first box's cutoff.
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

function chicagoDate(at: Date): { y: number; m: number; d: number; weekday: number } {
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

// the next Friday 6pm Central at least MIN_LEAD_MS from now
export function nextBillingTime(now = new Date()): Date {
  const { y, m, d, weekday } = chicagoDate(now);
  const daysAhead = (BILLING_WEEKDAY - weekday + 7) % 7;
  let when = chicagoBillingTime(y, m, d + daysAhead);
  if (when.getTime() - now.getTime() < MIN_LEAD_MS) when = chicagoBillingTime(y, m, d + daysAhead + 7);
  return when;
}

// for a signup now: the first box (paid at checkout) is finalized at
// nextBillingTime(); the first recurring Friday charge is the one after that
export function firstRecurringCharge(now = new Date()): Date {
  return nextBillingTime(new Date(nextBillingTime(now).getTime() + 60 * 60 * 1000));
}
