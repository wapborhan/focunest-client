"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArchiveRestore, ArrowDownToLine, ArrowUpFromLine, Tags } from "lucide-react";
import Dialog from "./Dialog";
import Field from "./ui/Field";
import DataTable from "./ui/DataTable";
import StatCard from "./ui/StatCard";
import { api } from "@/lib/client-api";

const KINDS = { income: ["Income categories", ArrowDownToLine, "income category"], expense: ["Expense categories", ArrowUpFromLine, "expense category"] };
const schema = z.object({ nameEn: z.string().trim().min(1, "Enter a name").max(40, "At most 40 characters"), nameBn: z.string().trim().max(40, "At most 40 characters") });

function CategoryForm({ kind, category, onClose, onSaved }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { nameEn: category?.nameEn ?? "", nameBn: category?.nameBn ?? "" } });
  async function submit(v) {
    try {
      if (category) await api(`/api/categories/${category.id}`, { method: "PATCH", body: { nameEn: v.nameEn, nameBn: v.nameBn || null } });
      else await api("/api/categories", { method: "POST", body: { kind, nameEn: v.nameEn, nameBn: v.nameBn || undefined } });
      toast.success(category ? "Category updated" : "Category added"); onSaved();
    } catch (e) { if (e.status === 409) setError("nameEn", { message: e.message }); else toast.error(e.message); }
  }
  return (
    <Dialog title={category ? "Edit category" : `Add ${KINDS[kind][2]}`} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <Field label="Name (English)" error={errors.nameEn}><input className="field" {...register("nameEn")} /></Field>
        <Field label={<>Name (বাংলা) <span className="font-normal text-muted">(optional)</span></>} error={errors.nameBn}><input lang="bn" className="field" {...register("nameBn")} /></Field>
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? "Saving…" : "Save category"}</button></div>
      </form>
    </Dialog>
  );
}

/** Manage income and expense categories. Categories are archived, never deleted, so old transactions keep their category. */
export default function CategoriesView({ categories, initialKind }) {
  const router = useRouter(); const [kind, setKind] = useState(initialKind); const [form, setForm] = useState(null); const [showArchived, setShowArchived] = useState(false); const [busy, setBusy] = useState(null);
  const all = categories[kind], archived = all.filter((c) => c.archived), rows = showArchived ? all : all.filter((c) => !c.archived);
  const pick = (k) => { setKind(k); window.history.replaceState(null, "", `?kind=${k}`); };
  async function setArchived(c, value) {
    setBusy(c.id);
    try { await api(`/api/categories/${c.id}`, { method: "PATCH", body: { archived: value } }); toast.success(value ? `${c.nameEn} archived` : `${c.nameEn} restored`); router.refresh(); }
    catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }
  const columns = [
    { key: "n", header: "Category", role: "title", cell: (c) => (<span className={`flex flex-wrap items-center gap-2 ${c.archived ? "text-muted" : "font-medium"}`}>{c.nameEn}{c.isDefault && <span className="badge !bg-surface-3 !text-muted">Default</span>}</span>) },
    { key: "bn", header: "বাংলা", cell: (c) => c.nameBn ? <span lang="bn">{c.nameBn}</span> : <span className="text-muted">—</span> },
    { key: "u", header: "Used in", nowrap: true, cell: (c) => <span className="tabular-nums">{c.used} {c.used === 1 ? "entry" : "entries"}</span> },
    { key: "s", header: "Status", cell: (c) => <span className={`badge ${c.archived ? "!bg-surface-3 !text-muted" : ""}`}>{c.archived ? "Archived" : "Active"}</span> },
    { key: "a", role: "actions", align: "right", cell: (c) => (<div className="flex justify-end gap-1"><button aria-label={`Edit ${c.nameEn}`} onClick={() => setForm(c)} className="icon-btn"><Pencil size={16} /></button>
      <button aria-label={`${c.archived ? "Restore" : "Archive"} ${c.nameEn}`} title={c.archived ? "Restore" : "Archive"} disabled={busy === c.id} onClick={() => setArchived(c, !c.archived)} className="icon-btn">{c.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}</button></div>) },
  ];
  const [, , noun] = KINDS[kind];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard i={0} icon={Tags} title={KINDS[kind][0]} value={all.length - archived.length} note="Active" /><StatCard i={1} icon={Archive} title="Archived" value={archived.length} note="Hidden from the pickers" /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Category type" className="flex rounded-2xl border border-line bg-surface p-1 shadow-sm">{Object.entries(KINDS).map(([k, [label, Icon]]) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => pick(k)} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${kind === k ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-primary"}`}><Icon size={16} aria-hidden />{label}</button>))}</div>
        <button onClick={() => setForm("new")} className="btn btn-primary"><Plus size={16} aria-hidden />Add {noun}</button></div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="max-w-xl text-muted">Archived categories disappear from the pickers when you add an entry, but past transactions keep them. Categories can't be deleted.</p>
        {archived.length > 0 && <label className="flex items-center gap-2.5"><input type="checkbox" className="h-4 w-4 accent-[#0f766e]" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived ({archived.length})</label>}</div>
      <div key={kind} role="tabpanel" className="animate-fade-up"><DataTable columns={columns} rows={rows} caption={KINDS[kind][0]} /></div>
      {form && <CategoryForm kind={kind} category={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); router.refresh(); }} />}
    </div>
  );
}
