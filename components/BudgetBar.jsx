const FILL = { ok: "bg-brand", warning: "bg-amber-500", over: "bg-danger", none: "bg-line-strong" };
export const STATUS_LABEL = { ok: "On track", warning: "Near limit", over: "Over budget", none: "No budget" };
const BADGE = { ok: "", warning: "!bg-amber-100 !text-amber-800 dark:!bg-amber-500/15 dark:!text-amber-300", over: "!bg-danger-soft !text-danger", none: "!bg-surface-3 !text-muted" };
export const StatusBadge = ({ status }) => <span className={`badge ${BADGE[status]}`}>{STATUS_LABEL[status]}</span>;
/** How much of a budget is used. Green under 80%, amber from 80% to 100%, red once over. */
export default function BudgetBar({ percent, status, label = "Budget used", className = "" }) {
  const w = Math.max(0, Math.min(100, percent ?? 0));
  return (<div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(w)} className={`h-2 overflow-hidden rounded-full bg-surface-3 ${className}`}>
    <div className={`h-full rounded-full transition-all duration-700 ${FILL[status] ?? FILL.none}`} style={{ width: `${w}%` }} /></div>);
}
