"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Globe2, ShieldCheck } from "lucide-react";
import { signOutEverywhere } from "@/lib/firebase-client";
import { WEEK_START, TZ } from "@/lib/dates";

export default function SettingsView({ user }) {
  const router = useRouter();
  async function logout() { try { await signOutEverywhere(); router.replace("/login"); router.refresh(); } catch { toast.error("Couldn't sign out. Try again."); } }
  const rows = [["Currency", "Bangladeshi taka (BDT)"], ["Time zone", TZ], ["Week starts on", WEEK_START === 6 ? "Saturday" : WEEK_START === 1 ? "Monday" : `Day ${WEEK_START}`], ["Negative balances", "Blocked unless an account allows them"]];
  return (
    <div className="max-w-2xl space-y-5">
      <section className="card animate-fade-up overflow-hidden"><div className="bg-gradient-to-br from-brand to-brand-dark p-6 text-white"><div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full ring-2 ring-white/40" /> : null}
        <div className="min-w-0"><p className="truncate text-lg font-semibold">{user.name}</p><p className="truncate text-white/75">{user.email}</p></div></div></div>
        <p className="p-4 text-sm text-muted">You sign in with Google. There is no separate password.</p></section>
      <section style={{ "--i": 1 }} className="card animate-fade-up p-5"><h2 className="mb-3 flex items-center gap-2 font-semibold"><Globe2 size={18} className="text-brand" aria-hidden />Preferences</h2>
        <dl className="divide-y divide-line">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>)}</dl>
        <p className="mt-3 text-sm text-muted">These are fixed for now. Changing them is planned.</p></section>
      <section style={{ "--i": 2 }} className="card animate-fade-up p-5"><h2 className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-brand" aria-hidden />Security</h2>
        <p className="mb-4 text-muted">Signing out ends your session on every device, not only this one.</p>
        <button onClick={logout} className="btn btn-ghost"><LogOut size={16} aria-hidden />Sign out everywhere</button></section>
    </div>
  );
}
