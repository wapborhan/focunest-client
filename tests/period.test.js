import { describe, it, expect } from "vitest";
import { resolvePeriod } from "@/lib/period";
import { presetRange } from "@/lib/dates";
describe("resolvePeriod (the ?preset=&from=&to= URL)", () => {
  it("defaults to this month", () => expect(resolvePeriod({})).toEqual({ preset: "month", range: presetRange("month") }));
  it("understands every preset", () => { for (const p of ["today", "week", "month", "year"]) expect(resolvePeriod({ preset: p })).toEqual({ preset: p, range: presetRange(p) }); });
  it("keeps a valid custom range", () => expect(resolvePeriod({ preset: "custom", from: "2026-03-01", to: "2026-03-31" })).toEqual({ preset: "custom", range: { from: "2026-03-01", to: "2026-03-31" } }));
  it("falls back to this month for anything invalid or tampered", () => {
    const month = { preset: "month", range: presetRange("month") };
    for (const sp of [{ preset: "forever" }, { preset: "custom" }, { preset: "custom", from: "2026-03-31", to: "2026-03-01" }, { preset: "custom", from: "nope", to: "2026-03-01" },
      { preset: "custom", from: "2026-02-30", to: "2026-03-01" }, { preset: "custom", from: "2000-01-01", to: "2026-03-01" }, { preset: ["custom", "x"], from: "a", to: "b" }]) expect(resolvePeriod(sp)).toEqual(month);
  });
});
import { resolveMonth } from "@/lib/period";
import { currentMonth } from "@/lib/dates";
describe("resolveMonth (the ?month=YYYY-MM URL)", () => {
  it("keeps a valid month", () => expect(resolveMonth({ month: "2026-03" })).toBe("2026-03"));
  it("falls back to the current month for missing, malformed or out-of-range values", () => {
    for (const sp of [{}, { month: "" }, { month: "2026-13" }, { month: "2026-00" }, { month: "26-03" }, { month: "1999-12" }, { month: "2101-01" }, { month: ["2026-03", "x"][1] }, { month: "2026-03-01" }]) expect(resolveMonth(sp)).toBe(currentMonth());
  });
  it("takes the first of repeated values", () => expect(resolveMonth({ month: ["2026-05", "2026-06"] })).toBe("2026-05"));
});
