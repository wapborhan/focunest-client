import { PiggyBank } from "lucide-react";
import { formatBDT } from "@/lib/money";
import { toDhakaYmd } from "@/lib/dates";
/**
 * Under the category on the expense form: how much of this month's budget is left, and a warning if this expense would go over.
 * It only guides. It never blocks saving. When editing, the expense's old amount is already counted as spent, so it is added back.
 */
export default function BudgetHint({ hint, categoryId, date, amountMinor = 0, tx }) {
  if (!hint || !date || date.slice(0, 7) !== hint.month) return null;
  const own = tx && tx.categoryId === categoryId && tx.date && toDhakaYmd(tx.date).slice(0, 7) === hint.month ? tx.amountMinor : 0;
  const left = hint.budgetMinor - (hint.spentMinor - own), after = left - amountMinor, over = amountMinor > 0 ? after < 0 : left < 0;
  const b = (n) => <b className={over ? "" : "text-ink"}>{formatBDT(n)}</b>;
  const text = amountMinor > 0
    ? (after >= 0 ? <>After this, {b(after)} will be left in the {hint.name} budget ({formatBDT(hint.budgetMinor)} a month).</> : <>This puts {hint.name} {b(-after)} over its monthly budget of {formatBDT(hint.budgetMinor)}.</>)
    : (left >= 0 ? <>{hint.name} budget: {b(left)} left of {formatBDT(hint.budgetMinor)} this month.</> : <>{hint.name} is already {b(-left)} over its monthly budget.</>);
  return <p aria-live="polite" className={`-mt-1 flex items-start gap-1.5 text-sm ${over ? "text-danger" : "text-muted"}`}><PiggyBank size={14} aria-hidden className="mt-0.5 shrink-0" /><span>{text}</span></p>;
}
