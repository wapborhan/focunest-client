"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import Popover from "./ui/Popover";
import { signOutEverywhere } from "@/lib/firebase-client";

function Avatar({ user, size = 36 }) {
  const [bad, setBad] = useState(false);
  if (user.picture && !bad) return (/* eslint-disable-next-line @next/next/no-img-element */
    <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} style={{ width: size, height: size }} className="rounded-full object-cover" />);
  return <span style={{ width: size, height: size }} className="grid place-items-center rounded-full bg-gradient-to-br from-accent to-brand-dark font-semibold text-white">{(user.name || user.email || "U")[0].toUpperCase()}</span>;
}
/** Avatar button + dropdown. Closes on outside click, Escape, or choosing an item. */
export default function UserMenu({ user }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const router = useRouter();
  async function logout() {
    setBusy(true);
    try { await signOutEverywhere(); router.replace("/login"); router.refresh(); } catch { toast.error("Couldn't sign out. Try again."); setBusy(false); }
  }
  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" className="w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
      trigger={(p) => (
        <button type="button" {...p} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((o) => !o)}
          className={`group flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-brand-soft ${open ? "bg-brand-soft" : ""}`}>
          <span className="rounded-full bg-gradient-to-br from-accent to-brand p-[2px] transition-transform group-hover:scale-105"><span className="block rounded-full bg-white p-[2px]"><Avatar user={user} size={32} /></span></span>
          <ChevronDown size={14} aria-hidden className={`hidden text-muted transition-transform duration-300 sm:block ${open ? "rotate-180" : ""}`} />
        </button>)}>
      <div role="menu">
        <div className="bg-gradient-to-br from-brand to-brand-dark px-4 py-5 text-white">
          <div className="flex items-center gap-3"><span className="rounded-full bg-white/25 p-[2px]"><Avatar user={user} size={48} /></span>
            <div className="min-w-0"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-sm text-white/75">{user.email}</p></div></div></div>
        <div className="p-2">
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-brand-soft"><Settings size={16} aria-hidden className="text-brand" />Settings</Link>
          <button type="button" role="menuitem" onClick={logout} disabled={busy} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"><LogOut size={16} aria-hidden />{busy ? "Signing out…" : "Sign out"}</button></div>
      </div>
    </Popover>
  );
}
