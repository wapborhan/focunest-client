"use client";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";

/** A bank account number is shown as its last 6 digits. "Show" fetches the full number on request and hides it again after 20 seconds.
 *  Mobile numbers are shown in full, since they are the number you share. */
export default function AccountNumber({ account }) {
  const [full, setFull] = useState(null); const [busy, setBusy] = useState(false); const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!account.numberLabel) return <span className="text-muted">—</span>;
  if (account.type !== "bank") return <span className="tabular-nums">{account.numberLabel}</span>;
  async function toggle() {
    if (full) { clearTimeout(timer.current); setFull(null); return; }
    setBusy(true);
    try { const r = await api(`/api/accounts/${account.id}/number`); setFull(r.accountNumber); timer.current = setTimeout(() => setFull(null), 20000); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="tabular-nums" aria-live="polite">{full ?? account.numberLabel}</span>
      <button type="button" onClick={toggle} disabled={busy} aria-pressed={!!full} aria-label={full ? "Hide full account number" : "Show full account number"} title={full ? "Hide" : "Show full number"} className="icon-btn !p-1.5">
        {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : full ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}</button>
    </span>
  );
}
