"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";

const KIND = { income: "Income", expense: "Expense", transfer: "Transfer", loan_out: "Money lent", borrow_in: "Money borrowed", repay_in: "Repayment received", repay_out: "Repayment made" };
const LOAN = ["loan_out", "borrow_in", "repay_in", "repay_out"];

export default function AccountDetail({ id, type }) {
  const [data, setData] = useState(null); const [error, setError] = useState(null); const [page, setPage] = useState(1);
  const load = useCallback(async () => { setError(null); try { setData(await api(`/api/accounts/${id}?page=${page}&limit=20`)); } catch (e) { setError(e.message); } }, [id, page]);
  useEffect(() => { load(); }, [load]);
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">{error} <button onClick={load} className="font-medium underline">Retry</button></div>;
  if (!data) return <div className="h-40 animate-pulse rounded-xl bg-black/5" aria-busy="true" />;
  const { account: a, history: h } = data; const k = h.byKind;
  const loans = LOAN.reduce((s, x) => s + (k[x] ?? 0), 0);
  const cards = [["Balance", a.balanceMinor], ["Opening balance", a.openingBalanceMinor], ["Income", k.income ?? 0], ["Expenses", k.expense ?? 0], ["Transfers (net)", k.transfer ?? 0], ["Loans (net)", loans]];
  const pages = Math.max(1, Math.ceil(h.total / h.limit));
  return (
    <div className="space-y-6">
      <div><Link href={`/cash/accounts/${type}`} className="text-sm text-brand hover:underline">Back to accounts</Link>
        <h2 className="text-xl font-semibold">{a.name} {a.status === "archived" && <span className="ml-2 rounded bg-black/10 px-2 py-0.5 text-sm">Archived</span>}</h2>
        <p className="text-muted">{[a.provider, a.identifierMasked].filter(Boolean).join(" · ")}</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{cards.map(([l, v]) => (<div key={l} className="rounded-xl border border-line bg-white p-4"><p className="text-sm text-muted">{l}</p><p className="text-lg font-semibold">{formatBDT(v)}</p></div>))}</div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm"><caption className="sr-only">Ledger history</caption>
          <thead className="border-b border-line text-muted"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Details</th><th className="p-3 text-right">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-line"><td className="p-3">{formatDhaka(a.openingDate)}</td><td className="p-3">Opening</td><td className="p-3 text-muted">Starting balance</td><td className="p-3 text-right">{formatBDT(a.openingBalanceMinor)}</td></tr>
            {h.items.map((e) => (<tr key={e.id} className="border-b border-line last:border-0"><td className="p-3">{formatDhaka(e.date)}</td><td className="p-3">{KIND[e.kind] ?? "Entry"}{e.isReversal && " (reversal)"}</td><td className="p-3 text-muted">{e.title ?? "—"}</td>
              <td className={`p-3 text-right ${e.amountMinor < 0 ? "text-red-700" : "text-brand"}`}>{formatBDT(e.amountMinor)}</td></tr>))}
          </tbody></table>
        {h.total === 0 && <p className="p-6 text-center text-muted">No transactions yet. Income, expenses and transfers will appear here.</p>}
      </div>
      {pages > 1 && <div className="flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg px-4 py-2 hover:bg-black/5 disabled:opacity-40">Previous</button><span className="text-sm text-muted">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg px-4 py-2 hover:bg-black/5 disabled:opacity-40">Next</button></div>}
    </div>
  );
}
