"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Landmark, ArrowLeftRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import QuickAdd from "./QuickAdd";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";
import { formatDhaka, presetRange } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/tx-labels";

const PRESETS = [["today", "Today"], ["week", "This week"], ["month", "This month"], ["year", "This year"], ["custom", "Custom"]];
const ACTIONS = [["income", "Add income", ArrowDownToLine], ["expense", "Add expense", ArrowUpFromLine], ["lent", "Add lending", HandCoins], ["borrowed", "Add borrowing", Landmark], ["transfer", "Transfer money", ArrowLeftRight]];
const compact = new Intl.NumberFormat("en-BD", { notation: "compact", maximumFractionDigits: 1 });
const bdt = (v) => formatBDT(Math.round(v * 100));
const label = (p) => (p.length === 7 ? new Date(`${p}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }) : p.slice(8));
const TYPE = { cash: "Cash", bank: "Bank", mobile: "Mobile banking" };
const FLOW_STYLE = { in: ["+", "text-brand"], out: ["\u2212", "text-red-700"], neutral: ["", "text-muted"] };

function Card({ title, value, note, tone = "" }) {
  return (<div className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{title}</p>
    {value === undefined ? <div className="mt-1 h-7 animate-pulse rounded bg-black/5" /> : <p className={`text-xl font-semibold ${tone}`}>{value}</p>}{note && <p className="mt-1 text-xs text-muted">{note}</p>}</div>);
}
const Panel = ({ title, children, className = "" }) => (<section className={`rounded-xl border border-line bg-white p-4 ${className}`}><h2 className="mb-3 font-semibold">{title}</h2>{children}</section>);

export default function DashboardView() {
  const [preset, setPreset] = useState("month"); const [custom, setCustom] = useState({ from: "", to: "" });
  const [d, setD] = useState(null); const [error, setError] = useState(null); const [action, setAction] = useState(null);
  const range = preset === "custom" ? custom : presetRange(preset);
  const valid = range.from && range.to && range.from <= range.to;
  const load = useCallback(async () => {
    if (!valid) return; setError(null);
    try { setD(await api(`/api/dashboard?from=${range.from}&to=${range.to}`)); } catch (e) { setError(e.message); }
  }, [range.from, range.to, valid]);
  useEffect(() => { load(); }, [load]);
  const closeAction = useCallback(() => setAction(null), []);

  const flow = d?.cashFlow.map((s) => ({ name: label(s.period), full: s.period, Income: s.incomeMinor / 100, Expenses: s.expenseMinor / 100 }));
  const monthly = d?.monthly.map((s) => ({ name: label(s.period), Net: s.netMinor / 100 }));
  const b = d?.balances;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
          {PRESETS.map(([k, l]) => <button key={k} aria-pressed={preset === k} onClick={() => setPreset(k)} className={`rounded-md px-3 py-1.5 text-sm ${preset === k ? "bg-brand text-white" : "hover:bg-black/5"}`}>{l}</button>)}</div>
        {preset === "custom" && (<div className="flex items-end gap-2 text-sm">
          <label>From<input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="mt-1 block rounded-lg border border-line bg-white px-3 py-1.5" /></label>
          <label>To<input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="mt-1 block rounded-lg border border-line bg-white px-3 py-1.5" /></label></div>)}
        {valid && <p className="text-sm text-muted">{formatDhaka(range.from)} to {formatDhaka(range.to)}</p>}
      </div>
      {preset === "custom" && !valid && <p role="alert" className="text-sm text-muted">Pick a start and end date to see your figures.</p>}
      <div className="flex flex-wrap gap-2">{ACTIONS.map(([k, l, Icon]) => <button key={k} onClick={() => setAction(k)} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm hover:bg-black/5"><Icon size={16} aria-hidden />{l}</button>)}</div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">{error} <button onClick={load} className="font-medium underline">Retry</button></div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card title="Total income" value={d && formatBDT(d.totals.incomeMinor)} tone="text-brand" note="Selected period" />
        <Card title="Total expenses" value={d && formatBDT(d.totals.expenseMinor)} tone="text-red-700" note="Selected period" />
        <Card title="Cash balance" value={b && formatBDT(b.cashMinor)} note="Right now" />
        <Card title="Bank balance" value={b && formatBDT(b.bankMinor)} note="Right now" />
        <Card title="Mobile banking balance" value={b && formatBDT(b.mobileMinor)} note="Right now" />
        <Card title="Money lent" value={d && formatBDT(d.loans.lentOutstandingMinor)} note="Still owed to you" />
        <Card title="Money borrowed" value={d && formatBDT(d.loans.borrowedOutstandingMinor)} note="Still owed by you" />
        <Card title="Net worth" value={d && formatBDT(d.netWorthMinor)} note={b && `Available in accounts ${formatBDT(b.availableMinor)}`} tone={d?.netWorthMinor < 0 ? "text-red-700" : ""} />
      </div>
      <details className="text-sm text-muted"><summary className="cursor-pointer">How these figures are calculated</summary>
        <p className="mt-2 max-w-2xl">Income and expenses count only entries in the selected period. Balances are as of now. Available balance is the sum of your active accounts. Net worth is available balance plus money owed to you, minus money you owe. Transfers, lending, borrowing and repayments move money between places but are never counted as income or expenses.</p></details>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Income vs. expenses">{!d ? <div className="h-64 animate-pulse rounded bg-black/5" /> : (
          <div role="img" aria-label={`Income ${formatBDT(d.totals.incomeMinor)} and expenses ${formatBDT(d.totals.expenseMinor)} over the selected period`} className="h-64">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={flow}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} interval="preserveStartEnd" /><YAxis fontSize={12} tickFormatter={(v) => compact.format(v)} width={44} />
              <Tooltip formatter={(v) => bdt(v)} labelFormatter={(_, p) => p?.[0]?.payload.full} /><Legend /><Bar dataKey="Income" fill="#1f5c4d" radius={[3, 3, 0, 0]} /><Bar dataKey="Expenses" fill="#b91c1c" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>)}</Panel>
        <Panel title="Monthly cash flow, last 12 months">{!d ? <div className="h-64 animate-pulse rounded bg-black/5" /> : (
          <div role="img" aria-label="Net income minus expenses for each of the last 12 months" className="h-64">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} interval="preserveStartEnd" /><YAxis fontSize={12} tickFormatter={(v) => compact.format(v)} width={44} />
              <Tooltip formatter={(v) => bdt(v)} /><ReferenceLine y={0} stroke="#5d6b66" /><Line type="monotone" dataKey="Net" stroke="#1b2421" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>)}</Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent transactions" className="lg:col-span-2">
          {d?.recent.length === 0 && <p className="text-muted">Nothing recorded yet. Add income or an expense to get started.</p>}
          <ul className="divide-y divide-line">{d?.recent.map((t) => { const [sign, tone] = FLOW_STYLE[t.flow]; return (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><p className="truncate font-medium">{t.title}</p><p className="truncate text-sm text-muted">{KIND_LABEL[t.kind]} · {formatDhaka(t.date)}{t.accountName && ` · ${t.accountName}`}</p></div>
              <p className={`whitespace-nowrap font-medium ${tone}`}>{sign}{formatBDT(t.amountMinor)}</p></li>); })}</ul>
          {!d && <div className="h-40 animate-pulse rounded bg-black/5" />}</Panel>
        <div className="space-y-4">
          <Panel title="Accounts">
            {d?.accounts.length === 0 && <p className="text-muted">No accounts yet. <Link href="/cash/accounts/cash" className="text-brand underline">Add one</Link>.</p>}
            <ul className="space-y-2">{d?.accounts.map((a) => (<li key={a.id} className="flex justify-between gap-2"><span className="min-w-0 truncate"><Link href={`/cash/accounts/${a.type}/${a.id}`} className="hover:underline">{a.name}</Link> <span className="text-xs text-muted">{TYPE[a.type]}</span></span><span className={a.balanceMinor < 0 ? "text-red-700" : ""}>{formatBDT(a.balanceMinor)}</span></li>))}</ul>
            {!d && <div className="h-24 animate-pulse rounded bg-black/5" />}</Panel>
          <Panel title="Upcoming repayments and receivables">
            {d?.upcoming.length === 0 && <p className="text-muted">Nothing due in the next 30 days.</p>}
            <ul className="space-y-2">{d?.upcoming.map((l) => (<li key={l.id} className="text-sm"><div className="flex justify-between gap-2"><span className="truncate font-medium">{l.counterparty}</span><span>{formatBDT(l.outstandingMinor)}</span></div>
              <p className={l.overdue ? "text-red-700" : "text-muted"}>{l.direction === "lent" ? "They owe you" : "You owe"} · {l.overdue ? "Overdue since" : "Due"} {formatDhaka(l.dueDate)}</p></li>))}</ul>
            {!d && <div className="h-24 animate-pulse rounded bg-black/5" />}</Panel>
        </div>
      </div>
      {action && <QuickAdd action={action} onClose={closeAction} onSaved={() => { setAction(null); load(); }} />}
    </div>
  );
}
