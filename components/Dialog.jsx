"use client";
import { useEffect, useRef } from "react";
/** Accessible modal: Esc closes, focus moves inside, backdrop click closes. */
export default function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector("input,select,textarea,button")?.focus();
    const k = (e) => e.key === "Escape" && onClose();
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}
      </div>
    </div>
  );
}
