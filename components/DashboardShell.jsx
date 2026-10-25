"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import Sidebar from "./Sidebar";
import { NAV, trail } from "@/lib/nav";
import { signOutEverywhere } from "@/lib/firebase-client";
export default function DashboardShell({ user, children }) {
    const [drawer, setDrawer] = useState(false);
    const [menu, setMenu] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const crumbs = trail(NAV, pathname);
    const title = crumbs.at(-1)?.en ?? "My Life Manager";
    useEffect(() => { const k = (e) => e.key === "Escape" && (setDrawer(false), setMenu(false)); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);
    async function logout() { await signOutEverywhere(); router.replace("/login"); router.refresh(); }
    const brand = <Link href="/dashboard" className="block px-5 py-4 text-lg font-semibold text-brand">My Life Manager</Link>;
    return (<div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-line bg-white lg:block">{brand}<Sidebar /></aside>
      {drawer && (<div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
        <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)}/>
        <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white">
          <div className="flex items-center justify-between pr-3">{brand}<button aria-label="Close menu" onClick={() => setDrawer(false)} className="p-2"><X size={20}/></button></div>
          <Sidebar onNavigate={() => setDrawer(false)}/>
        </div></div>)}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
          <button aria-label="Open menu" onClick={() => setDrawer(true)} className="rounded-lg p-2 hover:bg-black/5 lg:hidden"><Menu size={20}/></button>
          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb" className="truncate text-xs text-muted">{crumbs.map((c) => c.en).join(" / ")}</nav>
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
          <div className="relative">
            <button aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full p-1 hover:bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full"/> : <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white">{user.name?.[0] ?? "U"}</span>}
            </button>
            {menu && (<div role="menu" className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-white p-3 shadow-sm">
              <p className="truncate font-medium">{user.name}</p><p className="truncate text-sm text-muted">{user.email}</p>
              <button role="menuitem" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-black/5"><LogOut size={16}/>Sign out</button>
            </div>)}
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>);
}
