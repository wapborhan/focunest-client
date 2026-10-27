"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, FilterX, Eye, HandCoins, AlertTriangle, Landmark, Inbox } from "lucide-react";
import { COPY, LoanForm, RepayForm } from "./LoanForms";
import Select from "./ui/Select";
import DatePicker from "./ui/DatePicker";
import DataTable from "./ui/DataTable";
import Pagination from "./ui/Pagination";
import StatCard from "./ui/StatCard";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";
import { useUrlFilters } from "@/lib/use-url-filters";

export const STATUS = { outstanding: "Outstanding", partial: "Partially repaid", repaid: "Repaid" };
export const StatusBadge = ({ l }) => (<span className="flex flex-wrap gap-1"><span className={`badge ${l.status === "repaid" ? "!bg-emerald-100 !text-emerald-800" : l.status === "partial" ? "!bg-amber-100 !text-amber-800" : ""}`}>{STATUS[l.status]}</span>{l.overdue && <span className="badge !bg-red-100 !text-red-700">Overdue</span>}</span>);
export const Progress = ({ l }) => { const pct = Math.min(100, Math.round((l.repaidMinor / l.principalMinor) * 100)); return (<div className="min-w-24"><span className="tabular-nums">{formatBDT(l.repaidMinor)}</span><div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Repaid" className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-accent to-brand transition-all duration-700" style={{ width: `${pct}%` }} /></div></div>); };

export default function LoansView({ query, data, accounts }) {
  const router = useRouter(); const { update, pending } = useUrlFilters(); const dir = query.direction, c = COPY[dir], s = data.summary;
  const [qInput, setQInput] = useState(query.q ?? ""); const [dialog, setDialog] = useState(null);
  useEffect(() => { if ((query.q ?? "") === qInput.trim()) return; const t = setTimeout(() => update({ q: qInput.trim() }), 450); return () => clearTimeout(t); }, [qInput, query.q, update]);
  const hasFilters = !!(query.q || query.status || query.dueFrom || query.dueTo || query.overdue === "true");
  const clear = () => { setQInput(""); update({ q: "", status: "", dueFrom: "", dueTo: "", overdue: "" }); };
  const done = () => { setDialog(null); router.refresh(); };
  const columns = [
    { key: "who", header: "Person", role: "title", cell: (l) => (<><Link href={`/cash/lending-borrowing/${l.id}`} className="font-semibold text-brand hover:underline">{l.counterparty}</Link>{l.phone && <span className="block text-xs text-muted">{l.phone}</span>}</>) },
    { key: "date", header: "Date", nowrap: true, cell: (l) => formatDhaka(l.date) },
    { key: "due", header: "Due", nowrap: true, cell: (l) => l.dueDate ? <span className={l.overdue ? "font-medium text-red-600" : ""}>{formatDhaka(l.dueDate)}</span> : <span className="text-muted">—</span> },
    { key: "principal", header: "Principal", align: "right", nowrap: true, cell: (l) => <span className="tabular-nums">{formatBDT(l.principalMinor)}</span> },
    { key: "repaid", header: "Repaid", cell: (l) => <Progress l={l} /> },
    { key: "status", header: "Status", cell: (l) => <StatusBadge l={l} /> },
    { key: "out", header: "Outstanding", align: "right", role: "amount", nowrap: true, cell: (l) => <span className="font-semibold tabular-nums">{formatBDT(l.outstandingMinor)}</span> },
    { key: "actions", role: "actions", align: "right", cell: (l) => (<div className="flex justify-end gap-1"><Link href={`/cash/lending-borrowing/${l.id}`} aria-label={`View ${l.counterparty}`} className="icon-btn"><Eye size={16} /></Link>
      {l.status !== "repaid" && <button onClick={() => setDialog({ type: "repay", loan: l })} className="btn btn-ghost !px-3 !py-1.5">{c.back}</button>}</div>) },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard i={0} icon={HandCoins} title="Lent, still owed to you" value={formatBDT(s.lentOutstandingMinor)} tone="text-brand" /><StatCard i={1} icon={Landmark} title="Borrowed, still owed by you" value={formatBDT(s.borrowedOutstandingMinor)} tone="text-red-600" />
        <StatCard i={2} icon={AlertTriangle} title="Overdue" value={`${s.overdueCount} ${s.overdueCount === 1 ? "loan" : "loans"}`} tone={s.overdueCount ? "text-red-600" : ""} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Loan type" className="flex rounded-2xl border border-line bg-white p-1 shadow-sm">{Object.entries(COPY).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={dir === k} onClick={() => update({ direction: k, status: "", q: "", dueFrom: "", dueTo: "", overdue: "" })}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${dir === k ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-brand"}`}>{v.tab}</button>))}</div>
        <button onClick={() => setDialog({ type: "new" })} className="btn btn-primary"><Plus size={16} aria-hidden />{c.add}</button></div>
      <div className="card space-y-3 p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2"><span className="lbl">Person</span><div className="relative"><Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input type="search" aria-label="Person" placeholder="Search by name" className="field pl-10" value={qInput} onChange={(e) => setQInput(e.target.value)} /></div></div>
        <div><span className="lbl">Status</span><Select aria-label="Status" value={query.status ?? ""} onChange={(v) => update({ status: v })} options={[{ value: "", label: "All statuses" }, ...Object.entries(STATUS).map(([value, label]) => ({ value, label }))]} /></div>
        <div><span className="lbl">Due from</span><DatePicker aria-label="Due from" clearable placeholder="Any" value={query.dueFrom ?? ""} max={query.dueTo} onChange={(v) => update({ dueFrom: v })} /></div>
        <div><span className="lbl">Due to</span><DatePicker aria-label="Due to" clearable placeholder="Any" value={query.dueTo ?? ""} min={query.dueFrom} onChange={(v) => update({ dueTo: v })} /></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#0f766e]" checked={query.overdue === "true"} onChange={(e) => update({ overdue: e.target.checked ? "true" : "" })} />Overdue only</label>
          {hasFilters && <button onClick={clear} className="btn btn-ghost"><FilterX size={16} aria-hidden />Clear filters</button>}</div></div>
      <DataTable columns={columns} rows={data.items} caption={`${c.tab} records`} loading={pending}
        empty={<><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Inbox aria-hidden /></span><p className="mt-4 font-semibold">No {c.noun} records match</p><p className="mt-1 text-muted">Add one, or clear the filters.</p></>} />
      <Pagination page={data.page} total={data.total} limit={data.limit} onPage={(p) => update({ page: p > 1 ? p : "" })} />
      {dialog?.type === "new" && <LoanForm direction={dir} accounts={accounts} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.type === "repay" && <RepayForm loan={dialog.loan} accounts={accounts} onClose={() => setDialog(null)} onSaved={done} />}
    </div>
  );
}
