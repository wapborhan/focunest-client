"use client";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import Field from "./ui/Field";
import DatePicker from "./ui/DatePicker";
import { api } from "@/lib/client-api";
import { toMinor, fromMinor } from "@/lib/money";
import { dhakaToday } from "@/lib/dates";

const PROVIDERS = ["bKash", "Nagad", "Rocket", "Upay"];
const build = (type) => z.object({
  name: z.string().trim().min(1, "Enter a name").max(60),
  provider: z.string().trim().max(60).optional(), identifier: z.string().trim().max(40).optional(),
  openingBalance: z.coerce.number({ invalid_type_error: "Enter an amount" }).min(0, "Can't be negative").max(1e10),
  openingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), notes: z.string().trim().max(500).optional(), allowNegative: z.boolean(),
}).refine((v) => type !== "mobile" || !!v.provider, { path: ["provider"], message: "Choose a provider such as bKash" });

export default function AccountForm({ type, account, onClose, onSaved }) {
  const locked = !!account && account.entryCount > 0;
  const { register, control, handleSubmit, setValue, setError, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(build(type)),
    defaultValues: account ? { name: account.name, provider: account.provider ?? "", identifier: "", openingBalance: fromMinor(account.openingBalanceMinor), openingDate: account.openingDate.slice(0, 10), notes: account.notes ?? "", allowNegative: account.allowNegative }
      : { name: "", provider: "", identifier: "", openingBalance: 0, openingDate: dhakaToday(), notes: "", allowNegative: false },
  });
  async function submit(v) {
    const body = { name: v.name, provider: v.provider || undefined, identifier: v.identifier || undefined, notes: v.notes || undefined, allowNegative: v.allowNegative, ...(locked ? {} : { openingBalanceMinor: toMinor(v.openingBalance), openingDate: v.openingDate }) };
    try {
      await (account ? api(`/api/accounts/${account.id}`, { method: "PATCH", body }) : api("/api/accounts", { method: "POST", body: { ...body, type } }));
      toast.success(account ? "Account updated" : "Account added"); onSaved();
    } catch (e) { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "openingBalanceMinor" ? "openingBalance" : k, { message: m[0] })); toast.error(e.message); }
  }
  const provider = watch("provider");
  return (
    <Dialog title={account ? "Edit account" : "Add account"} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Field label="Account name" error={errors.name}><input className="field" {...register("name")} /></Field>
        {type !== "cash" && (<div><Field label={type === "bank" ? "Bank name" : "Provider"} error={errors.provider}><input className="field" {...register("provider")} /></Field>
          {type === "mobile" && <div className="mt-2 flex flex-wrap gap-2">{PROVIDERS.map((p) => (<button key={p} type="button" onClick={() => setValue("provider", p, { shouldValidate: true })}
            className={`rounded-full border px-3 py-1 text-sm transition ${provider === p ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand hover:text-brand"}`}>{p}</button>))}</div>}</div>)}
        {type !== "cash" && <Field label={<>Account number or label <span className="font-normal text-muted">(shown masked)</span></>}><input className="field" placeholder={account?.identifierMasked ?? ""} {...register("identifier")} /></Field>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opening balance (BDT)" error={errors.openingBalance}><input type="number" step="0.01" disabled={locked} className="field" {...register("openingBalance")} /></Field>
          <Field as="div" label="Opening date" error={errors.openingDate}><Controller control={control} name="openingDate" render={({ field }) => <DatePicker aria-label="Opening date" disabled={locked} value={field.value} onChange={field.onChange} />} /></Field>
        </div>
        {locked && <p className="text-sm text-muted">Opening balance and date are locked because this account has transactions.</p>}
        <Field label="Notes"><textarea rows={2} className="field resize-none" {...register("notes")} /></Field>
        <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#0f766e]" {...register("allowNegative")} />Allow balance below zero</label>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saving…" : "Save account"}</button></div>
      </form>
    </Dialog>
  );
}
