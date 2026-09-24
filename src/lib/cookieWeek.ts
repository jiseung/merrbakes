import { STREAM_CALENDAR_DB_ID, notionHeaders } from '@/lib/notion';
import { chicagoDate } from '@/lib/billing';

// Cookie club week: Merr's week for Cookie Club / Confectioner's Club boxes, so
// Tweat of the Week doesn't charge (or ship) on the Friday before it (owner,
// 2026-09-24). Default rule: cookie club week starts on the month's 3rd Monday
// ("generally the third week"). Merr can override a month by setting "Cookie
// Club Week" (that week's Monday) on the month's row in the stream calendar db.

type Ymd = { y: number; m: number; d: number };
const pad = (n: number) => String(n).padStart(2, '0');
const key = ({ y, m, d }: Ymd) => `${y}-${pad(m)}-${pad(d)}`;
// plain calendar-date math (no time zones involved — these are dates, not instants)
function addDays({ y, m, d }: Ymd, days: number): Ymd {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
const weekday = ({ y, m, d }: Ymd) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

function thirdMonday(y: number, m: number): Ymd {
  const first = { y, m, d: 1 };
  const toMonday = (1 - weekday(first) + 7) % 7;
  return addDays(first, toMonday + 14);
}

// the Friday strictly before the week's start date
function fridayBefore(start: Ymd): Ymd {
  let day = addDays(start, -1);
  while (weekday(day) !== 5) day = addDays(day, -1);
  return day;
}

// "YYYY-MM" -> "YYYY-MM-DD" overrides from the stream calendar db
async function overrides(): Promise<Map<string, string>> {
  const res = await fetch(`https://api.notion.com/v1/databases/${STREAM_CALENDAR_DB_ID}/query`, {
    method: 'POST', headers: notionHeaders(), body: JSON.stringify({}), cache: 'no-store',
  });
  const rows = (await res.json()).results ?? [];
  const map = new Map<string, string>();
  for (const row of rows) {
    const month = (row.properties?.Date?.title ?? []).map((t: any) => t.plain_text).join('').trim();
    const start = row.properties?.['Cookie Club Week']?.date?.start;
    if (/^\d{4}-\d{2}$/.test(month) && start) map.set(month, start.slice(0, 10));
  }
  return map;
}

// Fridays (Chicago dates, "YYYY-MM-DD") with no Tweat charge, for this month and
// the next few — enough for any signup/billing lookahead. Falls back to the rule
// alone if Notion can't be reached.
export async function skippedFridays(now = new Date(), months = 4): Promise<Set<string>> {
  const set = new Set<string>();
  const byMonth = await overrides().catch(() => new Map<string, string>());
  const { y, m } = chicagoDate(now);
  for (let i = 0; i < months; i++) {
    const t = new Date(Date.UTC(y, m - 1 + i, 1));
    const yy = t.getUTCFullYear(), mm = t.getUTCMonth() + 1;
    const override = byMonth.get(`${yy}-${pad(mm)}`);
    const start = override
      ? { y: Number(override.slice(0, 4)), m: Number(override.slice(5, 7)), d: Number(override.slice(8, 10)) }
      : thirdMonday(yy, mm);
    set.add(key(fridayBefore(start)));
  }
  return set;
}
