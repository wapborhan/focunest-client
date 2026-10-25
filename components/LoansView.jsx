"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import Dialog from "./Dialog";
import { api } from "@/lib/client-api";
import { toMinor, formatBDT } from "@/lib/money";
import { dhakaToday, formatDhaka } from "@/lib/dates";

const COPY = {
  lent: { tab: "Money lent", person: "Borrower's name", add: "Add lending", out: "Paid from", back: "Collect repayment", backIn: "Received in", noun: "lending" },
  borrowed: { tab: "Money borrowed", person: "Lender's name", add: "Add borrowing", out: "Received in", back: "Repay", backIn: "Paid from", noun: "borrowing" },
};
const STATUS = { outstanding: "Outstanding", partial: "Partially repaid", repaid: "Repaid" };
const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const Err = ({ e }) => (e ? <p role="alert" className="mt-1 text-sm text-red-700">{e.message}</p> : null);
const amt = z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const detailsErr = (e, setError, map = {}) => Object.entries(e.details ?? {}).forEach(([k, m]) => setError(map[k] ?? k, { message: m[0] }));

export function LoanForm({ direction, accounts, onClose, onSaved }) {
  const c = COPY[direction]; const key = useRef(crypto.randomUUID());
  const schema = z.object({ counterparty: z.string().trim().min(1, "Enter a name").max(80), phone: z.string().trim().regex(/^(\+?[\d\s-]{6,19})?$/, "Enter a valid phone number"), amount: amt, accountId: z.string().min(1, "Choose an account"), date: day, dueDate: z.string(), notes: z.string().trim().max(500) })
    .refine((v) => !v.dueDate || v.dueDate >= v.date, { path: ["dueDate"], message: "Due date can't be before the loan date" });
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { counterparty: "", phone: "", amount: "", accountId: accounts[0]?.id ?? "", date: dhakaToday(), dueDate: "", notes: "" } });
  async function submit(v) {
    try {
      await api("/api/loans", { method: "POST", body: { direction, counterparty: v.counterparty, phone: v.phone || undefined, principalMinor: toMinor(v.amount), accountId: v.accountId, date: v.date, dueDate: v.dueDate || undefined, notes: v.notes || undefined, idempotencyKey: key.current } });
      toast.success("Saved"); onSaved();
    } catch (e) { detailsErr(e, setError, { principalMinor: "amount" }); toast.error(e.message); }
  }
  if (!accounts.length) return <Dialog title={c.add} onClose={onClose}><p>Add an account first, then record the {c.noun}.</p></Dialog>;
  return (
    <Dialog title={c.add} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
        <label className="block">{c.person}<input className={field} {...register("counterparty")} /><Err e={errors.counterparty} /></label>
        <label className="block">Phone <span className="text-muted">(optional)</span><input type="tel" className={field} {...register("phone")} /><Err e={errors.phone} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Amount (BDT)<input type="number" step="0.01" inputMode="decimal" className={field} {...register("amount")} /><Err e={errors.amount} /></label>
          <label className="block">{c.out}<select className={field} {...register("accountId")}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><Err e={errors.accountId} /></label>
          <label className="block">Date<input type="date" className={field} {...register("date")} /><Err e={errors.date} /></label>
          <label className="block">Expected repayment<input type="date" className={field} {...register("dueDate")} /><Err e={errors.dueDate} /></label>
        </div>
        <label className="block">Purpose or notes<textarea rows={2} className={field} {...register("notes")} /></label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-black/5">Cancel</button>
          <button disabled={isSubmitting} className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">{isSubmitting ? "Saving…" : c.add}</button></div>
      </form>
    </Dialog>
  );
}

