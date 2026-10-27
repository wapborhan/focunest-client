export default function StatCard({ title, value, note, tone = "", icon: Icon, i = 0 }) {
  return (
    <div style={{ "--i": i }} className="card card-hover animate-fade-up relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2"><p className="text-sm text-muted">{title}</p>
        {Icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon size={16} aria-hidden /></span>}</div>
      <p className={`mt-1 truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${tone}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
