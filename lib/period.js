import { flat } from "./search-params";
import { ymd } from "./schemas/transaction";
import { presetRange } from "./dates";
export const PRESET_KEYS = ["today", "week", "month", "year", "custom"];
/** Reads ?preset=&from=&to= from the URL. Anything invalid falls back to "This month" instead of erroring. */
export function resolvePeriod(searchParams) {
  const sp = flat(searchParams);
  let preset = PRESET_KEYS.includes(sp.preset) ? sp.preset : "month";
  let range = preset === "custom" ? { from: sp.from, to: sp.to } : presetRange(preset);
  if (preset === "custom") {
    const ok = ymd.safeParse(range.from).success && ymd.safeParse(range.to).success && range.from <= range.to
      && (new Date(`${range.to}T00:00:00Z`) - new Date(`${range.from}T00:00:00Z`)) / 864e5 < 3660;
    if (!ok) { preset = "month"; range = presetRange("month"); }
  }
  return { preset, range };
}
