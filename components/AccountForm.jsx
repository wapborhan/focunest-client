"use client";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Dialog from "./Dialog";
import Field from "./ui/Field";
import Select from "./ui/Select";
import DatePicker from "./ui/DatePicker";
import ProviderIcon from "./ui/ProviderIcon";
import { api } from "@/lib/client-api";
import { toMinor, fromMinor } from "@/lib/money";
import { dhakaToday } from "@/lib/dates";
import { BANKS, MFS_PROVIDERS, OTHER, findBank, findMfs } from "@/lib/banks";
import { normalizeMobile } from "@/lib/schemas/account";

const BANK_OPTIONS = [...BANKS.map((b) => ({ value: b.code, label: b.name, group: b.group, keywords: b.short, icon: <ProviderIcon kind="bank" code={b.code} size={28} /> })), { value: OTHER, label: "Other bank…", group: "Not listed", icon: <ProviderIcon kind="bank" code={OTHER} name="?" size={28} /> }];
const MFS_OPTIONS = [...MFS_PROVIDERS.map((m) => ({ value: m.code, label: m.name, keywords: m.short, icon: <ProviderIcon kind="mobile" code={m.code} size={28} /> })), { value: OTHER, label: "Other provider…", icon: <ProviderIcon kind="mobile" code={OTHER} name="?" size={28} /> }];
const SUBTYPES = [{ value: "saving", label: "Savings" }, { value: "current", label: "Current" }];
const CARDS = [{ value: "", label: "No card" }, { value: "debit", label: "Debit card" }, { value: "credit", label: "Credit card" }];
const Section = ({ children }) => <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted">{children}</p>;

function build(type, account) {
  const editing = !!account;
  return z.object({
    name: z.string().trim().min(1, type === "mobile" ? "Enter the account holder's name" : "Enter a name").max(60),
    providerCode: z.string(), providerOther: z.string().trim().max(80), identifier: z.string().trim(), subtype: z.string(), branch: z.string().trim().max(80), routingNumber: z.string().trim(),
    cardType: z.string(), cardNumber: z.string().trim(), active: z.boolean(),
    openingBalance: z.coerce.number({ invalid_type_error: "Enter an amount" }).min(0, "Can't be negative").max(1e10), openingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    notes: z.string().trim().max(500), allowNegative: z.boolean(),
  }).superRefine((v, ctx) => {
    const bad = (path, message) => ctx.addIssue({ code: "custom", path: [path], message });
    if (type === "cash") return;
    if (!v.providerCode) bad("providerCode", type === "bank" ? "Choose a bank" : "Choose a provider");
    if (v.providerCode === OTHER && !v.providerOther) bad("providerOther", "Enter the name");
    if (type === "mobile") { if (!/^01[3-9]\d{8}$/.test(normalizeMobile(v.identifier))) bad("identifier", "Enter a valid mobile number (01XXXXXXXXX)"); return; }
    if (!editing && !v.identifier) bad("identifier", "Enter the account number");
    else if (v.identifier && !/^[A-Za-z0-9-\s]{5,30}$/.test(v.identifier)) bad("identifier", "Enter a valid account number");
    if (!v.subtype) bad("subtype", "Choose the account type");
    if (v.routingNumber && !/^\d{9}$/.test(v.routingNumber)) bad("routingNumber", "Routing number is 9 digits");
    const hadCard = editing && account.cardType && account.cardLast4;
    if (v.cardType && !v.cardNumber && !(hadCard && account.cardType === v.cardType)) bad("cardNumber", "Enter the card number");
    if (v.cardNumber && !/^\d{4,19}$/.test(v.cardNumber.replace(/[\s-]/g, ""))) bad("cardNumber", "Enter the card number, or just its last 4 digits");
  });
}

