import { TrendingUp, TrendingDown, Wallet, HandCoins, Landmark } from "lucide-react";
import StatCard from "./ui/StatCard";
import { formatBDT } from "@/lib/money";
/** The five cards of the main dashboard. `periodNote` says which period income and expenses cover. */
export default function OverviewCards({ data, periodNote = "Selected period" }) {
  const { totals, balances, loans } = data;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <StatCard i={0} icon={TrendingUp} title="Total income" value={formatBDT(totals.incomeMinor)} tone="text-primary" note={periodNote} />
      <StatCard i={1} icon={TrendingDown} title="Total expenses" value={formatBDT(totals.expenseMinor)} tone="text-danger" note={periodNote} />
      <StatCard i={2} icon={Wallet} title="Total balance" value={formatBDT(balances.availableMinor)} tone={balances.availableMinor < 0 ? "text-danger" : ""} note="All accounts, right now" className="col-span-2 sm:col-span-1" />
      <StatCard i={3} icon={HandCoins} title="Total lent" value={formatBDT(loans.lentOutstandingMinor)} note="Still owed to you" />
      <StatCard i={4} icon={Landmark} title="Total borrowed" value={formatBDT(loans.borrowedOutstandingMinor)} note="Still owed by you" />
    </div>
  );
}
