"use client";
import Link from "next/link";
import { ArrowLeft, Scale, Rocket, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, HandCoins } from "lucide-react";
import DataTable from "./ui/DataTable";
import Pagination from "./ui/Pagination";
import StatCard from "./ui/StatCard";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/tx-labels";
import { useUrlFilters } from "@/lib/use-url-filters";

const LOAN = ["loan_out", "borrow_in", "repay_in", "repay_out"];
export default function AccountDetail({ account: a, history: h }) {
  const { update, pending } = useUrlFilters(); const k = h.byKind;
  const pages = Math.max(1, Math.ceil(h.total / h.limit));
  const rows = [...h.items.map((e) => ({ ...e, kindLabel: `${KIND_LABEL[e.kind] ?? "Entry"}${e.isReversal ? " (reversal)" : ""}` })),
    ...(h.page === pages ? [{ id: "opening", date: a.openingDate, kindLabel: "Opening", title: "Starting balance", amountMinor: a.openingBalanceMinor }] : [])];
  const columns = [
    { key: "date", header: "Date", nowrap: true, cell: (e) => formatDhaka(e.date) },
    { key: "title", header: "Details", role: "title", cell: (e) => e.title ?? <span className="text-muted">—</span> },
    { key: "kind", header: "Type", cell: (e) => <span className="badge">{e.kindLabel}</span> },
    { key: "amount", header: "Amount", align: "right", role: "amount", nowrap: true, cell: (e) => <span className={`font-semibold tabular-nums ${e.amountMinor < 0 ? "text-red-600" : "text-brand"}`}>{formatBDT(e.amountMinor)}</span> },
  ];
  const loans = LOAN.reduce((s, x) => s + (k[x] ?? 0), 0);
  return (
    <div className="space-y-5">
      <div><Link href={`/cash/accounts?type=${a.type}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"><ArrowLeft size={14} aria-hidden />Back to accounts</Link>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{a.name} {a.status === "archived" && <span className="badge ml-2 !bg-slate-100 !text-muted">Archived</span>}</h2>
        <p className="text-muted">{[a.provider, a.identifierMasked].filter(Boolean).join(" · ")}</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard i={0} icon={Scale} title="Balance" value={formatBDT(a.balanceMinor)} /><StatCard i={1} icon={Rocket} title="Opening" value={formatBDT(a.openingBalanceMinor)} />
        <StatCard i={2} icon={ArrowDownToLine} title="Income" value={formatBDT(k.income ?? 0)} tone="text-brand" /><StatCard i={3} icon={ArrowUpFromLine} title="Expenses" value={formatBDT(k.expense ?? 0)} tone="text-red-600" />
        <StatCard i={4} icon={ArrowLeftRight} title="Transfers (net)" value={formatBDT(k.transfer ?? 0)} /><StatCard i={5} icon={HandCoins} title="Loans (net)" value={formatBDT(loans)} /></div>
      <DataTable columns={columns} rows={rows} caption="Ledger history" loading={pending} />
      <Pagination page={h.page} total={h.total} limit={h.limit} onPage={(p) => update({ page: p > 1 ? p : "" })} />
    </div>
  );
}
