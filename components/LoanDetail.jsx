"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Scale, CheckCircle2, Hourglass } from "lucide-react";
import { COPY, RepayForm } from "./LoanForms";
import { Progress, StatusBadge } from "./LoansView";
import DataTable from "./ui/DataTable";
import StatCard from "./ui/StatCard";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";

export default function LoanDetail({ loan: l, accounts }) {
  const router = useRouter(); const [repay, setRepay] = useState(false); const c = COPY[l.direction];
  const columns = [
    { key: "date", header: "Date", role: "title", nowrap: true, cell: (r) => formatDhaka(r.date) },
    { key: "acc", header: l.direction === "lent" ? "Received in" : "Paid from", cell: (r) => r.accountName },
    { key: "note", header: "Note", wide: true, cell: (r) => r.note ?? <span className="text-muted">—</span> },
    { key: "amt", header: "Amount", align: "right", role: "amount", nowrap: true, cell: (r) => <span className="font-semibold tabular-nums">{formatBDT(r.amountMinor)}</span> },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/cash/lending-borrowing" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"><ArrowLeft size={14} aria-hidden />Back to loans</Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{l.counterparty}</h2>
        <p className="text-muted">{[l.phone, `${c.noun} on ${formatDhaka(l.date)}`, l.dueDate && `due ${formatDhaka(l.dueDate)}`, l.accountName && `via ${l.accountName}`].filter(Boolean).join(" · ")}</p>{l.notes && <p className="mt-2 max-w-2xl">{l.notes}</p>}</div>
        <div className="flex items-center gap-3"><StatusBadge l={l} />{l.status !== "repaid" && <button onClick={() => setRepay(true)} className="btn btn-primary">{c.back}</button>}</div></div>
      <div className="grid gap-3 sm:grid-cols-3"><StatCard i={0} icon={Scale} title="Principal" value={formatBDT(l.principalMinor)} /><StatCard i={1} icon={CheckCircle2} title="Repaid" value={formatBDT(l.repaidMinor)} tone="text-brand" /><StatCard i={2} icon={Hourglass} title="Outstanding" value={formatBDT(l.outstandingMinor)} tone={l.overdue ? "text-red-600" : ""} /></div>
      <div className="card p-4"><p className="mb-2 text-sm font-medium">Repayment progress</p><Progress l={l} /></div>
      <div><h3 className="mb-3 font-semibold">Repayment history</h3>
        <DataTable columns={columns} rows={l.repayments} caption="Repayment history" empty={<p className="text-muted">No repayments yet.</p>} /></div>
      {repay && <RepayForm loan={l} accounts={accounts} onClose={() => setRepay(false)} onSaved={() => { setRepay(false); router.refresh(); }} />}
    </div>
  );
}
