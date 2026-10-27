"use client";
const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };
/**
 * One table definition, two layouts. Desktop: sticky-style header, aligned columns, zebra rows, hover highlight, horizontal scroll if needed.
 * Phones: each row becomes a card (role "title" on top-left, "amount" top-right, "actions" in the footer, the rest as label/value pairs).
 */
export default function DataTable({ columns, rows, rowKey = (r) => r.id, caption, loading = false, empty = null }) {
  if (rows.length === 0 && empty) return <div className="card animate-fade-up p-10 text-center">{empty}</div>;
  const by = (role) => columns.find((c) => c.role === role); const title = by("title"), amount = by("amount"), actions = by("actions");
  const rest = columns.filter((c) => !c.role);
  const delay = (i) => ({ animationDelay: `${Math.min(i, 12) * 30}ms` });
  return (
    <div className={`relative transition-opacity duration-200 ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {loading && <div className="progress absolute inset-x-4 -top-1.5 z-10 h-1" />}
      <div className="card hidden overflow-hidden md:block"><div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead><tr className="border-b border-line bg-slate-50/80">{columns.map((c) => (
            <th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted ${ALIGN[c.align ?? "left"]}`}>
              {c.role === "actions" ? <span className="sr-only">{c.header ?? "Actions"}</span> : c.header}</th>))}</tr></thead>
          <tbody className="divide-y divide-line/70">{rows.map((r, i) => (
            <tr key={rowKey(r)} style={delay(i)} className="animate-fade-up transition-colors even:bg-slate-50/50 hover:bg-brand-soft/60">
              {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${ALIGN[c.align ?? "left"]} ${c.nowrap ? "whitespace-nowrap" : ""}`}>{c.cell(r)}</td>)}</tr>))}</tbody>
        </table></div></div>
      <ul className="space-y-3 md:hidden">{rows.map((r, i) => (
        <li key={rowKey(r)} style={delay(i)} className="card animate-fade-up p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0 font-medium">{title?.cell(r)}</div><div className="shrink-0 text-right">{amount?.cell(r)}</div></div>
          {rest.length > 0 && <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{rest.map((c) => (<div key={c.key} className={c.wide ? "col-span-2" : ""}><dt className="text-xs text-muted">{c.header}</dt><dd className="min-w-0 break-words">{c.cell(r)}</dd></div>))}</dl>}
          {actions && <div className="mt-3 flex justify-end gap-1 border-t border-line pt-3">{actions.cell(r)}</div>}
        </li>))}</ul>
    </div>
  );
}
