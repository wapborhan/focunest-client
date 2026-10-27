"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArrowLeftRight, Banknote, Building2, Smartphone, Wallet, Layers } from "lucide-react";
import AccountForm from "./AccountForm";
import TransferForm from "./TransferForm";
import Dialog from "./Dialog";
import DataTable from "./ui/DataTable";
import StatCard from "./ui/StatCard";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";

const TABS = [["cash", "Cash", Banknote, "cash account"], ["bank", "Bank accounts", Building2, "bank account"], ["mobile", "Mobile banking", Smartphone, "mobile banking account"]];

/** All accounts arrive from the server once. Switching tabs is instant and makes no request. */
export default function AccountsView({ accounts, initialType }) {
  const router = useRouter(); const [type, setType] = useState(initialType);
  const [form, setForm] = useState(null); const [confirm, setConfirm] = useState(null); const [transfer, setTransfer] = useState(false);
  const tab = TABS.find((t) => t[0] === type), TabIcon = tab[2], rows = accounts.filter((a) => a.type === type), total = rows.reduce((s, a) => s + a.balanceMinor, 0);
  const pick = (t) => { setType(t); window.history.replaceState(null, "", `?type=${t}`); };
  const done = () => { setForm(null); setTransfer(false); router.refresh(); };
  async function archive(a) {
    try { await api(`/api/accounts/${a.id}`, { method: "PATCH", body: { status: "archived" } }); toast.success("Account archived"); router.refresh(); }
    catch (e) { toast.error(e.message); } finally { setConfirm(null); }
  }
  const columns = [
    { key: "name", header: "Account", role: "title", cell: (a) => <Link href={`/cash/accounts/${a.id}`} className="font-semibold text-brand hover:underline">{a.name}</Link> },
    { key: "provider", header: type === "bank" ? "Bank" : "Provider", cell: (a) => a.provider ?? "—" },
    ...(type !== "cash" ? [{ key: "ident", header: "Account no.", cell: (a) => <span className="tabular-nums text-muted">{a.identifierMasked ?? "—"}</span> }] : []),
    { key: "opened", header: "Opened", nowrap: true, cell: (a) => formatDhaka(a.openingDate) },
    { key: "balance", header: "Balance", align: "right", role: "amount", nowrap: true, cell: (a) => <span className={`font-semibold tabular-nums ${a.balanceMinor < 0 ? "text-red-600" : ""}`}>{formatBDT(a.balanceMinor)}</span> },
    { key: "actions", role: "actions", align: "right", cell: (a) => (<div className="flex justify-end gap-1"><button aria-label={`Edit ${a.name}`} onClick={() => setForm(a)} className="icon-btn"><Pencil size={16} /></button>
      <button aria-label={`Archive ${a.name}`} onClick={() => setConfirm(a)} className="icon-btn"><Archive size={16} /></button></div>) },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard i={0} icon={Wallet} title={`Total in ${tab[1].toLowerCase()}`} value={formatBDT(total)} /><StatCard i={1} icon={Layers} title="Accounts" value={rows.length} note="In this tab" />
        <StatCard i={2} icon={Wallet} title="All accounts" value={formatBDT(accounts.reduce((s, a) => s + a.balanceMinor, 0))} note={`${accounts.length} active`} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Account type" className="flex max-w-full overflow-x-auto rounded-2xl border border-line bg-white p-1 shadow-sm">
          {TABS.map(([k, label, Icon]) => (<button key={k} role="tab" aria-selected={type === k} onClick={() => pick(k)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${type === k ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-brand"}`}>
            <Icon size={16} aria-hidden />{label}<span className={`rounded-full px-1.5 text-xs ${type === k ? "bg-white/25" : "bg-slate-100"}`}>{accounts.filter((a) => a.type === k).length}</span></button>))}</div>
        <div className="flex gap-2"><button onClick={() => setTransfer(true)} className="btn btn-ghost"><ArrowLeftRight size={16} aria-hidden />Transfer money</button>
          <button onClick={() => setForm("new")} className="btn btn-primary"><Plus size={16} aria-hidden />Add {tab[3]}</button></div>
      </div>
      <div key={type} role="tabpanel" className="animate-fade-up">
        <DataTable columns={columns} rows={rows} caption={`${tab[1]} accounts`}
          empty={<><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><TabIcon aria-hidden /></span><p className="mt-4 font-semibold">No {tab[3]}s yet</p><p className="mt-1 text-muted">Add one with its opening balance to start tracking.</p></>} />
      </div>
      {form && <AccountForm type={type} account={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={done} />}
      {transfer && <TransferForm accounts={accounts} onClose={() => setTransfer(false)} onSaved={done} />}
      {confirm && (<Dialog title="Archive this account?" onClose={() => setConfirm(null)}>
        <p className="text-muted"><b className="text-ink">{confirm.name}</b> will be hidden from your balances. Its history is kept. Only accounts with a zero balance can be archived.</p>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirm(null)} className="btn btn-ghost">Cancel</button><button onClick={() => archive(confirm)} className="btn btn-danger">Archive account</button></div></Dialog>)}
    </div>
  );
}
