"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
/** Modal. Bottom sheet on phones, centered card on larger screens. Esc and backdrop close it; page scroll is locked while open. */
export default function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector("input,textarea,[role=combobox]")?.focus();
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    // A dropdown inside the dialog gets the first Escape. The dialog only closes when none is open.
    const k = (e) => e.key === "Escape" && !document.querySelector("[data-popover-open]") && onClose();
    addEventListener("keydown", k);
    return () => { removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`animate-sheet relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? "sm:max-w-xl" : "sm:max-w-md"}`}>
        <div className="mb-4 flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="icon-btn -mr-2 -mt-1"><X size={18} aria-hidden /></button></div>
        {children}
      </div>
    </div>
  );
}
