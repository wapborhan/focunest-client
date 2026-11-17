"use client";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import Field from "./ui/Field";
import Select from "./ui/Select";
import { api } from "@/lib/client-api";
import { toMinor, fromMinor, formatBDT } from "@/lib/money";
import { fmtMonth, shiftMonth } from "@/lib/dates";

const schema = z.object({ target: z.string().min(1, "Choose what to budget"), amount: z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Must be more than zero").max(1e10), from: z.string().regex(/^\d{4}-\d{2}$/) });

/** Set or change a budget. `target` is "total", a category id, or null to choose. A change applies from the chosen month onward. */
export default function BudgetForm({ data, target = null, onClose, onSaved }) {
  const line = (t) => data.lines.find((l) => l.categoryId === t);
  const current = target === "total" ? (data.overall?.source === "total" ? data.overall.budgetMinor : null) : line(target)?.budgetMinor ?? null;
  const { register, control, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { target: target ?? "", amount: current != null ? fromMinor(current) : "", from: data.month } });
  const picked = watch("target"), spent = picked === "total" ? data.totalSpentMinor : picked ? line(picked)?.spentMinor : null;
  const next = shiftMonth(data.month, 1);
  const options = [{ value: "total", label: "Overall monthly budget", hint: "All expenses" }, ...data.lines.filter((l) => !l.archived).map((l) => ({ value: l.categoryId, label: l.nameEn, hint: l.nameBn }))];
  async function submit(v) {
    try { await api("/api/budgets", { method: "PUT", body: { categoryId: v.target === "total" ? null : v.target, month: v.from, amountMinor: toMinor(v.amount) } }); toast.success("Budget saved"); onSaved(); }
    catch (e) { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "amountMinor" ? "amount" : k === "categoryId" ? "target" : k, { message: m[0] })); toast.error(e.message); }
  }
  return (
    <Dialog title={current != null ? "Change budget" : "Set budget"} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Field as="div" label="Budget for" error={errors.target}><Controller control={control} name="target" render={({ field }) => <Select aria-label="Budget for" value={field.value} onChange={field.onChange} options={options} placeholder="Choose overall or a category" disabled={target != null} invalid={!!errors.target} />} /></Field>
        <div><Field label="Monthly limit (BDT)" error={errors.amount}><input type="number" step="0.01" inputMode="decimal" className="field" {...register("amount")} /></Field>
          {spent != null && <p className="mt-1.5 text-sm text-muted">Spent so far in {fmtMonth(data.month)}: <b className="text-ink">{formatBDT(spent)}</b></p>}</div>
        <Field as="div" label="Applies from"><Controller control={control} name="from" render={({ field }) => <Select aria-label="Applies from" value={field.value} onChange={field.onChange} options={[{ value: data.month, label: `From ${fmtMonth(data.month)}` }, { value: next, label: `From ${fmtMonth(next)} (next month)` }]} />} /></Field>
        <p className="text-sm text-muted">The limit carries forward every month until you change it. Earlier months keep the budget they had.</p>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saving…" : "Save budget"}</button></div>
      </form>
    </Dialog>
  );
}
