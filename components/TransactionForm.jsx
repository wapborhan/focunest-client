"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import { api } from "@/lib/client-api";
import { toMinor, fromMinor } from "@/lib/money";
import { dhakaToday, toDhakaYmd } from "@/lib/dates";
import { METHODS } from "@/lib/schemas/transaction";
import { METHOD_LABEL, KIND_COPY } from "@/lib/tx-labels";

const schema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10),
  title: z.string().trim().min(1, "Required").max(120),
  categoryId: z.string().min(1, "Choose a category"),
  accountId: z.string().min(1, "Choose an account"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMethod: z.string().optional(), reference: z.string().trim().max(60).optional(), note: z.string().trim().max(500).optional(),
});
const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2";
const Err = ({ e }) => (e ? <p role="alert" className="mt-1 text-sm text-red-700">{e.message}</p> : null);

export default function TransactionForm({ kind, tx, accounts, categories, onClose, onSaved, onCategoryAdded }) {
  const copy = KIND_COPY[kind]; const key = useRef(crypto.randomUUID());
  const [newCat, setNewCat] = useState(null);
  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: tx ? { amount: fromMinor(tx.amountMinor), title: tx.title, categoryId: tx.categoryId, accountId: tx.accountId, date: toDhakaYmd(tx.date), paymentMethod: tx.paymentMethod ?? "", reference: tx.reference ?? "", note: tx.note ?? "" }
      : { amount: "", title: "", categoryId: "", accountId: accounts[0]?.id ?? "", date: dhakaToday(), paymentMethod: "", reference: "", note: "" },
  });
  async function submit(v) {
    const body = { amountMinor: toMinor(v.amount), title: v.title, categoryId: v.categoryId, accountId: v.accountId, date: v.date, paymentMethod: v.paymentMethod || undefined, reference: v.reference || undefined, note: v.note || undefined };
    try {
      if (tx) await api(`/api/transactions/${tx.id}`, { method: "PATCH", body });
      else await api("/api/transactions", { method: "POST", body: { ...body, kind, idempotencyKey: key.current } });
      toast.success(tx ? "Changes saved" : `${copy.noun[0].toUpperCase()}${copy.noun.slice(1)} added`); onSaved();
    } catch (e) {
      Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "amountMinor" ? "amount" : k, { message: m[0] }));
      toast.error(e.message);
    }
  }
  async function addCategory() {
    if (!newCat?.trim()) return;
    try { const c = await api("/api/categories", { method: "POST", body: { kind, nameEn: newCat.trim() } }); await onCategoryAdded(); setValue("categoryId", c.id); setNewCat(null); }
    catch (e) { toast.error(e.message); }
  }
  if (!accounts.length) return (<Dialog title={copy.add} onClose={onClose}><p>You need an account before you can record {copy.noun}.</p>
    <Link href="/cash/accounts/cash" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-white">Add an account</Link></Dialog>);
  return (
    <Dialog title={tx ? `Edit ${copy.noun}` : copy.add} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
        <label className="block">Amount (BDT)<input type="number" step="0.01" inputMode="decimal" className={field} {...register("amount")} /><Err e={errors.amount} /></label>
        <label className="block">{copy.titleLabel}<input className={field} {...register("title")} /><Err e={errors.title} /></label>
        <div className="block"><label htmlFor="cat">Category</label>
          <select id="cat" className={field} {...register("categoryId")}><option value="">Choose…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}{c.nameBn ? ` / ${c.nameBn}` : ""}</option>)}</select>
          <Err e={errors.categoryId} />
          {newCat === null ? <button type="button" onClick={() => setNewCat("")} className="mt-1 text-sm text-brand underline">New category</button>
            : <div className="mt-2 flex gap-2"><input aria-label="New category name" className={field + " mt-0"} value={newCat} onChange={(e) => setNewCat(e.target.value)} /><button type="button" onClick={addCategory} className="rounded-lg border border-line px-3">Add</button></div>}</div>
        <label className="block">{copy.accountLabel}<select className={field} {...register("accountId")}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select><Err e={errors.accountId} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Date<input type="date" className={field} {...register("date")} /><Err e={errors.date} /></label>
          <label className="block">Payment method<select className={field} {...register("paymentMethod")}><option value="">Not set</option>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></label>
        </div>
        <label className="block">Reference number <span className="text-muted">(optional)</span><input className={field} {...register("reference")} /></label>
        <label className="block">Notes<textarea rows={2} className={field} {...register("note")} /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-black/5">Cancel</button>
          <button disabled={isSubmitting} className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">{isSubmitting ? "Saving…" : tx ? "Save changes" : copy.add}</button>
        </div>
      </form>
    </Dialog>
  );
}
