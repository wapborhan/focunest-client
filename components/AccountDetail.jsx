"use client";
import Link from "next/link";
import { ArrowLeft, Scale, Rocket, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, HandCoins } from "lucide-react";
import DataTable from "./ui/DataTable";
import Pagination from "./ui/Pagination";
import StatCard from "./ui/StatCard";
import { AccountIcon } from "./ui/ProviderIcon";
import AccountNumber from "./ui/AccountNumber";
import { SUBTYPE_LABEL, CARD_LABEL } from "@/lib/account-display";
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
    { key: "amount", header: "Amount", align: "right", role: "amount", nowrap: true, cell: (e) => <span className={`font-semibold tabular-nums ${e.amountMinor < 0 ? "text-danger" : "text-primary"}`}>{formatBDT(e.amountMinor)}</span> },
  ];
  const loans = LOAN.reduce((s, x) => s + (k[x] ?? 0), 0);
  return (
    <div className="space-y-5">
      <div><Link href={`/cash/accounts?type=${a.type}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ArrowLeft size={14} aria-hidden />Back to accounts</Link>
        <div className="mt-2 flex items-center gap-4"><AccountIcon account={a} size={52} />
          <div className="min-w-0"><h2 className="text-2xl font-semibold tracking-tight">{a.provider ?? a.name} {a.status === "archived" && <span className="badge ml-2 !bg-surface-3 !text-muted">Archived</span>}{a.type === "mobile" && !a.active && <span className="badge ml-2 !bg-surface-3 !text-muted">Inactive</span>}</h2>
            {a.provider && <p className="text-muted">{a.name}</p>}</div></div>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">{[[a.type === "mobile" ? "Mobile number" : "Account number", a.numberLabel && <AccountNumber account={a} />], ["Account type", SUBTYPE_LABEL[a.subtype]], ["Branch", a.branch], ["Routing number", a.routingNumber], ["Card", a.cardType && `${CARD_LABEL[a.cardType]} ${a.cardMasked}`]]
          .filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium tabular-nums">{v}</dd></div>)}</dl></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard i={0} icon={Scale} title="Balance" value={formatBDT(a.balanceMinor)} /><StatCard i={1} icon={Rocket} title="Opening" value={formatBDT(a.openingBalanceMinor)} />
        <StatCard i={2} icon={ArrowDownToLine} title="Income" value={formatBDT(k.income ?? 0)} tone="text-primary" /><StatCard i={3} icon={ArrowUpFromLine} title="Expenses" value={formatBDT(k.expense ?? 0)} tone="text-danger" />
        <StatCard i={4} icon={ArrowLeftRight} title="Transfers (net)" value={formatBDT(k.transfer ?? 0)} /><StatCard i={5} icon={HandCoins} title="Loans (net)" value={formatBDT(loans)} /></div>
      <DataTable columns={columns} rows={rows} caption="Ledger history" loading={pending} />
      <Pagination page={h.page} total={h.total} limit={h.limit} onPage={(p) => update({ page: p > 1 ? p : "" })} />
    </div>
  );
}
