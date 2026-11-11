"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, ArrowRight, Info } from "lucide-react";
import TransferForm from "./TransferForm";
import DataTable from "./ui/DataTable";
import Pagination from "./ui/Pagination";
import StatCard from "./ui/StatCard";
import ProviderIcon from "./ui/ProviderIcon";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";
import { useUrlFilters } from "@/lib/use-url-filters";

const Side = ({ x }) => (<div className="flex min-w-0 items-center gap-2"><ProviderIcon kind={x?.type} code={x?.providerCode} name={x?.provider ?? x?.name} size={22} />
  <span className="truncate">{x?.provider ? `${x.provider} · ${x.name}` : x?.name}</span></div>);

/** Transfer history is a permanent record: there is no edit or delete. A mistake is fixed with a transfer the other way. */
export default function TransfersView({ transfers, accounts }) {
  const router = useRouter(); const { update, pending } = useUrlFilters(); const [open, setOpen] = useState(false);
  const columns = [
    { key: "d", header: "Date", nowrap: true, cell: (t) => formatDhaka(t.date) },
    { key: "ft", header: "From → To", role: "title", cell: (t) => (<div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Side x={t.from ?? { name: t.fromAccountName }} /><ArrowRight size={14} aria-hidden className="shrink-0 text-primary" /><Side x={t.to ?? { name: t.toAccountName }} /></div>) },
    { key: "n", header: "Note", wide: true, cell: (t) => t.note ?? <span className="text-muted">—</span> },
    { key: "a", header: "Amount", align: "right", role: "amount", nowrap: true, cell: (t) => <span className="font-semibold tabular-nums">{formatBDT(t.amountMinor)}</span> },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard i={0} icon={ArrowLeftRight} title="Transfers recorded" value={transfers.total} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex max-w-xl items-start gap-2 text-sm text-muted"><Info size={16} aria-hidden className="mt-0.5 shrink-0 text-primary" />Transfers are a permanent record and can't be edited or deleted. If you make a mistake, transfer the money back.</p>
        <button onClick={() => setOpen(true)} className="btn btn-primary"><ArrowLeftRight size={16} aria-hidden />Transfer money</button></div>
      <DataTable columns={columns} rows={transfers.items} caption="Transfer history" loading={pending}
        empty={<><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-primary"><ArrowLeftRight aria-hidden /></span><p className="mt-4 font-semibold">No transfers yet</p><p className="mt-1 text-muted">Move money between your cash, bank and mobile banking accounts.</p></>} />
      <Pagination page={transfers.page} total={transfers.total} limit={transfers.limit} onPage={(p) => update({ page: p > 1 ? p : "" })} />
      {open && <TransferForm accounts={accounts} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} />}
    </div>
  );
}
