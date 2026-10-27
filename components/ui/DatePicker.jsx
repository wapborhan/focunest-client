"use client";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, X } from "lucide-react";
import Popover from "./Popover";
import { dhakaToday, fmtYmd } from "@/lib/dates";
const toDate = (s) => (s ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : undefined);
const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Calendar popover. Value is a YYYY-MM-DD string, so there is no time zone drift. */
export default function DatePicker({ value, onChange, placeholder = "Pick a date", clearable = false, min, max, disabled = false, id, invalid = false, "aria-label": ariaLabel }) {
  const [open, setOpen] = useState(false); const sel = toDate(value);
  const matchers = [min && { before: toDate(min) }, max && { after: toDate(max) }].filter(Boolean);
  const done = (v) => { onChange(v); setOpen(false); };
  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen} className="rounded-2xl border border-line bg-white p-3 shadow-xl"
        trigger={(p) => (
          <button type="button" id={id} {...p} disabled={disabled} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}
            className={`field flex items-center gap-2 text-left ${invalid ? "border-red-400" : ""} ${clearable && value ? "pr-9" : ""}`}>
            <CalendarDays size={16} aria-hidden className="shrink-0 text-brand" /><span className={`truncate ${value ? "" : "text-muted/70"}`}>{value ? fmtYmd(value) : placeholder}</span>
          </button>)}>
        <DayPicker mode="single" selected={sel} onSelect={(d) => d && done(toYmd(d))} defaultMonth={sel ?? toDate(dhakaToday())} captionLayout="dropdown"
          startMonth={new Date(2000, 0)} endMonth={new Date(2100, 11)} disabled={matchers} showOutsideDays />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
          <button type="button" onClick={() => done(dhakaToday())} className="rounded-lg px-2 py-1 font-medium text-brand hover:bg-brand-soft">Today</button>
          {clearable && value && <button type="button" onClick={() => done("")} className="rounded-lg px-2 py-1 text-muted hover:bg-slate-100">Clear</button>}
        </div>
      </Popover>
      {clearable && value && !disabled && <button type="button" aria-label="Clear date" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-slate-100"><X size={14} aria-hidden /></button>}
    </div>
  );
}
