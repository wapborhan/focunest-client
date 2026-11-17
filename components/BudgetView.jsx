"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Ban, ChevronLeft, ChevronRight, Pencil, PiggyBank, Plus, Target, TrendingDown, Wallet } from "lucide-react";
import BudgetBar, { StatusBadge } from "./BudgetBar";
import BudgetForm from "./BudgetForm";
import Dialog from "./Dialog";
import DataTable from "./ui/DataTable";
import StatCard from "./ui/StatCard";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";
import { fmtMonth, shiftMonth } from "@/lib/dates";
import { useUrlFilters } from "@/lib/use-url-filters";

/** One sentence about pace: what you can spend per day, where this month is heading, or how a past month ended. */
export function paceText(d) {
  const o = d.overall; if (!o) return "";
  if (d.month < d.currentMonth) return `Final result: ${formatBDT(o.spentMinor)} spent of ${formatBDT(o.budgetMinor)}.`;
  if (d.month > d.currentMonth) return `Planned for ${fmtMonth(d.month)}.`;
  const head = o.remainingMinor < 0 ? `You are ${formatBDT(-o.remainingMinor)} over budget.` : `You can spend about ${formatBDT(Math.floor(o.remainingMinor / (d.daysLeft + 1)))} a day for the rest of the month.`;
  const diff = o.projectedMinor - o.budgetMinor;
  return `${head} At this pace you will spend ${formatBDT(o.projectedMinor)}${diff > 0 ? `, ${formatBDT(diff)} over.` : "."}`;
}

