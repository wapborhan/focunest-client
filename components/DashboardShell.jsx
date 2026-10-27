"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import Logo from "./Logo";
import { NAV, trail } from "@/lib/nav";

const Brand = () => (<Link href="/dashboard" className="flex items-center gap-3 px-5 py-5"><Logo /><span className="text-lg font-semibold tracking-tight text-white">My Life Manager</span></Link>);
const SIDE = "bg-gradient-to-b from-[#0a2925] via-[#0c3a34] to-[#0b4f49]";

export default function DashboardShell({ user, children }) {
  const [drawer, setDrawer] = useState(false); const pathname = usePathname();
  const crumbs = trail(NAV, pathname); const title = crumbs.at(-1)?.en ?? "My Life Manager";
  useEffect(() => { const k = (e) => e.key === "Escape" && setDrawer(false); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17.5rem_1fr]">
      <aside className={`sticky top-0 hidden h-screen overflow-y-auto lg:block ${SIDE}`}><Brand /><Sidebar /></aside>
      {drawer && (<div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="animate-fade absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
        <div className={`animate-drawer absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto ${SIDE}`}>
          <div className="flex items-center justify-between pr-3"><Brand /><button aria-label="Close menu" onClick={() => setDrawer(false)} className="rounded-lg p-2 text-white/80 hover:bg-white/10"><X size={20} /></button></div>
          <Sidebar onNavigate={() => setDrawer(false)} /></div></div>)}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line/70 bg-white/75 px-4 py-3 backdrop-blur-xl lg:px-8">
          <button aria-label="Open menu" onClick={() => setDrawer(true)} className="rounded-xl p-2 transition hover:bg-brand-soft lg:hidden"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-muted sm:flex">{crumbs.map((c, i) => (<span key={c.id} className="flex items-center gap-1">{i > 0 && <ChevronRight size={12} aria-hidden />}<span className={i === crumbs.length - 1 ? "font-medium text-ink/70" : ""}>{c.en}</span></span>))}</nav>
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1></div>
          <UserMenu user={user} />
        </header>
        <main key={pathname} className="animate-fade-up mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
