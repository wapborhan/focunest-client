"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import Field from "./ui/Field";
import Select from "./ui/Select";
import DatePicker from "./ui/DatePicker";
import { api } from "@/lib/client-api";
import { toMinor, fromMinor, formatBDT } from "@/lib/money";
import { dhakaToday, toDhakaYmd } from "@/lib/dates";
import { METHODS } from "@/lib/schemas/transaction";
import { METHOD_LABEL, KIND_COPY } from "@/lib/tx-labels";

const schema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10),
  title: z.string().trim().min(1, "Required").max(120),
  categoryId: z.string().min(1, "Choose a category"), accountId: z.string().min(1, "Choose an account"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  paymentMethod: z.string().optional(), reference: z.string().trim().max(60).optional(), note: z.string().trim().max(500).optional(),
});
const METHOD_OPTIONS = [{ value: "", label: "Not set" }, ...METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))];

export default function TransactionForm({ kind, tx, accounts, categories, onClose, onSaved }) {
  const copy = KIND_COPY[kind]; const key = useRef(crypto.randomUUID()); const router = useRouter(); const [newCat, setNewCat] = useState(null);
  const { register, control, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm({
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
    } catch (e) { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "amountMinor" ? "amount" : k, { message: m[0] })); toast.error(e.message); }
  }
  async function addCategory() {
    if (!newCat?.trim()) return;
    try { const c = await api("/api/categories", { method: "POST", body: { kind, nameEn: newCat.trim() } }); setValue("categoryId", c.id, { shouldValidate: true }); setNewCat(null); router.refresh(); }
    catch (e) { toast.error(e.message); }
  }
  if (!accounts.length) return (<Dialog title={copy.add} onClose={onClose}><p className="text-muted">You need an account before you can record {copy.noun}.</p>
    <Link href="/cash/accounts" onClick={onClose} className="btn btn-primary mt-4">Add an account</Link></Dialog>);
  const catOptions = categories.map((c) => ({ value: c.id, label: c.nameEn, hint: c.nameBn }));
  const accOptions = accounts.map((a) => ({ value: a.id, label: a.name, hint: formatBDT(a.balanceMinor) }));
  return (
    <Dialog title={tx ? `Edit ${copy.noun}` : copy.add} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Field label="Amount (BDT)" error={errors.amount}><input type="number" step="0.01" inputMode="decimal" className="field" {...register("amount")} /></Field>
        <Field label={copy.titleLabel} error={errors.title}><input className="field" {...register("title")} /></Field>
        <div><Field as="div" label="Category" error={errors.categoryId}><Controller control={control} name="categoryId" render={({ field }) => <Select aria-label="Category" value={field.value} onChange={field.onChange} options={catOptions} placeholder="Choose a category" invalid={!!errors.categoryId} />} /></Field>
          {newCat === null ? <button type="button" onClick={() => setNewCat("")} className="mt-1.5 text-sm font-medium text-brand hover:underline">+ New category</button>
            : <div className="mt-2 flex gap-2"><input autoFocus aria-label="New category name" className="field" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} /><button type="button" onClick={addCategory} className="btn btn-ghost">Add</button></div>}</div>
        <Field as="div" label={copy.accountLabel} error={errors.accountId}><Controller control={control} name="accountId" render={({ field }) => <Select aria-label={copy.accountLabel} value={field.value} onChange={field.onChange} options={accOptions} placeholder="Choose an account" invalid={!!errors.accountId} />} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field as="div" label="Date" error={errors.date}><Controller control={control} name="date" render={({ field }) => <DatePicker aria-label="Date" value={field.value} onChange={field.onChange} invalid={!!errors.date} />} /></Field>
          <Field as="div" label="Payment method"><Controller control={control} name="paymentMethod" render={({ field }) => <Select aria-label="Payment method" value={field.value} onChange={field.onChange} options={METHOD_OPTIONS} />} /></Field>
        </div>
        <Field label={<>Reference number <span className="font-normal text-muted">(optional)</span></>}><input className="field" {...register("reference")} /></Field>
        <Field label="Notes"><textarea rows={2} className="field resize-none" {...register("note")} /></Field>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saving…" : tx ? "Save changes" : copy.add}</button></div>
      </form>
    </Dialog>
  );
}
