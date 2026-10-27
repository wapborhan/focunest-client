"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download, Search, FilterX, Inbox, CalendarDays, CalendarRange, CalendarCheck } from "lucide-react";
import TransactionForm from "./TransactionForm";
import Dialog from "./Dialog";
import Select from "./ui/Select";
import DatePicker from "./ui/DatePicker";
import DataTable from "./ui/DataTable";
import Pagination from "./ui/Pagination";
import StatCard from "./ui/StatCard";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";
import { KIND_COPY } from "@/lib/tx-labels";
import { useUrlFilters } from "@/lib/use-url-filters";

const SORTS = [{ value: "date:desc", label: "Newest first" }, { value: "date:asc", label: "Oldest first" }, { value: "amount:desc", label: "Highest amount" }, { value: "amount:asc", label: "Lowest amount" }];

export default function TransactionsView({ kind, query, data, totals, accounts, categories }) {
  const copy = KIND_COPY[kind], tone = kind === "income" ? "text-brand" : "text-red-600";
  const router = useRouter(); const { update, pending } = useUrlFilters();
  const [qInput, setQInput] = useState(query.q ?? ""); const [form, setForm] = useState(null); const [del, setDel] = useState(null);
  // Typing is debounced so a search costs one server render, not one per keystroke.
  useEffect(() => { if ((query.q ?? "") === qInput.trim()) return; const t = setTimeout(() => update({ q: qInput.trim() }), 450); return () => clearTimeout(t); }, [qInput, query.q, update]);
  const hasFilters = !!(query.from || query.to || query.categoryId || query.accountId || query.q);
  const clear = () => { setQInput(""); update({ from: "", to: "", categoryId: "", accountId: "", q: "" }); };
  const exportHref = `/api/transactions/export?${new URLSearchParams(Object.entries({ kind, from: query.from, to: query.to, categoryId: query.categoryId, accountId: query.accountId, q: query.q, sort: query.sort, dir: query.dir }).filter(([, v]) => v))}`;
  const refresh = () => { setForm(null); router.refresh(); };
  async function remove(t) {
    try { await api(`/api/transactions/${t.id}`, { method: "DELETE" }); toast.success("Deleted"); setDel(null); router.refresh(); }
    catch (e) { toast.error(e.message); setDel(null); }
  }
  const columns = [
    { key: "date", header: "Date", nowrap: true, cell: (t) => formatDhaka(t.date) },
    { key: "title", header: copy.titleLabel, role: "title", cell: (t) => (<><span className="font-medium">{t.title}</span>{t.reference && <span className="block text-xs text-muted">Ref {t.reference}</span>}</>) },
    { key: "category", header: "Category", cell: (t) => <span className="badge">{t.categoryName}</span> },
    { key: "account", header: "Account", cell: (t) => t.accountName },
    { key: "amount", header: "Amount", align: "right", role: "amount", nowrap: true, cell: (t) => <span className={`font-semibold tabular-nums ${tone}`}>{formatBDT(t.amountMinor)}</span> },
    { key: "actions", role: "actions", align: "right", cell: (t) => (<div className="flex justify-end gap-1"><button aria-label={`Edit ${t.title}`} onClick={() => setForm(t)} className="icon-btn"><Pencil size={16} /></button>
      <button aria-label={`Delete ${t.title}`} onClick={() => setDel(t)} className="icon-btn hover:!bg-red-50 hover:!text-red-600"><Trash2 size={16} /></button></div>) },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3"><StatCard i={0} icon={CalendarCheck} title="Today" value={formatBDT(totals.today)} tone={tone} /><StatCard i={1} icon={CalendarDays} title="This month" value={formatBDT(totals.month)} tone={tone} /><StatCard i={2} icon={CalendarRange} title="This year" value={formatBDT(totals.year)} tone={tone} /></div>
      <div className="card animate-fade-up space-y-3 p-4" style={{ "--i": 3 }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2"><span className="lbl">Search</span><div className="relative"><Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" aria-label="Search" placeholder="Title, note or reference" className="field pl-10" value={qInput} onChange={(e) => setQInput(e.target.value)} /></div></div>
          <div><span className="lbl">From</span><DatePicker aria-label="From date" clearable placeholder="Any" value={query.from ?? ""} max={query.to} onChange={(v) => update({ from: v })} /></div>
          <div><span className="lbl">To</span><DatePicker aria-label="To date" clearable placeholder="Any" value={query.to ?? ""} min={query.from} onChange={(v) => update({ to: v })} /></div>
          <div><span className="lbl">Category</span><Select aria-label="Category" value={query.categoryId ?? ""} onChange={(v) => update({ categoryId: v })} options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.nameEn, hint: c.nameBn }))]} /></div>
          <div><span className="lbl">Account</span><Select aria-label="Account" value={query.accountId ?? ""} onChange={(v) => update({ accountId: v })} options={[{ value: "", label: "All accounts" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} /></div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full sm:w-52"><Select aria-label="Sort" value={`${query.sort}:${query.dir}`} onChange={(v) => { const [sort, dir] = v.split(":"); update({ sort, dir }); }} options={SORTS} /></div>
          <div className="flex flex-wrap gap-2">
            {hasFilters && <button onClick={clear} className="btn btn-ghost"><FilterX size={16} aria-hidden />Clear filters</button>}
            <a href={exportHref} className="btn btn-ghost"><Download size={16} aria-hidden />Export CSV</a>
            <button onClick={() => setForm("new")} className="btn btn-primary"><Plus size={16} aria-hidden />{copy.add}</button></div>
        </div>
      </div>
      <p className="text-sm text-muted">Total for this view <strong className={`text-base tabular-nums ${tone}`}>{formatBDT(data.totalAmountMinor)}</strong> from {data.total} {data.total === 1 ? "entry" : "entries"}</p>
      <DataTable columns={columns} rows={data.items} caption={`${copy.noun} entries`} loading={pending}
        empty={<><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Inbox aria-hidden /></span><p className="mt-4 font-semibold">{copy.empty}</p><p className="mt-1 text-muted">{copy.emptyHint}</p></>} />
      <Pagination page={data.page} total={data.total} limit={data.limit} onPage={(p) => update({ page: p > 1 ? p : "" })} />
      {form && <TransactionForm kind={kind} tx={form === "new" ? null : form} accounts={accounts} categories={categories} onClose={() => setForm(null)} onSaved={refresh} />}
      {del && (<Dialog title={`Delete this ${copy.noun}?`} onClose={() => setDel(null)}>
        <p className="text-muted"><b className="text-ink">{del.title}</b> for {formatBDT(del.amountMinor)} will be removed and the account balance corrected. A reversal stays in the account history.</p>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setDel(null)} className="btn btn-ghost">Cancel</button><button onClick={() => remove(del)} className="btn btn-danger">Delete {copy.noun}</button></div></Dialog>)}
    </div>
  );
}
