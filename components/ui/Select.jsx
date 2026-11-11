"use client";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import Popover from "./Popover";

/**
 * Searchable select with keyboard support. Options: { value, label, sub?, hint?, icon?, group?, keywords? }.
 * Typing filters on label, second line, hint, group and keywords.
 */
export default function Select({ value, onChange, options, placeholder = "Select…", disabled = false, id, invalid = false, className = "", "aria-label": ariaLabel }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [active, setActive] = useState(0);
  const listId = useId(); const list = useRef(null);
  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => { const t = q.trim().toLowerCase(); return t ? options.filter((o) => `${o.label} ${o.sub ?? ""} ${o.hint ?? ""} ${o.group ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(t)) : options; }, [options, q]);
  const toggle = (next) => { setOpen(next); if (next) { setQ(""); setActive(Math.max(0, options.findIndex((o) => o.value === value))); } };
  const pick = (o) => { onChange(o.value); setOpen(false); };
  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" }); }, [active, open]);
  const key = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === "Tab") toggle(false);
  };
  return (
    <Popover open={open} onOpenChange={toggle} matchWidth className="min-w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
      trigger={(p) => (
        <button type="button" id={id} {...p} role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? listId : undefined} aria-label={ariaLabel} disabled={disabled}
          onClick={() => toggle(!open)} onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); toggle(true); } }}
          className={`field flex items-center justify-between gap-2 text-left ${invalid ? "border-danger" : ""} ${className}`}>
          <span className="flex min-w-0 items-center gap-2.5">{selected?.icon}
            <span className={`truncate ${selected ? "" : "text-muted/70"}`}>{selected ? selected.label : placeholder}{selected?.sub && <span className="ml-2 text-xs text-muted">{selected.sub}</span>}</span></span>
          <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>)}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2"><Search size={16} aria-hidden className="text-muted" />
        <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={key} placeholder="Search…" aria-label="Search options" aria-controls={listId} className="no-outline w-full bg-transparent text-sm placeholder:text-muted/70" /></div>
      <ul id={listId} ref={list} role="listbox" aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto p-1">
        {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches</li>}
        {shown.map((o, i) => (
          <Fragment key={o.value}>
            {o.group && o.group !== shown[i - 1]?.group && <li role="presentation" className="sticky top-0 z-10 bg-surface/95 px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted backdrop-blur">{o.group}</li>}
            <li role="option" aria-selected={o.value === value} data-active={i === active} onMouseMove={() => setActive(i)} onClick={() => pick(o)}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${i === active ? "bg-brand-soft text-primary-strong" : ""} ${o.value === value ? "font-medium" : ""}`}>
              {o.icon}
              <span className="min-w-0 flex-1"><span className="block truncate">{o.label}</span>{o.sub && <span className="block truncate text-xs font-normal text-muted">{o.sub}</span>}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-medium tabular-nums text-muted">{o.hint}{o.value === value && <Check size={14} className="text-primary" aria-hidden />}</span>
            </li></Fragment>))}
      </ul>
    </Popover>
  );
}