function RepayForm({ loan, accounts, onClose, onSaved }) {
  const c = COPY[loan.direction]; const key = useRef(crypto.randomUUID());
  const schema = z.object({ amount: amt.refine((n) => toMinor(n) <= loan.outstandingMinor, `At most ${formatBDT(loan.outstandingMinor)}`), accountId: z.string().min(1, "Choose an account"), date: day, note: z.string().trim().max(500) });
  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { amount: "", accountId: accounts[0]?.id ?? "", date: dhakaToday(), note: "" } });
  async function submit(v) {
    try { await api(`/api/loans/${loan.id}/repayments`, { method: "POST", body: { amountMinor: toMinor(v.amount), accountId: v.accountId, date: v.date, note: v.note || undefined, idempotencyKey: key.current } }); toast.success("Repayment recorded"); onSaved(); }
    catch (e) { detailsErr(e, setError, { amountMinor: "amount" }); toast.error(e.message); }
  }
  return (
    <Dialog title={`${c.back}: ${loan.counterparty}`} onClose={onClose}>
      <p className="mb-3 text-muted">Outstanding {formatBDT(loan.outstandingMinor)}</p>
      <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
        <label className="block">Amount (BDT)<input type="number" step="0.01" inputMode="decimal" className={field} {...register("amount")} /><Err e={errors.amount} /></label>
        <button type="button" onClick={() => setValue("amount", loan.outstandingMinor / 100)} className="text-sm text-brand underline">Pay the full outstanding amount</button>
        <label className="block">{c.backIn}<select className={field} {...register("accountId")}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatBDT(a.balanceMinor)})</option>)}</select><Err e={errors.accountId} /></label>
        <label className="block">Date<input type="date" className={field} {...register("date")} /><Err e={errors.date} /></label>
        <label className="block">Note <span className="text-muted">(optional)</span><input className={field} {...register("note")} /></label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-black/5">Cancel</button>
          <button disabled={isSubmitting} className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">{isSubmitting ? "Saving…" : c.back}</button></div>
      </form>
    </Dialog>
  );
}

function Details({ id, onClose }) {
  const [l, setL] = useState(null);
  useEffect(() => { api(`/api/loans/${id}`).then(setL).catch((e) => { toast.error(e.message); onClose(); }); }, [id, onClose]);
  return (
    <Dialog title={l ? l.counterparty : "Loading…"} onClose={onClose}>
      {l && (<div className="space-y-3 text-sm">
        <p className="text-muted">{[l.phone, `${COPY[l.direction].noun} on ${formatDhaka(l.date)}`, l.dueDate && `due ${formatDhaka(l.dueDate)}`].filter(Boolean).join(" · ")}</p>
        {l.notes && <p>{l.notes}</p>}
        <dl className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-black/5 p-2"><dt className="text-muted">Principal</dt><dd className="font-semibold">{formatBDT(l.principalMinor)}</dd></div>
          <div className="rounded-lg bg-black/5 p-2"><dt className="text-muted">Repaid</dt><dd className="font-semibold">{formatBDT(l.repaidMinor)}</dd></div>
          <div className="rounded-lg bg-black/5 p-2"><dt className="text-muted">Outstanding</dt><dd className="font-semibold">{formatBDT(l.outstandingMinor)}</dd></div></dl>
        <h3 className="font-semibold">Repayment history</h3>
        {l.repayments.length === 0 ? <p className="text-muted">No repayments yet.</p> : <ul className="divide-y divide-line">{l.repayments.map((r) => (<li key={r.id} className="flex justify-between py-2"><span>{formatDhaka(r.date)} · {r.accountName}{r.note && <span className="text-muted"> · {r.note}</span>}</span><span className="font-medium">{formatBDT(r.amountMinor)}</span></li>))}</ul>}
      </div>)}
    </Dialog>
  );
}

