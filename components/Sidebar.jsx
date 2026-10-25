"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV, hasActive } from "@/lib/nav";
/** One expanded group per level. Expansion follows the route and toggles on click. */
export default function Sidebar({ onNavigate }) {
    const pathname = usePathname();
    const [open, setOpen] = useState({});
    useEffect(() => {
        const next = {};
        const walk = (items, depth) => { for (const i of items)
            if (i.children && hasActive(i, pathname)) {
                next[depth] = i.id;
                walk(i.children, depth + 1);
            } };
        walk(NAV, 0);
        setOpen(next);
    }, [pathname]);
    const render = (items, depth) => (<ul className={depth ? "mt-1 ml-4 space-y-1 border-l border-line pl-2" : "space-y-1"}>
      {items.map((i) => {
            const Icon = i.icon;
            const active = hasActive(i, pathname);
            const base = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors";
            if (i.children) {
                const expanded = open[depth] === i.id;
                return (<li key={i.id}>
              <button aria-expanded={expanded} aria-controls={`sub-${i.id}`} onClick={() => setOpen((o) => ({ ...o, [depth]: expanded ? null : i.id }))} className={`${base} ${expanded || active ? "bg-brand-soft font-medium text-brand" : "hover:bg-black/5"}`}>
                <Icon size={18} aria-hidden/><span className="flex-1">{i.en}</span>
                <ChevronDown size={16} aria-hidden className={`transition-transform ${expanded ? "rotate-180" : ""}`}/>
              </button>
              {expanded && <div id={`sub-${i.id}`}>{render(i.children, depth + 1)}</div>}
            </li>);
            }
            return (<li key={i.id}>
            <Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`${base} ${active ? "bg-brand text-white font-medium" : "hover:bg-black/5"}`}>
              <Icon size={18} aria-hidden/><span>{i.en}</span><span lang="bn" className="ml-auto text-xs opacity-70">{i.bn}</span>
            </Link>
          </li>);
        })}
    </ul>);
    return <nav aria-label="Main" className="p-3">{render(NAV, 0)}</nav>;
}