export default function BudgetView({ data: d }) {
  const router = useRouter(); const { update, pending } = useUrlFilters();
  const [form, setForm] = useState(null); const [stop, setStop] = useState(null);   // form: { target } · stop: { name, categoryId }
  const o = d.overall, isCurrent = d.month === d.currentMonth;
  const go = (m) => update({ month: m === d.currentMonth ? "" : m });
  const over = d.overCount + (o?.source === "total" && o.status === "over" ? 1 : 0);
  async function confirmStop() {
    try { await api(`/api/budgets?month=${d.month}${stop.categoryId ? `&categoryId=${stop.categoryId}` : ""}`, { method: "DELETE" }); toast.success("Budget stopped"); setStop(null); router.refresh(); }
    catch (e) { toast.error(e.message); setStop(null); }
  }
  const columns = [
    { key: "c", header: "Category", role: "title", cell: (l) => (<><span className="font-medium">{l.nameEn}</span>{l.archived && <span className="badge ml-2 !bg-surface-3 !text-muted">Archived</span>}{l.nameBn && <span className="block text-xs text-muted">{l.nameBn}</span>}</>) },
    { key: "b", header: "Budget", align: "right", nowrap: true, cell: (l) => (l.budgetMinor == null ? <span className="text-muted">No budget</span> : <span className="tabular-nums">{formatBDT(l.budgetMinor)}</span>) },
    { key: "s", header: "Spent", align: "right", role: "amount", nowrap: true, cell: (l) => <span className="font-semibold tabular-nums">{formatBDT(l.spentMinor)}</span> },
    { key: "r", header: "Remaining", align: "right", nowrap: true, cell: (l) => (l.remainingMinor == null ? "—" : <span className={`tabular-nums ${l.remainingMinor < 0 ? "text-danger" : ""}`}>{l.remainingMinor < 0 ? `Over by ${formatBDT(-l.remainingMinor)}` : formatBDT(l.remainingMinor)}</span>) },
    { key: "u", header: "Used", cell: (l) => (l.budgetMinor == null ? <span className="text-muted">—</span> : (<div className="min-w-28"><span className="text-xs tabular-nums text-muted">{l.percent}%</span><BudgetBar percent={l.percent} status={l.status} label={`${l.nameEn} budget used`} className="mt-1" /></div>)) },
    { key: "st", header: "Status", cell: (l) => <StatusBadge status={l.status} /> },
    { key: "a", role: "actions", align: "right", cell: (l) => (l.budgetMinor == null
      ? <button onClick={() => setForm({ target: l.categoryId })} className="btn btn-ghost whitespace-nowrap !px-3 !py-1.5">Set budget</button>
      : <div className="flex justify-end gap-1"><button aria-label={`Edit ${l.nameEn} budget`} onClick={() => setForm({ target: l.categoryId })} className="icon-btn"><Pencil size={16} /></button>
        <button aria-label={`Stop ${l.nameEn} budget`} onClick={() => setStop({ name: l.nameEn, categoryId: l.categoryId })} className="icon-btn hover:!bg-danger-soft hover:!text-danger"><Ban size={16} /></button></div>) },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-sm">
          <button aria-label="Previous month" onClick={() => go(shiftMonth(d.month, -1))} className="icon-btn"><ChevronLeft size={18} /></button>
          <span aria-live="polite" className="min-w-40 px-2 text-center font-semibold">{fmtMonth(d.month)}</span>
          <button aria-label="Next month" onClick={() => go(shiftMonth(d.month, 1))} className="icon-btn"><ChevronRight size={18} /></button>
        </div>
        <div className="flex gap-2">{!isCurrent && <button onClick={() => go(d.currentMonth)} className="btn btn-ghost">This month</button>}
          <button onClick={() => setForm({ target: null })} className="btn btn-primary"><Plus size={16} aria-hidden />Set budget</button></div>
      </div>

      <div className={`grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 ${pending ? "opacity-60" : ""}`}>
        <StatCard i={0} icon={TrendingDown} title="Spent" value={formatBDT(d.totalSpentMinor)} note={fmtMonth(d.month)} />
        <StatCard i={1} icon={Target} title={o ? (o.source === "total" ? "Overall budget" : "Category budgets") : "Budget"} value={o ? formatBDT(o.budgetMinor) : "Not set"} note={o ? (o.source === "total" ? `Since ${fmtMonth(o.since)}` : "Sum of your category budgets") : "Set a limit to start tracking"} />
        <StatCard i={2} icon={Wallet} title={o && o.remainingMinor < 0 ? "Over by" : "Remaining"} value={o ? formatBDT(Math.abs(o.remainingMinor)) : "—"} tone={o ? (o.remainingMinor < 0 ? "text-danger" : "text-primary") : ""} />
        <StatCard i={3} icon={AlertTriangle} title="Over limit" value={`${over} ${over === 1 ? "budget" : "budgets"}`} tone={over ? "text-danger" : ""} note={d.unbudgetedSpentMinor > 0 ? `${formatBDT(d.unbudgetedSpentMinor)} spent with no budget` : undefined} />
      </div>

      {o ? (
        <section style={{ "--i": 4 }} className="card animate-fade-up p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">{o.source === "total" ? "Overall monthly budget" : "All category budgets together"}</h2><p className="text-sm text-muted">{formatBDT(o.spentMinor)} of {formatBDT(o.budgetMinor)} used · {o.percent}%</p></div>
            <div className="flex items-center gap-2"><StatusBadge status={o.status} />
              {o.source === "total" ? (<><button aria-label="Edit overall budget" onClick={() => setForm({ target: "total" })} className="icon-btn"><Pencil size={16} /></button>
                <button aria-label="Stop overall budget" onClick={() => setStop({ name: "The overall budget", categoryId: null })} className="icon-btn hover:!bg-danger-soft hover:!text-danger"><Ban size={16} /></button></>)
                : <button onClick={() => setForm({ target: "total" })} className="btn btn-ghost">Set an overall limit</button>}</div>
          </div>
          <BudgetBar percent={o.percent} status={o.status} label="Overall budget used" className="mt-4 !h-3" />
          <p className="mt-3 text-sm text-muted">{paceText(d)}</p>
        </section>
      ) : (
        <section style={{ "--i": 4 }} className="card animate-fade-up p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-primary"><PiggyBank aria-hidden /></span>
          <p className="mt-4 font-semibold">No budget for {fmtMonth(d.month)} yet</p>
          <p className="mx-auto mt-1 max-w-md text-muted">Set an overall monthly limit, or a limit for each category below. A budget carries forward every month until you change it.</p>
          <button onClick={() => setForm({ target: "total" })} className="btn btn-primary mt-4">Set an overall budget</button>
        </section>
      )}

      <div><h2 className="mb-3 font-semibold">Category budgets</h2>
        <DataTable columns={columns} rows={d.lines} rowKey={(l) => l.categoryId} caption={`Category budgets for ${fmtMonth(d.month)}`} loading={pending} /></div>

      {form && <BudgetForm data={d} target={form.target} onClose={() => setForm(null)} onSaved={() => { setForm(null); router.refresh(); }} />}
      {stop && (<Dialog title="Stop this budget?" onClose={() => setStop(null)}>
        <p className="text-muted"><b className="text-ink">{stop.name}</b> will have no budget from {fmtMonth(d.month)} onward. Earlier months keep it, and your spending is not affected.</p>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setStop(null)} className="btn btn-ghost">Cancel</button><button onClick={confirmStop} className="btn btn-danger">Stop budget</button></div></Dialog>)}
    </div>
  );
}
