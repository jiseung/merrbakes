import { STREAM_CALENDAR_DB_ID, notionHeaders } from '@/lib/notion';
import { chicagoDate } from '@/lib/billing';

// Which recurring charges don't happen, from Merr's monthly calendar db in
// Notion (one row per month, title "YYYY-MM"):
// - "Cookie Club Monday": the Monday cookie club week starts. Tweat of the Week
//   doesn't charge (or ship) the Friday before it (owner, 2026-09-24). Blank =
//   the default, the week starting on the month's 3rd Monday. A Monday Merr set
//   is applied ahead of time; a default only at the Friday 6pm charge, so she
//   can still set a different Monday until then (owner, 2026-09-25).
// - "Break": a date range (on the row of the month it starts in) when Merr's
//   taking time off — NO recurring charge dated inside it happens, weekly or
//   monthly; memberships stay active and pick back up after (owner, 2026-09-25).
// Days are Chicago calendar dates, "YYYY-MM-DD".

type Ymd = { y: number; m: number; d: number };
export type DateRange = { start: string; end: string };
export type ChargeCalendar = { cookieFridays: Map<string, 'set' | 'default'>; breaks: DateRange[] };

const pad = (n: number) => String(n).padStart(2, '0');
const key = ({ y, m, d }: Ymd) => `${y}-${pad(m)}-${pad(d)}`;
const parse = (s: string): Ymd => ({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)) });
// plain calendar-date math (dates, not instants — no time zones involved)
function addDays({ y, m, d }: Ymd, days: number): Ymd {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
const weekday = ({ y, m, d }: Ymd) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

function thirdMonday(y: number, m: number): Ymd {
  const first = { y, m, d: 1 };
  return addDays(first, (1 - weekday(first) + 7) % 7 + 14);
}

// the Friday strictly before the week's start date
function fridayBefore(start: Ymd): Ymd {
  let day = addDays(start, -1);
  while (weekday(day) !== 5) day = addDays(day, -1);
  return day;
}

type Rows = { cookieMondays: Map<string, string>; breaks: DateRange[] };
async function calendarRows(): Promise<Rows> {
  const res = await fetch(`https://api.notion.com/v1/databases/${STREAM_CALENDAR_DB_ID}/query`, {
    method: 'POST', headers: notionHeaders(), body: JSON.stringify({}), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Notion calendar query failed: ${res.status}`);
  const rows = (await res.json()).results ?? [];
  const cookieMondays = new Map<string, string>();
  const breaks: DateRange[] = [];
  for (const row of rows) {
    const month = (row.properties?.Date?.title ?? []).map((t: any) => t.plain_text).join('').trim();
    const monday = row.properties?.['Cookie Club Monday']?.date?.start;
    if (/^\d{4}-\d{2}$/.test(month) && monday) cookieMondays.set(month, monday.slice(0, 10));
    const brk = row.properties?.Break?.date;
    if (brk?.start) breaks.push({ start: brk.start.slice(0, 10), end: (brk.end ?? brk.start).slice(0, 10) });
  }
  return { cookieMondays, breaks };
}

// cookie club Fridays for this month and the next few, plus every break. If
// Notion can't be reached: default cookie Fridays only, no breaks.
export async function chargeCalendar(now = new Date(), months = 4): Promise<ChargeCalendar> {
  const rows = await calendarRows().catch((): Rows => ({ cookieMondays: new Map(), breaks: [] }));
  const cookieFridays = new Map<string, 'set' | 'default'>();
  const { y, m } = chicagoDate(now);
  for (let i = 0; i < months; i++) {
    const t = new Date(Date.UTC(y, m - 1 + i, 1));
    const yy = t.getUTCFullYear(), mm = t.getUTCMonth() + 1;
    const set = rows.cookieMondays.get(`${yy}-${pad(mm)}`);
    cookieFridays.set(key(fridayBefore(set ? parse(set) : thirdMonday(yy, mm))), set ? 'set' : 'default');
  }
  return { cookieFridays, breaks: rows.breaks };
}

export const inBreak = (day: string, breaks: DateRange[]) => breaks.some((b) => day >= b.start && day <= b.end);

// Is a recurring charge on `day` skipped? Breaks skip every membership; cookie
// club week skips Tweat (weekly) only. `includeDefaults` = also count
// default (blank-field) cookie Fridays — only at the moment of the charge.
export function isSkippedCharge(day: string, interval: 'week' | 'month', cal: ChargeCalendar, includeDefaults: boolean): boolean {
  if (inBreak(day, cal.breaks)) return true;
  if (interval !== 'week') return false;
  const source = cal.cookieFridays.get(day);
  return source === 'set' || (includeDefaults && source === 'default');
}

// Fridays with no weekly charge/box — for placing a new Tweat member's first
// box and first charge: cookie club Fridays (set or default) + Fridays in breaks
export async function skippedFridays(now = new Date(), months = 4): Promise<Set<string>> {
  const cal = await chargeCalendar(now, months);
  const days = new Set(cal.cookieFridays.keys());
  for (const b of cal.breaks) {
    for (let d = parse(b.start); key(d) <= b.end; d = addDays(d, 1)) if (weekday(d) === 5) days.add(key(d));
  }
  return days;
}