export default function LoansView() {
  const [direction, setDirection] = useState("lent"); const c = COPY[direction];
  const [filters, setFilters] = useState({ status: "", q: "", dueFrom: "", dueTo: "", overdue: "" }); const [page, setPage] = useState(1);
  const [data, setData] = useState(null); const [error, setError] = useState(null); const [accounts, setAccounts] = useState([]);
  const [dialog, setDialog] = useState(null);   // {type:"new"} | {type:"repay", loan} | {type:"details", id}
  const set = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const params = useMemo(() => { const p = new URLSearchParams({ direction, page, limit: 12 }); Object.entries(filters).forEach(([k, v]) => v && p.set(k, v)); return p.toString(); }, [direction, filters, page]);
  const load = useCallback(async () => { setError(null); try { setData(await api(`/api/loans?${params}`)); } catch (e) { setError(e.message); } }, [params]);
  useEffect(() => { load(); }, [load]);
  const loadAccounts = useCallback(() => api("/api/accounts").then((r) => setAccounts(r.items)).catch(() => {}), []);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  const saved = () => { setDialog(null); load(); loadAccounts(); };
  const closeDialog = useCallback(() => setDialog(null), []);
  const s = data?.summary; const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const cards = [["Lent, still owed to you", s?.lentOutstandingMinor, "text-brand"], ["Borrowed, still owed by you", s?.borrowedOutstandingMinor, "text-red-700"], ["Overdue", s?.overdueCount, s?.overdueCount ? "text-red-700" : ""]];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">{cards.map(([l, v, cl]) => (<div key={l} className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{l}</p>{v === undefined ? <div className="mt-1 h-6 animate-pulse rounded bg-black/5" /> : <p className={`text-lg font-semibold ${cl}`}>{l === "Overdue" ? `${v} ${v === 1 ? "loan" : "loans"}` : formatBDT(v)}</p>}</div>))}</div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Loan type" className="flex rounded-lg border border-line bg-white p-1">{Object.entries(COPY).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={direction === k} onClick={() => { setDirection(k); setPage(1); }} className={`rounded-md px-4 py-1.5 ${direction === k ? "bg-brand text-white" : "hover:bg-black/5"}`}>{v.tab}</button>))}</div>
        <button onClick={() => setDialog({ type: "new" })} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white"><Plus size={16} />{c.add}</button>
      </div>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white p-3 text-sm">
        <label className="min-w-40 flex-1">Person<input type="search" className={`${field} mt-0`} value={filters.q} onChange={(e) => set("q", e.target.value)} /></label>
        <label>Status<select className={`${field} mt-0`} value={filters.status} onChange={(e) => set("status", e.target.value)}><option value="">All</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Due from<input type="date" className={`${field} mt-0`} value={filters.dueFrom} onChange={(e) => set("dueFrom", e.target.value)} /></label>
        <label>Due to<input type="date" className={`${field} mt-0`} value={filters.dueTo} onChange={(e) => set("dueTo", e.target.value)} /></label>
        <label className="flex items-center gap-2 pb-2"><input type="checkbox" checked={filters.overdue === "true"} onChange={(e) => set("overdue", e.target.checked ? "true" : "")} />Overdue only</label>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">{error} <button onClick={load} className="font-medium underline">Retry</button></div>}
      {!data && !error && <div className="space-y-2" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-black/5" />)}</div>}
      {data?.items.length === 0 && <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center"><p className="font-medium">No {c.noun} records match</p><p className="text-muted">Add one, or clear the filters.</p></div>}
      <ul className="grid gap-3 md:grid-cols-2">{data?.items.map((l) => { const pct = Math.min(100, Math.round((l.repaidMinor / l.principalMinor) * 100)); return (
        <li key={l.id} className={`rounded-xl border bg-white p-4 ${l.overdue ? "border-red-300" : "border-line"}`}>
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><button onClick={() => setDialog({ type: "details", id: l.id })} className="font-semibold text-brand hover:underline">{l.counterparty}</button>
            <p className="text-sm text-muted">{formatDhaka(l.date)}{l.dueDate && ` · due ${formatDhaka(l.dueDate)}`}</p></div>
            <div className="flex flex-col items-end gap-1"><span className="rounded bg-black/5 px-2 py-0.5 text-xs">{STATUS[l.status]}</span>{l.overdue && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Overdue</span>}</div></div>
          <dl className="mt-3 grid grid-cols-3 text-sm"><div><dt className="text-muted">Principal</dt><dd>{formatBDT(l.principalMinor)}</dd></div><div><dt className="text-muted">Repaid</dt><dd>{formatBDT(l.repaidMinor)}</dd></div><div><dt className="text-muted">Outstanding</dt><dd className="font-semibold">{formatBDT(l.outstandingMinor)}</dd></div></dl>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Repaid" className="mt-3 h-2 overflow-hidden rounded bg-black/10"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
          {l.status !== "repaid" && <button onClick={() => setDialog({ type: "repay", loan: l })} className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-black/5">{c.back}</button>}
        </li>); })}</ul>
      {pages > 1 && <div className="flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg px-4 py-2 hover:bg-black/5 disabled:opacity-40">Previous</button><span className="text-sm text-muted">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg px-4 py-2 hover:bg-black/5 disabled:opacity-40">Next</button></div>}
      {dialog?.type === "new" && <LoanForm direction={direction} accounts={accounts} onClose={closeDialog} onSaved={saved} />}
      {dialog?.type === "repay" && <RepayForm loan={dialog.loan} accounts={accounts} onClose={closeDialog} onSaved={saved} />}
      {dialog?.type === "details" && <Details id={dialog.id} onClose={closeDialog} />}
    </div>
  );
}
