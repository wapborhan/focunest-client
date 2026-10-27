export const TZ = "Asia/Dhaka";
/** Today's date in Dhaka as YYYY-MM-DD. */
export const dhakaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
/** Start of a Dhaka calendar day, as a UTC Date. Bangladesh has no DST (UTC+6). */
export const dhakaDateToUTC = (ymd) => new Date(`${ymd}T00:00:00+06:00`);
export const formatDhaka = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
export const toDhakaYmd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
export const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const addMonths = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
/** First day of the week. 6 = Saturday (Bangladesh). Change to 1 for Monday. */
export const WEEK_START = 6;
export const monthStart = (ymd) => `${ymd.slice(0, 7)}-01`;
export const weekStart = (ymd) => addDays(ymd, -((new Date(`${ymd}T00:00:00Z`).getUTCDay() - WEEK_START + 7) % 7));
/** Whole-period ranges (inclusive, YYYY-MM-DD) for the dashboard filter. Same boundaries as the Income/Expense totals. */
export function presetRange(preset, today = dhakaToday()) {
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") { const f = weekStart(today); return { from: f, to: addDays(f, 6) }; }
  if (preset === "year") return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  const f = monthStart(today); return { from: f, to: addDays(addMonths(f, 1), -1) };
}
/** "2026-03-10" -> "10 Mar 2026" (the string is already a calendar date, so no time zone shift). */
export const fmtYmd = (ymd) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${ymd}T00:00:00Z`));
