"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Landmark, ArrowLeftRight, TrendingUp, TrendingDown, Banknote, Building2, Smartphone, Scale, Gem } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import QuickAdd from "./QuickAdd";
import DatePicker from "./ui/DatePicker";
import DataTable from "./ui/DataTable";
import StatCard from "./ui/StatCard";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/tx-labels";
import { useUrlFilters } from "@/lib/use-url-filters";

const PRESETS = [["today", "Today"], ["week", "This week"], ["month", "This month"], ["year", "This year"], ["custom", "Custom"]];
const ACTIONS = [["income", "Add income", ArrowDownToLine], ["expense", "Add expense", ArrowUpFromLine], ["lent", "Add lending", HandCoins], ["borrowed", "Add borrowing", Landmark], ["transfer", "Transfer money", ArrowLeftRight]];
const compact = new Intl.NumberFormat("en-BD", { notation: "compact", maximumFractionDigits: 1 });
const bdt = (v) => formatBDT(Math.round(v * 100));
const label = (p) => (p.length === 7 ? new Date(`${p}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }) : p.slice(8));
const TYPE = { cash: "Cash", bank: "Bank", mobile: "Mobile banking" };
const FLOW = { in: ["+", "text-brand"], out: ["\u2212", "text-red-600"], neutral: ["", "text-muted"] };
const Panel = ({ title, children, className = "", i = 0 }) => (<section style={{ "--i": i }} className={`card animate-fade-up p-4 sm:p-5 ${className}`}><h2 className="mb-3 font-semibold">{title}</h2>{children}</section>);

export default function DashboardView({ data: d, preset, accounts, categories }) {
  const router = useRouter(); const { update, pending } = useUrlFilters();
  const [action, setAction] = useState(null); const [custom, setCustom] = useState({ from: d.range.from, to: d.range.to });
  const setCustomRange = (patch) => { const next = { ...custom, ...patch }; setCustom(next); if (next.from && next.to && next.from <= next.to) update({ preset: "custom", from: next.from, to: next.to }); };
  const flow = d.cashFlow.map((s) => ({ name: label(s.period), full: s.period, Income: s.incomeMinor / 100, Expenses: s.expenseMinor / 100 }));
  const monthly = d.monthly.map((s) => ({ name: label(s.period), Net: s.netMinor / 100 }));
  const b = d.balances;
  const recentCols = [
    { key: "title", header: "Description", role: "title", cell: (t) => <span className="font-medium">{t.title}</span> },
    { key: "kind", header: "Type", cell: (t) => <span className="badge">{KIND_LABEL[t.kind]}</span> },
    { key: "date", header: "Date", nowrap: true, cell: (t) => formatDhaka(t.date) },
    { key: "acc", header: "Account", cell: (t) => t.accountName ?? "—" },
    { key: "amt", header: "Amount", align: "right", role: "amount", nowrap: true, cell: (t) => { const [sign, tone] = FLOW[t.flow]; return <span className={`font-semibold tabular-nums ${tone}`}>{sign}{formatBDT(t.amountMinor)}</span>; } },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Date range" className="flex max-w-full overflow-x-auto rounded-2xl border border-line bg-white p-1 shadow-sm">
          {PRESETS.map(([k, l]) => <button key={k} aria-pressed={preset === k} onClick={() => k === "custom" ? update({ preset: "custom", from: custom.from, to: custom.to }) : update({ preset: k, from: "", to: "" })}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${preset === k ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-brand"}`}>{l}</button>)}</div>
        <p className="text-sm text-muted">{formatDhaka(d.range.from)} – {formatDhaka(d.range.to)}</p>
      </div>
      {preset === "custom" && <div className="card animate-fade-up grid max-w-md grid-cols-2 gap-3 p-4"><div><span className="lbl">From</span><DatePicker aria-label="From date" value={custom.from} max={custom.to} onChange={(v) => setCustomRange({ from: v })} /></div><div><span className="lbl">To</span><DatePicker aria-label="To date" value={custom.to} min={custom.from} onChange={(v) => setCustomRange({ to: v })} /></div></div>}
      <div className="flex flex-wrap gap-2">{ACTIONS.map(([k, l, Icon]) => <button key={k} onClick={() => setAction(k)} className="btn btn-ghost group"><Icon size={16} aria-hidden className="text-brand transition-transform group-hover:scale-110" />{l}</button>)}</div>
      <div className={`grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 ${pending ? "opacity-60" : ""}`}>
        <StatCard i={0} icon={TrendingUp} title="Total income" value={formatBDT(d.totals.incomeMinor)} tone="text-brand" note="Selected period" />
        <StatCard i={1} icon={TrendingDown} title="Total expenses" value={formatBDT(d.totals.expenseMinor)} tone="text-red-600" note="Selected period" />
        <StatCard i={2} icon={Banknote} title="Cash balance" value={formatBDT(b.cashMinor)} note="Right now" />
        <StatCard i={3} icon={Building2} title="Bank balance" value={formatBDT(b.bankMinor)} note="Right now" />
        <StatCard i={4} icon={Smartphone} title="Mobile banking" value={formatBDT(b.mobileMinor)} note="Right now" />
        <StatCard i={5} icon={HandCoins} title="Money lent" value={formatBDT(d.loans.lentOutstandingMinor)} note="Still owed to you" />
        <StatCard i={6} icon={Scale} title="Money borrowed" value={formatBDT(d.loans.borrowedOutstandingMinor)} note="Still owed by you" />
        <StatCard i={7} icon={Gem} title="Net worth" value={formatBDT(d.netWorthMinor)} tone={d.netWorthMinor < 0 ? "text-red-600" : "text-brand"} note={`In accounts ${formatBDT(b.availableMinor)}`} />
      </div>
      <details className="text-sm text-muted"><summary className="w-fit rounded-lg px-1 transition hover:text-brand">How these figures are calculated</summary>
        <p className="mt-2 max-w-2xl">Income and expenses count only entries in the selected period. Balances are as of now. Net worth is your account balances plus money owed to you, minus money you owe. Transfers, lending, borrowing and repayments move money around but are never counted as income or expenses.</p></details>
      <div className={`grid gap-4 transition-opacity lg:grid-cols-2 ${pending ? "opacity-60" : ""}`}>
        <Panel i={2} title="Income vs. expenses"><div role="img" aria-label={`Income ${formatBDT(d.totals.incomeMinor)} and expenses ${formatBDT(d.totals.expenseMinor)} over the selected period`} className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={flow} margin={{ left: -8, right: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8e5" /><XAxis dataKey="name" fontSize={12} interval="preserveStartEnd" tickLine={false} axisLine={false} /><YAxis fontSize={12} tickFormatter={(v) => compact.format(v)} width={48} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => bdt(v)} labelFormatter={(_, p) => p?.[0]?.payload.full} cursor={{ fill: "rgba(15,118,110,.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8e5" }} /><Legend iconType="circle" />
            <Bar dataKey="Income" fill="#0f766e" radius={[6, 6, 0, 0]} /><Bar dataKey="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel i={3} title="Monthly cash flow, last 12 months"><div role="img" aria-label="Net income minus expenses for each of the last 12 months" className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ left: -8, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8e5" /><XAxis dataKey="name" fontSize={12} interval="preserveStartEnd" tickLine={false} axisLine={false} /><YAxis fontSize={12} tickFormatter={(v) => compact.format(v)} width={48} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => bdt(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8e5" }} /><ReferenceLine y={0} stroke="#94a3a0" strokeDasharray="4 4" /><Line type="monotone" dataKey="Net" stroke="#0f766e" strokeWidth={3} dot={{ r: 3, fill: "#0f766e" }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><h2 className="mb-3 font-semibold">Recent transactions</h2>
          <DataTable columns={recentCols} rows={d.recent} caption="Recent transactions" loading={pending} empty={<><p className="font-semibold">Nothing recorded yet</p><p className="mt-1 text-muted">Add income or an expense to get started.</p></>} /></div>
        <div className="space-y-4">
          <Panel i={4} title="Accounts">{d.accounts.length === 0 && <p className="text-muted">No accounts yet. <Link href="/cash/accounts" className="text-brand underline">Add one</Link>.</p>}
            <ul className="divide-y divide-line">{d.accounts.map((a) => (<li key={a.id} className="flex items-center justify-between gap-2 py-2.5"><span className="min-w-0"><Link href={`/cash/accounts/${a.id}`} className="block truncate font-medium hover:text-brand">{a.name}</Link><span className="text-xs text-muted">{TYPE[a.type]}</span></span><span className={`font-semibold tabular-nums ${a.balanceMinor < 0 ? "text-red-600" : ""}`}>{formatBDT(a.balanceMinor)}</span></li>))}</ul></Panel>
          <Panel i={5} title="Upcoming repayments and receivables">{d.upcoming.length === 0 && <p className="text-muted">Nothing due in the next 30 days.</p>}
            <ul className="space-y-3">{d.upcoming.map((l) => (<li key={l.id} className="text-sm"><div className="flex justify-between gap-2"><Link href={`/cash/lending-borrowing/${l.id}`} className="truncate font-medium hover:text-brand">{l.counterparty}</Link><span className="font-semibold tabular-nums">{formatBDT(l.outstandingMinor)}</span></div>
              <p className={l.overdue ? "text-red-600" : "text-muted"}>{l.direction === "lent" ? "They owe you" : "You owe"} · {l.overdue ? "Overdue since" : "Due"} {formatDhaka(l.dueDate)}</p></li>))}</ul></Panel>
        </div>
      </div>
      {action && <QuickAdd action={action} accounts={accounts} categories={categories} onClose={() => setAction(null)} onSaved={() => { setAction(null); router.refresh(); }} />}
    </div>
  );
}
