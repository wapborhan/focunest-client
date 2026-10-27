"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function Pagination({ page, total, limit, onPage }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / limit)), from = (page - 1) * limit + 1, to = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">Showing <b className="text-ink">{from}–{to}</b> of <b className="text-ink">{total}</b></p>
      {pages > 1 && <div className="flex items-center gap-2">
        <button className="btn btn-ghost !px-3 !py-2" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} aria-hidden />Prev</button>
        <span className="min-w-20 text-center text-muted">Page {page} of {pages}</span>
        <button className="btn btn-ghost !px-3 !py-2" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight size={16} aria-hidden /></button></div>}
    </div>
  );
}
