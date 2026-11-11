"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Landmark, TrendingUp, TrendingDown, Wallet, Banknote, Building2, Smartphone } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import QuickAdd from "./QuickAdd";
import PeriodFilter from "./PeriodFilter";
import DataTable from "./ui/DataTable";
import StatCard from "./ui/StatCard";
import { AccountIcon } from "./ui/ProviderIcon";
import { accountMeta } from "@/lib/account-display";
import { formatBDT } from "@/lib/money";
import { loanHref } from "@/lib/loan-routes";
import { formatDhaka } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/tx-labels";
import { useUrlFilters } from "@/lib/use-url-filters";
import { useTheme } from "./ThemeProvider";
import { chartColors } from "@/lib/chart-colors";

const ACTIONS = [["income", "Add income", ArrowDownToLine], ["expense", "Add expense", ArrowUpFromLine], ["lent", "Add lending", HandCoins], ["borrowed", "Add borrowing", Landmark]];
const compact = new Intl.NumberFormat("en-BD", { notation: "compact", maximumFractionDigits: 1 });
const bdt = (v) => formatBDT(Math.round(v * 100));
const label = (p) => (p.length === 7 ? new Date(`${p}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }) : p.slice(8));
const FLOW = { in: ["+", "text-primary"], out: ["\u2212", "text-danger"], neutral: ["", "text-muted"] };
const Panel = ({ title, children, className = "", i = 0 }) => (<section style={{ "--i": i }} className={`card animate-fade-up p-4 sm:p-5 ${className}`}><h2 className="mb-3 font-semibold">{title}</h2>{children}</section>);

export default function DashboardView({ data: d, preset, accounts, categories }) {
  const router = useRouter(); const { resolved } = useTheme(); const C = chartColors(resolved === "dark"); const { update, pending } = useUrlFilters();
  const [action, setAction] = useState(null);
  const flow = d.cashFlow.map((s) => ({ name: label(s.period), full: s.period, Income: s.incomeMinor / 100, Expenses: s.expenseMinor / 100 }));
  const monthly = d.monthly.map((s) => ({ name: label(s.period), Net: s.netMinor / 100 }));
  const recentCols = [
    { key: "title", header: "Description", role: "title", cell: (t) => <span className="font-medium">{t.title}</span> },
    { key: "kind", header: "Type", cell: (t) => <span className="badge">{KIND_LABEL[t.kind]}</span> },
    { key: "date", header: "Date", nowrap: true, cell: (t) => formatDhaka(t.date) },
    { key: "acc", header: "Account", cell: (t) => t.accountName ?? "—" },
    { key: "amt", header: "Amount", align: "right", role: "amount", nowrap: true, cell: (t) => { const [sign, tone] = FLOW[t.flow]; return <span className={`font-semibold tabular-nums ${tone}`}>{sign}{formatBDT(t.amountMinor)}</span>; } },
  ];
  return (
    <div className="space-y-6">
      <PeriodFilter preset={preset} range={d.range} update={update} />
      <div className="flex flex-wrap gap-2">{ACTIONS.map(([k, l, Icon]) => <button key={k} onClick={() => setAction(k)} className="btn btn-ghost group"><Icon size={16} aria-hidden className="text-primary transition-transform group-hover:scale-110" />{l}</button>)}</div>
      <div className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 xl:grid-cols-4 ${pending ? "opacity-60" : ""}`}>
        <StatCard i={0} icon={TrendingUp} title="Total income" value={formatBDT(d.totals.incomeMinor)} tone="text-primary" note="Selected period" />
        <StatCard i={1} icon={TrendingDown} title="Total expenses" value={formatBDT(d.totals.expenseMinor)} tone="text-danger" note="Selected period" />
        <StatCard i={2} icon={Wallet} title="Total balance" value={formatBDT(d.balances.availableMinor)} tone={d.balances.availableMinor < 0 ? "text-danger" : ""} note="All accounts, right now" />
        <StatCard i={3} icon={Banknote} title="Cash balance" value={formatBDT(d.balances.cashMinor)} note="Right now" />
        <StatCard i={4} icon={Building2} title="Bank balance" value={formatBDT(d.balances.bankMinor)} note="Right now" />
        <StatCard i={5} icon={Smartphone} title="Mobile banking balance" value={formatBDT(d.balances.mobileMinor)} note="Right now" />
        <StatCard i={6} icon={HandCoins} title="Total lent" value={formatBDT(d.loans.lentOutstandingMinor)} note="Still owed to you" />
        <StatCard i={7} icon={Landmark} title="Total borrowed" value={formatBDT(d.loans.borrowedOutstandingMinor)} note="Still owed by you" />
      </div>
      <details className="text-sm text-muted"><summary className="w-fit rounded-lg px-1 transition hover:text-primary">How these figures are calculated</summary>
        <p className="mt-2 max-w-2xl">Income and expenses count only entries in the selected period. Total balance is your cash, bank and mobile banking balances added together, as of now. Total lent is what others still owe you, and total borrowed is what you still owe. Transfers, lending, borrowing and repayments move money around but are never counted as income or expenses.</p></details>
      <div className={`grid gap-4 transition-opacity lg:grid-cols-2 ${pending ? "opacity-60" : ""}`}>
        <Panel i={2} title="Income vs. expenses"><div role="img" aria-label={`Income ${formatBDT(d.totals.incomeMinor)} and expenses ${formatBDT(d.totals.expenseMinor)} over the selected period`} className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={flow} margin={{ left: -8, right: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} /><XAxis dataKey="name" fontSize={12} tick={{ fill: C.axis }} interval="preserveStartEnd" tickLine={false} axisLine={false} /><YAxis fontSize={12} tick={{ fill: C.axis }} tickFormatter={(v) => compact.format(v)} width={48} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => bdt(v)} labelFormatter={(_, p) => p?.[0]?.payload.full} cursor={{ fill: C.cursor }} contentStyle={C.tip} /><Legend iconType="circle" formatter={(v) => <span style={{ color: C.axis }}>{v}</span>} />
            <Bar dataKey="Income" fill={C.income} radius={[6, 6, 0, 0]} /><Bar dataKey="Expenses" fill={C.expense} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel i={3} title="Monthly cash flow, last 12 months"><div role="img" aria-label="Net income minus expenses for each of the last 12 months" className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ left: -8, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} /><XAxis dataKey="name" fontSize={12} tick={{ fill: C.axis }} interval="preserveStartEnd" tickLine={false} axisLine={false} /><YAxis fontSize={12} tick={{ fill: C.axis }} tickFormatter={(v) => compact.format(v)} width={48} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => bdt(v)} contentStyle={C.tip} /><ReferenceLine y={0} stroke={C.ref} strokeDasharray="4 4" /><Line type="monotone" dataKey="Net" stroke={C.income} strokeWidth={3} dot={{ r: 3, fill: C.income }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><h2 className="mb-3 font-semibold">Recent transactions</h2>
          <DataTable columns={recentCols} rows={d.recent} caption="Recent transactions" loading={pending} empty={<><p className="font-semibold">Nothing recorded yet</p><p className="mt-1 text-muted">Add income or an expense to get started.</p></>} /></div>
        <div className="space-y-4">
          <Panel i={4} title="Accounts">{d.accounts.length === 0 && <p className="text-muted">No accounts yet. <Link href="/cash/accounts" className="text-primary underline">Add one</Link>.</p>}
            <ul className="divide-y divide-line">{d.accounts.map((a) => (<li key={a.id} className="flex items-center justify-between gap-3 py-2.5"><span className="flex min-w-0 items-center gap-3"><AccountIcon account={a} size={32} /><span className="min-w-0"><Link href={`/cash/accounts/${a.id}`} className="block truncate font-medium hover:text-primary">{accountMeta(a).title}</Link><span className="block truncate text-xs text-muted">{accountMeta(a).sub}</span></span></span><span className={`font-semibold tabular-nums ${a.balanceMinor < 0 ? "text-danger" : ""}`}>{formatBDT(a.balanceMinor)}</span></li>))}</ul></Panel>
          <Panel i={5} title="Upcoming repayments and receivables">{d.upcoming.length === 0 && <p className="text-muted">Nothing due in the next 30 days.</p>}
            <ul className="space-y-3">{d.upcoming.map((l) => (<li key={l.id} className="text-sm"><div className="flex justify-between gap-2"><Link href={loanHref(l)} className="truncate font-medium hover:text-primary">{l.counterparty}</Link><span className="font-semibold tabular-nums">{formatBDT(l.outstandingMinor)}</span></div>
              <p className={l.overdue ? "text-danger" : "text-muted"}>{l.direction === "lent" ? "They owe you" : "You owe"} · {l.overdue ? "Overdue since" : "Due"} {formatDhaka(l.dueDate)}</p></li>))}</ul></Panel>
        </div>
      </div>
      {action && <QuickAdd action={action} accounts={accounts} categories={categories} onClose={() => setAction(null)} onSaved={() => { setAction(null); router.refresh(); }} />}
    </div>
  );
}
