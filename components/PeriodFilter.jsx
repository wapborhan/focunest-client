"use client";
import { useState } from "react";
import DatePicker from "./ui/DatePicker";
import { formatDhaka } from "@/lib/dates";

export const PRESETS = [["today", "Today"], ["week", "This week"], ["month", "This month"], ["year", "This year"], ["custom", "Custom"]];
/** Short label for the period, used in card notes. */
export const periodNote = (preset) => (preset === "custom" ? "Custom period" : PRESETS.find(([k]) => k === preset)?.[1] ?? "Selected period");

/** Today / This week / This month / This year / Custom. Shared by both dashboards. `update` is the URL updater from useUrlFilters. */
export default function PeriodFilter({ preset, range, update }) {
  const [custom, setCustom] = useState({ from: range.from, to: range.to });
  const setCustomRange = (patch) => { const next = { ...custom, ...patch }; setCustom(next); if (next.from && next.to && next.from <= next.to) update({ preset: "custom", from: next.from, to: next.to }); };
  return (<>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Date range" className="flex max-w-full overflow-x-auto rounded-2xl border border-line bg-surface p-1 shadow-sm">
        {PRESETS.map(([k, l]) => <button key={k} aria-pressed={preset === k} onClick={() => k === "custom" ? update({ preset: "custom", from: custom.from, to: custom.to }) : update({ preset: k, from: "", to: "" })}
          className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${preset === k ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-primary"}`}>{l}</button>)}</div>
      <p className="text-sm text-muted">{formatDhaka(range.from)} – {formatDhaka(range.to)}</p>
    </div>
    {preset === "custom" && <div className="card animate-fade-up grid max-w-md grid-cols-2 gap-3 p-4"><div><span className="lbl">From</span><DatePicker aria-label="From date" value={custom.from} max={custom.to} onChange={(v) => setCustomRange({ from: v })} /></div><div><span className="lbl">To</span><DatePicker aria-label="To date" value={custom.to} min={custom.from} onChange={(v) => setCustomRange({ to: v })} /></div></div>}
  </>);
}
