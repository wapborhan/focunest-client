"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import { api } from "@/lib/client-api";
import { toMinor, fromMinor } from "@/lib/money";
import { dhakaToday } from "@/lib/dates";

const build = (type) => z.object({
  name: z.string().trim().min(1, "Enter a name").max(60),
  provider: z.string().trim().max(60).optional(),
  identifier: z.string().trim().max(40).optional(),
  openingBalance: z.coerce.number({ invalid_type_error: "Enter an amount" }).min(0, "Can't be negative").max(1e10),
  openingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  notes: z.string().trim().max(500).optional(),
  allowNegative: z.boolean(),
}).refine((v) => type !== "mobile" || !!v.provider, { path: ["provider"], message: "Choose a provider such as bKash" });

const field = "mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-black/5";
const Err = ({ e }) => (e ? <p role="alert" className="mt-1 text-sm text-red-700">{e.message}</p> : null);

export default function AccountForm({ type, account, onClose, onSaved }) {
  const locked = !!account && account.entryCount > 0;
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(build(type)),
    defaultValues: account ? { name: account.name, provider: account.provider ?? "", identifier: "", openingBalance: fromMinor(account.openingBalanceMinor), openingDate: account.openingDate.slice(0, 10), notes: account.notes ?? "", allowNegative: account.allowNegative }
      : { name: "", provider: "", identifier: "", openingBalance: 0, openingDate: dhakaToday(), notes: "", allowNegative: false },
  });
  async function submit(v) {
    const body = { name: v.name, provider: v.provider || undefined, identifier: v.identifier || undefined, notes: v.notes || undefined, allowNegative: v.allowNegative, ...(locked ? {} : { openingBalanceMinor: toMinor(v.openingBalance), openingDate: v.openingDate }) };
    try {
      const saved = account ? await api(`/api/accounts/${account.id}`, { method: "PATCH", body }) : await api("/api/accounts", { method: "POST", body: { ...body, type } });
      toast.success(account ? "Account updated" : "Account added"); onSaved(saved);
    } catch (e) {
      Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "openingBalanceMinor" ? "openingBalance" : k, { message: m[0] }));
      toast.error(e.message);
    }
  }
  return (
    <Dialog title={account ? "Edit account" : "Add account"} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
        <label className="block">Account name<input className={field} {...register("name")} /><Err e={errors.name} /></label>
        {type !== "cash" && (<label className="block">{type === "bank" ? "Bank name" : "Provider"}
          <input className={field} list="providers" {...register("provider")} />
          {type === "mobile" && <datalist id="providers"><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Upay</option></datalist>}
          <Err e={errors.provider} /></label>)}
        {type !== "cash" && (<label className="block">Account number or label <span className="text-muted">(shown masked)</span>
          <input className={field} placeholder={account?.identifierMasked ?? ""} {...register("identifier")} /></label>)}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Opening balance (BDT)<input type="number" step="0.01" disabled={locked} className={field} {...register("openingBalance")} /><Err e={errors.openingBalance} /></label>
          <label className="block">Opening date<input type="date" disabled={locked} className={field} {...register("openingDate")} /><Err e={errors.openingDate} /></label>
        </div>
        {locked && <p className="text-sm text-muted">Opening balance and date are locked because this account has transactions.</p>}
        <label className="block">Notes<textarea rows={2} className={field} {...register("notes")} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" {...register("allowNegative")} />Allow balance below zero</label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 hover:bg-black/5">Cancel</button>
          <button disabled={isSubmitting} className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-60">{isSubmitting ? "Saving…" : "Save account"}</button>
        </div>
      </form>
    </Dialog>
  );
}
