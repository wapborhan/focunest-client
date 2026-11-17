import Link from "next/link";
import BudgetBar from "./BudgetBar";
import { formatBDT } from "@/lib/money";
import { fmtMonth } from "@/lib/dates";
/** Dashboard panel: this month's overall budget and the most-used category budgets. */
export default function BudgetPanel({ budget: b }) {
  const items = [
    ...(b.overall ? [{ key: "overall", name: b.overall.source === "total" ? "Overall" : "All categories", spent: b.overall.spentMinor, limit: b.overall.budgetMinor, percent: b.overall.percent, status: b.overall.status }] : []),
    ...b.lines.filter((l) => l.budgetMinor != null).slice(0, 4).map((l) => ({ key: l.categoryId, name: l.nameEn, spent: l.spentMinor, limit: l.budgetMinor, percent: l.percent, status: l.status })),
  ];
  if (items.length === 0) return (<div><p className="text-muted">No budget set for {fmtMonth(b.month)}.</p><Link href="/cash/budget" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">Set a monthly budget</Link></div>);
  return (
    <div className="space-y-3">
      {items.map((i) => (<div key={i.key}><div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">{i.name}</span><span className={`whitespace-nowrap tabular-nums ${i.status === "over" ? "text-danger" : "text-muted"}`}>{formatBDT(i.spent)} / {formatBDT(i.limit)}</span></div>
        <BudgetBar percent={i.percent} status={i.status} label={`${i.name} budget used`} className="mt-1.5" /></div>))}
      <Link href="/cash/budget" className="inline-block text-sm font-medium text-primary hover:underline">View all budgets</Link>
    </div>
  );
}
