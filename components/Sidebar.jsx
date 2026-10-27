"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV, hasActive } from "@/lib/nav";

const groupFor = (p) => NAV.find((i) => i.children && hasActive(i, p))?.id ?? null;
const row = "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200";

/** Only one group is open at a time. The open group follows the route and toggles on click. */
export default function Sidebar({ onNavigate }) {
  const pathname = usePathname(); const [open, setOpen] = useState(() => groupFor(pathname));
  useEffect(() => { setOpen(groupFor(pathname)); }, [pathname]);
  const Item = ({ i, nested }) => {
    const Icon = i.icon, active = hasActive(i, pathname);
    return (<Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
      className={`${row} ${active ? "bg-white font-semibold text-brand-dark shadow-lg shadow-black/15" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
      <Icon size={nested ? 16 : 18} aria-hidden className="shrink-0 transition-transform duration-200 group-hover:scale-110" /><span className="truncate">{i.en}</span>
      <span lang="bn" className="ml-auto text-[11px] opacity-60">{i.bn}</span></Link>);
  };
  return (
    <nav aria-label="Main" className="space-y-1 p-3">
      {NAV.map((i) => {
        if (!i.children) return <Item key={i.id} i={i} />;
        const expanded = open === i.id, Icon = i.icon;
        return (
          <div key={i.id}>
            <button type="button" aria-expanded={expanded} aria-controls={`sub-${i.id}`} onClick={() => setOpen(expanded ? null : i.id)}
              className={`${row} ${hasActive(i, pathname) ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={18} aria-hidden className="shrink-0 transition-transform duration-200 group-hover:scale-110" /><span className="flex-1">{i.en}</span>
              <ChevronDown size={16} aria-hidden className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} /></button>
            <div id={`sub-${i.id}`} aria-hidden={!expanded} inert={!expanded} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <ul className="ml-5 min-h-0 space-y-1 overflow-hidden border-l border-white/15 pl-3 pt-1">{i.children.map((c) => <li key={c.id}><Item i={c} nested /></li>)}</ul></div>
          </div>);
      })}
    </nav>
  );
}
