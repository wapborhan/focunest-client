/** Neutralize spreadsheet formulas (CSV injection) and quote cells that need it. */
const cell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v !== "number") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header, rows) => "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
