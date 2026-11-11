"use client";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDown } from "lucide-react";
import Dialog from "./Dialog";
import Field from "./ui/Field";
import AccountSelect from "./ui/AccountSelect";
import DatePicker from "./ui/DatePicker";
import { api } from "@/lib/client-api";
import { toMinor, formatBDT } from "@/lib/money";
import { dhakaToday } from "@/lib/dates";

const schema = z.object({
  fromAccountId: z.string().min(1, "Choose an account"), toAccountId: z.string().min(1, "Choose an account"),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), note: z.string().trim().max(500).optional(),
}).refine((v) => v.fromAccountId !== v.toAccountId, { path: ["toAccountId"], message: "Choose a different account" });
const Available = ({ a }) => a && <p className="mt-1.5 text-sm text-muted">Available balance <b className={`tabular-nums ${a.balanceMinor < 0 ? "text-danger" : "text-ink"}`}>{formatBDT(a.balanceMinor)}</b></p>;

export default function TransferForm({ accounts, onClose, onSaved }) {
  const key = useRef(crypto.randomUUID());
  const usable = accounts.filter((a) => a.status === "active" && a.active !== false);
  const { register, control, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { fromAccountId: "", toAccountId: "", amount: "", date: dhakaToday(), note: "" } });
  const [from, to, amount] = watch(["fromAccountId", "toAccountId", "amount"]);
  const fromAcc = accounts.find((a) => a.id === from), toAcc = accounts.find((a) => a.id === to);
  const need = Number.isFinite(+amount) && +amount > 0 ? toMinor(+amount) : 0;
  const short = !!fromAcc && !fromAcc.allowNegative && need > fromAcc.balanceMinor;
  async function submit(v) {
    try {
      await api("/api/transfers", { method: "POST", body: { fromAccountId: v.fromAccountId, toAccountId: v.toAccountId, amountMinor: toMinor(v.amount), date: v.date, note: v.note || undefined, idempotencyKey: key.current } });
      toast.success("Transfer recorded"); onSaved();
    } catch (e) { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "amountMinor" ? "amount" : k, { message: m[0] })); toast.error(e.message); }
  }
  return (
    <Dialog title="Transfer money" onClose={onClose} wide>
      {usable.length < 2 ? <p className="text-muted">You need at least two active accounts to transfer money between them.</p> : (
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Field as="div" label="From" error={errors.fromAccountId}><Controller control={control} name="fromAccountId" render={({ field }) => <AccountSelect aria-label="From account" accounts={usable} exclude={to} value={field.value} onChange={field.onChange} invalid={!!errors.fromAccountId} />} /><Available a={fromAcc} /></Field>
          <div className="flex justify-center text-primary"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft"><ArrowDown size={16} aria-hidden /></span></div>
          <Field as="div" label="To" error={errors.toAccountId}><Controller control={control} name="toAccountId" render={({ field }) => <AccountSelect aria-label="To account" accounts={usable} exclude={from} value={field.value} onChange={field.onChange} invalid={!!errors.toAccountId} />} /><Available a={toAcc} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (BDT)" error={errors.amount}><input type="number" step="0.01" inputMode="decimal" className="field" {...register("amount")} /></Field>
            <Field as="div" label="Date" error={errors.date}><Controller control={control} name="date" render={({ field }) => <DatePicker aria-label="Date" value={field.value} onChange={field.onChange} />} /></Field></div>
          {short && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">Not enough balance. Available {formatBDT(fromAcc.balanceMinor)}.</p>}
          {!short && fromAcc && toAcc && need > 0 && <p className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm text-primary-strong">After transfer: {fromAcc.name} {formatBDT(fromAcc.balanceMinor - need)}, {toAcc.name} {formatBDT(toAcc.balanceMinor + need)}</p>}
          <Field label={<>Note <span className="font-normal text-muted">(optional)</span></>}><input className="field" {...register("note")} /></Field>
          <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting || short} className="btn btn-primary">{isSubmitting ? "Transferring…" : "Transfer money"}</button></div>
        </form>)}
    </Dialog>
  );
}
