"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import Popover from "./Popover";

/** Searchable select with full keyboard support (arrows, Home/End, Enter, Esc, type to filter). */
export default function Select({ value, onChange, options, placeholder = "Select…", disabled = false, id, invalid = false, className = "", "aria-label": ariaLabel }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [active, setActive] = useState(0);
  const listId = useId(); const list = useRef(null);
  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => { const t = q.trim().toLowerCase(); return t ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(t)) : options; }, [options, q]);
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
    <Popover open={open} onOpenChange={toggle} matchWidth className="min-w-56 overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
      trigger={(p) => (
        <button type="button" id={id} {...p} role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? listId : undefined} aria-label={ariaLabel} disabled={disabled}
          onClick={() => toggle(!open)} onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); toggle(true); } }}
          className={`field flex items-center justify-between gap-2 text-left ${invalid ? "border-red-400" : ""} ${className}`}>
          <span className={`truncate ${selected ? "" : "text-muted/70"}`}>{selected ? selected.label : placeholder}</span>
          <ChevronDown size={16} aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>)}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2"><Search size={16} aria-hidden className="text-muted" />
        <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={key} placeholder="Search…" aria-label="Search options" aria-controls={listId} className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70" /></div>
      <ul id={listId} ref={list} role="listbox" aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto p-1">
        {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches</li>}
        {shown.map((o, i) => (
          <li key={o.value} role="option" aria-selected={o.value === value} data-active={i === active} onMouseMove={() => setActive(i)} onClick={() => pick(o)}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${i === active ? "bg-brand-soft text-brand-dark" : ""} ${o.value === value ? "font-medium" : ""}`}>
            <span className="truncate">{o.label}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{o.hint}{o.value === value && <Check size={14} className="text-brand" aria-hidden />}</span>
          </li>))}
      </ul>
    </Popover>
  );
}
