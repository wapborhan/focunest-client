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
import { dhakaToday, toDhakaYmd } from "@/lib/dates";

export const COPY = {
  lent: { tab: "Money lent", person: "Borrower's name", add: "Add lending", out: "Paid from", back: "Collect repayment", backIn: "Received in", noun: "lending" },
  borrowed: { tab: "Money borrowed", person: "Lender's name", add: "Add borrowing", out: "Received in", back: "Repay", backIn: "Paid from", noun: "borrowing" },
};
const amt = z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const fail = (e, setError, map = {}) => { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(map[k] ?? k, { message: m[0] })); toast.error(e.message); };
const accOptions = (accounts) => accounts.map((a) => ({ value: a.id, label: a.name, hint: formatBDT(a.balanceMinor) }));

export function LoanForm({ direction, accounts, onClose, onSaved }) {
  const c = COPY[direction]; const key = useRef(crypto.randomUUID());
  const schema = z.object({ counterparty: z.string().trim().min(1, "Enter a name").max(80), phone: z.string().trim().regex(/^(\+?[\d\s-]{6,19})?$/, "Enter a valid phone number"), amount: amt, accountId: z.string().min(1, "Choose an account"), date: day, dueDate: z.string(), notes: z.string().trim().max(500) })
    .refine((v) => !v.dueDate || v.dueDate >= v.date, { path: ["dueDate"], message: "Due date can't be before the loan date" });
  const { register, control, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { counterparty: "", phone: "", amount: "", accountId: accounts[0]?.id ?? "", date: dhakaToday(), dueDate: "", notes: "" } });
  async function submit(v) {
    try { await api("/api/loans", { method: "POST", body: { direction, counterparty: v.counterparty, phone: v.phone || undefined, principalMinor: toMinor(v.amount), accountId: v.accountId, date: v.date, dueDate: v.dueDate || undefined, notes: v.notes || undefined, idempotencyKey: key.current } }); toast.success("Saved"); onSaved(); }
    catch (e) { fail(e, setError, { principalMinor: "amount" }); }
  }
  if (!accounts.length) return <Dialog title={c.add} onClose={onClose}><p className="text-muted">Add an account first, then record the {c.noun}.</p></Dialog>;
  return (
    <Dialog title={c.add} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Field label={c.person} error={errors.counterparty}><input className="field" {...register("counterparty")} /></Field>
        <Field label={<>Phone <span className="font-normal text-muted">(optional)</span></>} error={errors.phone}><input type="tel" className="field" {...register("phone")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (BDT)" error={errors.amount}><input type="number" step="0.01" inputMode="decimal" className="field" {...register("amount")} /></Field>
          <Field as="div" label={c.out} error={errors.accountId}><Controller control={control} name="accountId" render={({ field }) => <Select aria-label={c.out} value={field.value} onChange={field.onChange} options={accOptions(accounts)} placeholder="Choose an account" />} /></Field>
          <Field as="div" label="Date" error={errors.date}><Controller control={control} name="date" render={({ field }) => <DatePicker aria-label="Date" value={field.value} onChange={field.onChange} />} /></Field>
          <Field as="div" label="Expected repayment" error={errors.dueDate}><Controller control={control} name="dueDate" render={({ field }) => <DatePicker aria-label="Expected repayment date" clearable placeholder="Optional" min={watch("date")} value={field.value} onChange={field.onChange} />} /></Field>
        </div>
        <Field label="Purpose or notes"><textarea rows={2} className="field resize-none" {...register("notes")} /></Field>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saving…" : c.add}</button></div>
      </form>
    </Dialog>
  );
}

export function RepayForm({ loan, accounts, onClose, onSaved }) {
  const c = COPY[loan.direction]; const key = useRef(crypto.randomUUID());
  const schema = z.object({ amount: amt.refine((n) => toMinor(n) <= loan.outstandingMinor, `At most ${formatBDT(loan.outstandingMinor)}`), accountId: z.string().min(1, "Choose an account"), date: day, note: z.string().trim().max(500) });
  const { register, control, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { amount: "", accountId: accounts[0]?.id ?? "", date: dhakaToday(), note: "" } });
  async function submit(v) {
    try { await api(`/api/loans/${loan.id}/repayments`, { method: "POST", body: { amountMinor: toMinor(v.amount), accountId: v.accountId, date: v.date, note: v.note || undefined, idempotencyKey: key.current } }); toast.success("Repayment recorded"); onSaved(); }
    catch (e) { fail(e, setError, { amountMinor: "amount" }); }
  }
  return (
    <Dialog title={`${c.back}: ${loan.counterparty}`} onClose={onClose}>
      <p className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-sm">Outstanding <b className="text-brand-dark">{formatBDT(loan.outstandingMinor)}</b></p>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <div><Field label="Amount (BDT)" error={errors.amount}><input type="number" step="0.01" inputMode="decimal" className="field" {...register("amount")} /></Field>
          <button type="button" onClick={() => setValue("amount", loan.outstandingMinor / 100, { shouldValidate: true })} className="mt-1.5 text-sm font-medium text-brand hover:underline">Pay the full outstanding amount</button></div>
        <Field as="div" label={c.backIn} error={errors.accountId}><Controller control={control} name="accountId" render={({ field }) => <Select aria-label={c.backIn} value={field.value} onChange={field.onChange} options={accOptions(accounts)} placeholder="Choose an account" />} /></Field>
        <Field as="div" label="Date" error={errors.date}><Controller control={control} name="date" render={({ field }) => <DatePicker aria-label="Date" min={toDhakaYmd(loan.date)} value={field.value} onChange={field.onChange} />} /></Field>
        <Field label={<>Note <span className="font-normal text-muted">(optional)</span></>}><input className="field" {...register("note")} /></Field>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saving…" : c.back}</button></div>
      </form>
    </Dialog>
  );
}
