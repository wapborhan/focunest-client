"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import { api } from "@/lib/client-api";
import { toMinor, formatBDT } from "@/lib/money";
import { dhakaToday } from "@/lib/dates";

const schema = z.object({
  fromAccountId: z.string().min(1, "Choose an account"), toAccountId: z.string().min(1, "Choose an account"),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), note: z.string().trim().max(500).optional(),
}).refine((v) => v.fromAccountId !== v.toAccountId, { path: ["toAccountId"], message: "Choose a different account" });
const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const Err = ({ e }) => (e ? <p role="alert" className="mt-1 text-sm text-red-700">{e.message}</p> : null);

export default function TransferForm({ onClose, onSaved }) {
  const key = useRef(crypto.randomUUID()); const [accounts, setAccounts] = useState(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { fromAccountId: "", toAccountId: "", amount: "", date: dhakaToday(), note: "" } });
  useEffect(() => { api("/api/accounts").then((r) => setAccounts(r.items)).catch((e) => toast.error(e.message)); }, []);
  async function submit(v) {
    try {
      await api("/api/transfers", { method: "POST", body: { fromAccountId: v.fromAccountId, toAccountId: v.toAccountId, amountMinor: toMinor(v.amount), date: v.date, note: v.note || undefined, idempotencyKey: key.current } });
      toast.success("Transfer recorded"); onSaved();
    } catch (e) { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "amountMinor" ? "amount" : k, { message: m[0] })); toast.error(e.message); }
  }
  const opts = (accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.name} ({formatBDT(a.balanceMinor)})</option>);
  return (
    <Dialog title="Transfer money" onClose={onClose}>
      {accounts && accounts.length < 2 ? <p>You need at least two accounts to transfer money between them.</p> : (
        <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
          <label className="block">From<select className={field} {...register("fromAccountId")}><option value="">Choose…</option>{opts}</select><Err e={errors.fromAccountId} /></label>
          <label className="block">To<select className={field} {...register("toAccountId")}><option value="">Choose…</option>{opts}</select><Err e={errors.toAccountId} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">Amount (BDT)<input type="number" step="0.01" inputMode="decimal" className={field} {...register("amount")} /><Err e={errors.amount} /></label>
            <label className="block">Date<input type="date" className={field} {...register("date")} /><Err e={errors.date} /></label>
          </div>
          <label className="block">Note <span className="text-muted">(optional)</span><input className={field} {...register("note")} /></label>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-black/5">Cancel</button>
            <button disabled={isSubmitting || !accounts} className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">{isSubmitting ? "Transferring…" : "Transfer money"}</button></div>
        </form>)}
    </Dialog>
  );
}
