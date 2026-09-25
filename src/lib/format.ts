// Notion's Date field is "YYYY-MM" (e.g. "2026-08") — display it as "August 2026".
export function formatMonth(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return value;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
