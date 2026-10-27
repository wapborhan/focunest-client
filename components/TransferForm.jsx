"use client";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import Field from "./ui/Field";
import Select from "./ui/Select";
import DatePicker from "./ui/DatePicker";
import { api } from "@/lib/client-api";
import { toMinor, formatBDT } from "@/lib/money";
import { dhakaToday } from "@/lib/dates";

const schema = z.object({
  fromAccountId: z.string().min(1, "Choose an account"), toAccountId: z.string().min(1, "Choose an account"),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), note: z.string().trim().max(500).optional(),
}).refine((v) => v.fromAccountId !== v.toAccountId, { path: ["toAccountId"], message: "Choose a different account" });

export default function TransferForm({ accounts, onClose, onSaved }) {
  const key = useRef(crypto.randomUUID());
  const { register, control, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { fromAccountId: "", toAccountId: "", amount: "", date: dhakaToday(), note: "" } });
  const [from, to] = watch(["fromAccountId", "toAccountId"]);
  async function submit(v) {
    try {
      await api("/api/transfers", { method: "POST", body: { fromAccountId: v.fromAccountId, toAccountId: v.toAccountId, amountMinor: toMinor(v.amount), date: v.date, note: v.note || undefined, idempotencyKey: key.current } });
      toast.success("Transfer recorded"); onSaved();
    } catch (e) { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "amountMinor" ? "amount" : k, { message: m[0] })); toast.error(e.message); }
  }
  const opts = (skip) => accounts.filter((a) => a.id !== skip).map((a) => ({ value: a.id, label: a.name, hint: formatBDT(a.balanceMinor) }));
  return (
    <Dialog title="Transfer money" onClose={onClose}>
      {accounts.length < 2 ? <p className="text-muted">You need at least two accounts to transfer money between them.</p> : (
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Field as="div" label="From" error={errors.fromAccountId}><Controller control={control} name="fromAccountId" render={({ field }) => <Select aria-label="From account" value={field.value} onChange={field.onChange} options={opts(to)} placeholder="Choose an account" invalid={!!errors.fromAccountId} />} /></Field>
          <Field as="div" label="To" error={errors.toAccountId}><Controller control={control} name="toAccountId" render={({ field }) => <Select aria-label="To account" value={field.value} onChange={field.onChange} options={opts(from)} placeholder="Choose an account" invalid={!!errors.toAccountId} />} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (BDT)" error={errors.amount}><input type="number" step="0.01" inputMode="decimal" className="field" {...register("amount")} /></Field>
            <Field as="div" label="Date" error={errors.date}><Controller control={control} name="date" render={({ field }) => <DatePicker aria-label="Date" value={field.value} onChange={field.onChange} />} /></Field>
          </div>
          <Field label={<>Note <span className="font-normal text-muted">(optional)</span></>}><input className="field" {...register("note")} /></Field>
          <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Transferring…" : "Transfer money"}</button></div>
        </form>)}
    </Dialog>
  );
}