export default function AccountForm({ type, account, onClose, onSaved }) {
  const locked = !!account && account.entryCount > 0, editing = !!account;
  const list = type === "bank" ? findBank : findMfs;
  const { register, control, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(build(type, account)),
    defaultValues: account ? {
      name: account.name, providerCode: account.providerCode && (account.providerCode === OTHER || list(account.providerCode)) ? account.providerCode : account.provider ? OTHER : "", providerOther: account.providerCode === OTHER || !list(account.providerCode ?? "") ? account.provider ?? "" : "",
      identifier: type === "mobile" ? account.numberLabel ?? "" : "", subtype: account.subtype ?? "saving", branch: account.branch ?? "", routingNumber: account.routingNumber ?? "", cardType: account.cardType ?? "", cardNumber: "", active: account.active,
      openingBalance: fromMinor(account.openingBalanceMinor), openingDate: account.openingDate.slice(0, 10), notes: account.notes ?? "", allowNegative: account.allowNegative,
    } : { name: "", providerCode: "", providerOther: "", identifier: "", subtype: "saving", branch: "", routingNumber: "", cardType: "", cardNumber: "", active: true, openingBalance: 0, openingDate: dhakaToday(), notes: "", allowNegative: false },
  });
  const [code, cardType] = watch(["providerCode", "cardType"]);
  async function submit(v) {
    const opt = (x) => (editing ? x : x || undefined);   // when editing, blank clears a field
    let body = { name: v.name, notes: opt(v.notes), allowNegative: v.allowNegative, ...(locked ? {} : { openingBalanceMinor: toMinor(v.openingBalance), openingDate: v.openingDate }) };
    if (type !== "cash") body = { ...body, providerCode: v.providerCode, provider: v.providerCode === OTHER ? v.providerOther : list(v.providerCode)?.name };
    if (type === "mobile") body = { ...body, identifier: v.identifier, active: v.active };
    if (type === "bank") {
      body = { ...body, subtype: v.subtype, branch: opt(v.branch), routingNumber: opt(v.routingNumber), ...(v.identifier ? { identifier: v.identifier } : {}) };
      if (v.cardType) body = { ...body, cardType: v.cardType, ...(v.cardNumber ? { cardNumber: v.cardNumber } : {}) };
      else if (account?.cardType) body = { ...body, cardType: null };
    }
    try {
      await (editing ? api(`/api/accounts/${account.id}`, { method: "PATCH", body }) : api("/api/accounts", { method: "POST", body: { ...body, type } }));
      toast.success(editing ? "Account updated" : "Account added"); onSaved();
    } catch (e) { Object.entries(e.details ?? {}).forEach(([k, m]) => setError(k === "openingBalanceMinor" ? "openingBalance" : k, { message: m[0] })); toast.error(e.message); }
  }
  const nameLabel = type === "bank" ? "Bank account name" : type === "mobile" ? "Account holder name" : "Account name";
  return (
    <Dialog title={editing ? "Edit account" : type === "bank" ? "Add bank account" : type === "mobile" ? "Add mobile banking account" : "Add cash account"} onClose={onClose} wide>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        {type !== "cash" && <>
          {type === "bank" && <Section>Bank details</Section>}
          <Field as="div" label={type === "bank" ? "Bank name" : "Provider"} error={errors.providerCode}><Controller control={control} name="providerCode" render={({ field }) => <Select aria-label={type === "bank" ? "Bank name" : "Provider"} value={field.value} onChange={field.onChange} options={type === "bank" ? BANK_OPTIONS : MFS_OPTIONS} placeholder={type === "bank" ? "Search and choose a bank" : "Choose a provider"} invalid={!!errors.providerCode} />} /></Field>
          {code === OTHER && <Field label={type === "bank" ? "Bank name" : "Provider name"} error={errors.providerOther}><input className="field" {...register("providerOther")} /></Field>}
        </>}
        <Field label={nameLabel} error={errors.name}><input className="field" {...register("name")} /></Field>
        {type === "bank" && <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<>Account number{editing && <span className="font-normal text-muted"> (blank keeps current)</span>}</>} error={errors.identifier}><input inputMode="numeric" autoComplete="off" className="field" placeholder={account?.numberLabel ?? ""} {...register("identifier")} /></Field>
          <Field as="div" label="Account type" error={errors.subtype}><Controller control={control} name="subtype" render={({ field }) => <Select aria-label="Account type" value={field.value} onChange={field.onChange} options={SUBTYPES} />} /></Field></div>}
        {type === "mobile" && <>
          <Field label="Mobile number" error={errors.identifier}><input type="tel" inputMode="tel" autoComplete="off" placeholder="01XXXXXXXXX" className="field" {...register("identifier")} /></Field>
          <Field as="div" label="Status"><Controller control={control} name="active" render={({ field }) => (
            <div role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2">{[[true, "Active"], [false, "Inactive"]].map(([val, l]) => (
              <button key={l} type="button" role="radio" aria-checked={field.value === val} onClick={() => field.onChange(val)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${field.value === val ? (val ? "border-brand bg-brand-soft text-primary-strong ring-4 ring-brand/10" : "border-line-strong bg-surface-3 text-ink ring-4 ring-line") : "border-line bg-surface text-muted hover:border-line-strong"}`}>{l}</button>))}</div>)} />
            <p className="mt-1.5 text-xs text-muted">Inactive accounts keep their balance but can't be used for new transactions or transfers.</p></Field></>}
        {type === "bank" && <>
          <Section>Branch</Section>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Branch name" error={errors.branch}><input className="field" {...register("branch")} /></Field>
            <Field label="Routing number" error={errors.routingNumber}><input inputMode="numeric" maxLength={9} placeholder="9 digits" className="field" {...register("routingNumber")} /></Field></div>
          <Section>Card</Section>
          <div className="grid gap-4 sm:grid-cols-2"><Field as="div" label="Card type"><Controller control={control} name="cardType" render={({ field }) => <Select aria-label="Card type" value={field.value} onChange={field.onChange} options={CARDS} />} /></Field>
            {cardType && <Field label={<>Card number{editing && account.cardMasked && <span className="font-normal text-muted"> (blank keeps {account.cardMasked})</span>}</>} error={errors.cardNumber}><input inputMode="numeric" autoComplete="off" className="field" {...register("cardNumber")} /></Field>}</div>
          {cardType && <p className="-mt-2 text-xs text-muted">For your safety only the last 4 digits are saved. You can enter the full number or just the last 4.</p>}
        </>}
        <Section>Opening balance</Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opening balance (BDT)" error={errors.openingBalance}><input type="number" step="0.01" disabled={locked} className="field" {...register("openingBalance")} /></Field>
          <Field as="div" label="Opening date" error={errors.openingDate}><Controller control={control} name="openingDate" render={({ field }) => <DatePicker aria-label="Opening date" disabled={locked} value={field.value} onChange={field.onChange} />} /></Field></div>
        {locked && <p className="-mt-2 text-sm text-muted">Opening balance and date are locked because this account has transactions.</p>}
        <Field label="Notes"><textarea rows={2} className="field resize-none" {...register("notes")} /></Field>
        <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#0f766e]" {...register("allowNegative")} />Allow balance below zero</label>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saving…" : "Save account"}</button></div>
      </form>
    </Dialog>
  );
}
