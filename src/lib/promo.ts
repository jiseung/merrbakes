// Club-week drop code (owner, 2026-09-24): the same code every month. When a
// variant has "Club Week Drop" checked in Notion, entering this code at checkout
// makes that item ship free (normal price, other items still pay shipping).
// Change it with CLUB_WEEK_CODE in .env.local — no code change needed.
export function isClubWeekCode(code: unknown): boolean {
  const expected = (process.env.CLUB_WEEK_CODE || 'clubweek').trim().toLowerCase();
  return typeof code === 'string' && code.trim().toLowerCase() === expected;
}
