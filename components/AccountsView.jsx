"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArrowLeftRight } from "lucide-react";
import AccountForm from "./AccountForm";
import Dialog from "./Dialog";
import TransferForm from "./TransferForm";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";

const LABEL = { cash: "cash account", bank: "bank account", mobile: "mobile banking account" };

export default function AccountsView({ type }) {
  const [items, setItems] = useState(null); const [error, setError] = useState(null);
  const [form, setForm] = useState(null);      // null | "new" | account
  const [confirm, setConfirm] = useState(null); // account to archive
  const [transfer, setTransfer] = useState(false);
  const load = useCallback(async () => {
    setError(null);
    try { setItems((await api(`/api/accounts?type=${type}`)).items); } catch (e) { setError(e.message); }
  }, [type]);
  useEffect(() => { load(); }, [load]);

  async function archive(a) {
    try { await api(`/api/accounts/${a.id}`, { method: "PATCH", body: { status: "archived" } }); toast.success("Account archived"); setConfirm(null); load(); }
    catch (e) { toast.error(e.message); setConfirm(null); }
  }
  const total = (items ?? []).reduce((s, a) => s + a.balanceMinor, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted">{items ? `Total balance ${formatBDT(total)}` : "\u00a0"}</p>
        <div className="flex gap-2"><button onClick={() => setTransfer(true)} className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2"><ArrowLeftRight size={16} />Transfer money</button>
          <button onClick={() => setForm("new")} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white"><Plus size={16} />Add {LABEL[type]}</button></div>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">{error} <button onClick={load} className="font-medium underline">Retry</button></div>}
      {!items && !error && <div className="space-y-2" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-black/5" />)}</div>}
      {items?.length === 0 && <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center"><p className="font-medium">No {LABEL[type]}s yet</p><p className="text-muted">Add one with its opening balance to start tracking.</p></div>}
      <ul className="grid gap-3 md:grid-cols-2">
        {items?.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><Link href={`/cash/accounts/${type}/${a.id}`} className="font-semibold text-brand hover:underline">{a.name}</Link>
                <p className="truncate text-sm text-muted">{[a.provider, a.identifierMasked].filter(Boolean).join(" · ") || "No details"}</p></div>
              <div className="flex gap-1">
                <button aria-label={`Edit ${a.name}`} onClick={() => setForm(a)} className="rounded-lg p-2 hover:bg-black/5"><Pencil size={16} /></button>
                <button aria-label={`Archive ${a.name}`} onClick={() => setConfirm(a)} className="rounded-lg p-2 hover:bg-black/5"><Archive size={16} /></button>
              </div>
            </div>
            <p className={`mt-3 text-2xl font-semibold ${a.balanceMinor < 0 ? "text-red-700" : ""}`}>{formatBDT(a.balanceMinor)}</p>
          </li>))}
      </ul>
      {transfer && <TransferForm onClose={() => setTransfer(false)} onSaved={() => { setTransfer(false); load(); }} />}
      {form && <AccountForm type={type} account={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {confirm && (<Dialog title="Archive this account?" onClose={() => setConfirm(null)}>
        <p className="text-muted">{confirm.name} will be hidden from your balances. Its history is kept. You can only archive accounts with a zero balance.</p>
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setConfirm(null)} className="rounded-lg px-4 py-2 hover:bg-black/5">Cancel</button>
          <button onClick={() => archive(confirm)} className="rounded-lg bg-red-700 px-4 py-2 font-medium text-white">Archive account</button></div>
      </Dialog>)}
    </div>
  );
}
