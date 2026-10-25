"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import TransactionForm from "./TransactionForm";
import Dialog from "./Dialog";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";
import { KIND_COPY } from "@/lib/tx-labels";

const SORTS = { "date:desc": "Newest first", "date:asc": "Oldest first", "amount:desc": "Highest amount", "amount:asc": "Lowest amount" };
const input = "rounded-lg border border-line bg-white px-3 py-2";

export default function TransactionsView({ kind }) {
  const copy = KIND_COPY[kind]; const sign = kind === "income" ? "text-brand" : "text-red-700";
  const [filters, setFilters] = useState({ from: "", to: "", categoryId: "", accountId: "", q: "", sort: "date", dir: "desc" });
  const [qInput, setQInput] = useState(""); const [page, setPage] = useState(1);
  const [data, setData] = useState(null); const [totals, setTotals] = useState(null); const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]); const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null); const [del, setDel] = useState(null);
  const set = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  useEffect(() => { const t = setTimeout(() => set("q", qInput.trim()), 300); return () => clearTimeout(t); }, [qInput]);
  const params = useMemo(() => { const p = new URLSearchParams({ kind }); Object.entries(filters).forEach(([k, v]) => v && p.set(k, v)); return p.toString(); }, [kind, filters]);

  const loadRefs = useCallback(async () => {
    const [a, c] = await Promise.all([api("/api/accounts"), api(`/api/categories?kind=${kind}`)]);
    setAccounts(a.items); setCategories(c.items);
  }, [kind]);
  const loadList = useCallback(async () => {
    setError(null);
    try { setData(await api(`/api/transactions?${params}&page=${page}&limit=15`)); } catch (e) { setError(e.message); }
  }, [params, page]);
  const loadTotals = useCallback(() => api(`/api/transactions/totals?kind=${kind}`).then(setTotals).catch(() => {}), [kind]);
  useEffect(() => { loadRefs().catch((e) => setError(e.message)); loadTotals(); }, [loadRefs, loadTotals]);
  useEffect(() => { loadList(); }, [loadList]);
  const refresh = () => { loadList(); loadTotals(); };

  async function remove(t) {
    try { await api(`/api/transactions/${t.id}`, { method: "DELETE" }); toast.success("Deleted"); setDel(null); refresh(); }
    catch (e) { toast.error(e.message); setDel(null); }
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const cards = totals ? [["Today", totals.today], ["This month", totals.month], ["This year", totals.year]] : [];
  const actions = (t) => (<div className="flex justify-end gap-1">
    <button aria-label={`Edit ${t.title}`} onClick={() => setForm(t)} className="rounded-lg p-2 hover:bg-black/5"><Pencil size={16} /></button>
    <button aria-label={`Delete ${t.title}`} onClick={() => setDel(t)} className="rounded-lg p-2 hover:bg-black/5"><Trash2 size={16} /></button></div>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">{(cards.length ? cards : [["Today"], ["This month"], ["This year"]]).map(([l, v]) => (
        <div key={l} className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{l}</p>{v === undefined ? <div className="mt-1 h-6 animate-pulse rounded bg-black/5" /> : <p className={`text-lg font-semibold ${sign}`}>{formatBDT(v)}</p>}</div>))}</div>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white p-3">
        <label className="text-sm">From<input type="date" className={`${input} block`} value={filters.from} onChange={(e) => set("from", e.target.value)} /></label>
        <label className="text-sm">To<input type="date" className={`${input} block`} value={filters.to} onChange={(e) => set("to", e.target.value)} /></label>
        <label className="text-sm">Category<select className={`${input} block`} value={filters.categoryId} onChange={(e) => set("categoryId", e.target.value)}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}</select></label>
        <label className="text-sm">Account<select className={`${input} block`} value={filters.accountId} onChange={(e) => set("accountId", e.target.value)}><option value="">All</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="text-sm">Sort<select className={`${input} block`} value={`${filters.sort}:${filters.dir}`} onChange={(e) => { const [s, d] = e.target.value.split(":"); setFilters((f) => ({ ...f, sort: s, dir: d })); setPage(1); }}>{Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="min-w-40 flex-1 text-sm">Search<input type="search" placeholder="Title, note or reference" className={`${input} block w-full`} value={qInput} onChange={(e) => setQInput(e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted">{data ? <>Total for this view <strong className={sign}>{formatBDT(data.totalAmountMinor)}</strong> from {data.total} {data.total === 1 ? "entry" : "entries"}</> : "\u00a0"}</p>
        <div className="flex gap-2">
          <a href={`/api/transactions/export?${params}`} className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2"><Download size={16} />Export CSV</a>
          <button onClick={() => setForm("new")} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white"><Plus size={16} />{copy.add}</button>
        </div>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">{error} <button onClick={refresh} className="font-medium underline">Retry</button></div>}
      {!data && !error && <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-black/5" />)}</div>}
      {data?.items.length === 0 && <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center"><p className="font-medium">{copy.empty}</p><p className="text-muted">{copy.emptyHint}</p></div>}
      {data?.items.length > 0 && (<>
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
          <table className="w-full text-left text-sm"><caption className="sr-only">{copy.noun} entries</caption>
            <thead className="border-b border-line text-muted"><tr><th className="p-3">Date</th><th className="p-3">{copy.titleLabel}</th><th className="p-3">Category</th><th className="p-3">Account</th><th className="p-3 text-right">Amount</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{data.items.map((t) => (<tr key={t.id} className="border-b border-line last:border-0">
              <td className="whitespace-nowrap p-3">{formatDhaka(t.date)}</td><td className="p-3">{t.title}{t.reference && <span className="block text-xs text-muted">Ref {t.reference}</span>}</td>
              <td className="p-3">{t.categoryName}</td><td className="p-3">{t.accountName}</td><td className={`whitespace-nowrap p-3 text-right font-medium ${sign}`}>{formatBDT(t.amountMinor)}</td><td className="p-3">{actions(t)}</td></tr>))}</tbody></table>
        </div>
        <ul className="space-y-2 md:hidden">{data.items.map((t) => (<li key={t.id} className="rounded-xl border border-line bg-white p-3">
          <div className="flex justify-between gap-2"><p className="font-medium">{t.title}</p><p className={`font-semibold ${sign}`}>{formatBDT(t.amountMinor)}</p></div>
          <p className="text-sm text-muted">{formatDhaka(t.date)} · {t.categoryName} · {t.accountName}</p>{actions(t)}</li>))}</ul>
      </>)}
      {pages > 1 && <div className="flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg px-4 py-2 hover:bg-black/5 disabled:opacity-40">Previous</button><span className="text-sm text-muted">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg px-4 py-2 hover:bg-black/5 disabled:opacity-40">Next</button></div>}
      {form && <TransactionForm kind={kind} tx={form === "new" ? null : form} accounts={accounts} categories={categories} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); loadRefs(); }} onCategoryAdded={loadRefs} />}
      {del && (<Dialog title={`Delete this ${copy.noun}?`} onClose={() => setDel(null)}>
        <p className="text-muted">{del.title} for {formatBDT(del.amountMinor)} will be removed and the account balance corrected. A reversal stays in the account history.</p>
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setDel(null)} className="rounded-lg px-4 py-2 hover:bg-black/5">Cancel</button><button onClick={() => remove(del)} className="rounded-lg bg-red-700 px-4 py-2 font-medium text-white">Delete {copy.noun}</button></div>
      </Dialog>)}
    </div>
  );
}
