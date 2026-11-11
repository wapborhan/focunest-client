"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Archive, ArrowLeftRight, Banknote, Building2, Smartphone, Wallet, Layers, ChevronDown, PowerOff } from "lucide-react";
import AccountForm from "./AccountForm";
import TransferForm from "./TransferForm";
import Dialog from "./Dialog";
import DataTable from "./ui/DataTable";
import Popover from "./ui/Popover";
import AccountNumber from "./ui/AccountNumber";
import StatCard from "./ui/StatCard";
import { AccountIcon } from "./ui/ProviderIcon";
import { api } from "@/lib/client-api";
import { formatBDT } from "@/lib/money";
import { formatDhaka } from "@/lib/dates";
import { SUBTYPE_LABEL, CARD_LABEL, TYPE_LABEL } from "@/lib/account-display";

const TABS = [["all", "All accounts", Layers, "account"], ["cash", "Cash", Banknote, "cash account"], ["bank", "Bank accounts", Building2, "bank account"], ["mobile", "Mobile banking", Smartphone, "mobile banking account"]];
const dash = <span className="text-muted">—</span>;
const Who = ({ a, size = 32 }) => (<div className="flex min-w-0 items-center gap-3"><AccountIcon account={a} size={size} /><div className="min-w-0"><span className="block truncate font-medium">{a.provider ?? a.name}</span>{a.provider && <span className="block truncate text-xs text-muted">{a.name}</span>}</div></div>);
const Balance = (a) => <span className={`font-semibold tabular-nums ${a.balanceMinor < 0 ? "text-danger" : ""}`}>{formatBDT(a.balanceMinor)}</span>;

/** Accounts load once on the server. Switching tabs is instant and makes no request. */
export default function AccountsView({ accounts, initialType }) {
  const router = useRouter(); const [type, setType] = useState(initialType);
  const [form, setForm] = useState(null); const [confirm, setConfirm] = useState(null); const [transfer, setTransfer] = useState(false);
  const [newType, setNewType] = useState("cash"); const [menu, setMenu] = useState(false);   // newType: which kind of account "Add" creates
  const tab = TABS.find((t) => t[0] === type), TabIcon = tab[2], rows = type === "all" ? accounts : accounts.filter((a) => a.type === type), total = rows.reduce((s, a) => s + a.balanceMinor, 0);
  const count = (t) => accounts.filter((a) => a.type === t).length;
  const cards = type === "all"
    ? [["Total balance", formatBDT(total), "All accounts", Wallet], ["Accounts", rows.length, `${count("cash")} cash · ${count("bank")} bank · ${count("mobile")} mobile`, Layers], ["Inactive", rows.filter((a) => !a.active).length, "Can't take new entries", PowerOff]]
    : [[`Total in ${tab[1].toLowerCase()}`, formatBDT(total), undefined, Wallet], ["Accounts", rows.length, "In this tab", Layers], ["All accounts", formatBDT(accounts.reduce((s, a) => s + a.balanceMinor, 0)), `${accounts.length} active`, Wallet]];
  const pick = (t) => { setType(t); window.history.replaceState(null, "", `?type=${t}`); };
  const done = () => { setForm(null); setTransfer(false); router.refresh(); };
  async function archive(a) { try { await api(`/api/accounts/${a.id}`, { method: "PATCH", body: { status: "archived" } }); toast.success("Account archived"); router.refresh(); } catch (e) { toast.error(e.message); } finally { setConfirm(null); } }
  const actions = { key: "actions", role: "actions", align: "right", cell: (a) => (<div className="flex justify-end gap-1"><button aria-label={`Edit ${a.name}`} onClick={() => setForm(a)} className="icon-btn"><Pencil size={16} /></button><button aria-label={`Archive ${a.name}`} onClick={() => setConfirm(a)} className="icon-btn"><Archive size={16} /></button></div>) };
  const link = (a, content) => <Link href={`/cash/accounts/${a.id}`} className="hover:text-primary [&_span:first-child]:hover:underline">{content}</Link>;
  const COLUMNS = {
    all: [{ key: "n", header: "Account", role: "title", cell: (a) => link(a, <Who a={a} />) },
      { key: "ty", header: "Type", cell: (a) => (<><span className="badge">{TYPE_LABEL[a.type]}</span>{a.type === "bank" && a.subtype && <span className="mt-0.5 block text-xs text-muted">{SUBTYPE_LABEL[a.subtype]}</span>}</>) },
      { key: "no", header: "Account / mobile no.", nowrap: true, cell: (a) => a.type === "bank" ? <AccountNumber account={a} /> : a.type === "mobile" ? <span className="tabular-nums">{a.numberLabel ?? "—"}</span> : dash },
      { key: "s", header: "Status", cell: (a) => <span className={`badge ${a.active ? "" : "!bg-surface-3 !text-muted"}`}>{a.active ? "Active" : "Inactive"}</span> },
      { key: "b", header: "Balance", align: "right", role: "amount", nowrap: true, cell: Balance }, actions],
    cash: [{ key: "n", header: "Account", role: "title", cell: (a) => link(a, <Who a={a} />) }, { key: "o", header: "Opened", nowrap: true, cell: (a) => formatDhaka(a.openingDate) }, { key: "b", header: "Balance", align: "right", role: "amount", nowrap: true, cell: Balance }, actions],
    bank: [{ key: "n", header: "Bank", role: "title", cell: (a) => link(a, <Who a={a} />) }, { key: "no", header: "Account no.", nowrap: true, cell: (a) => <AccountNumber account={a} /> },
      { key: "t", header: "Type", cell: (a) => a.subtype ? <span className="badge">{SUBTYPE_LABEL[a.subtype]}</span> : dash },
      { key: "br", header: "Branch", cell: (a) => a.branch || a.routingNumber ? (<><span className="block">{a.branch ?? "—"}</span>{a.routingNumber && <span className="block text-xs text-muted">Routing {a.routingNumber}</span>}</>) : dash },
      { key: "c", header: "Card", nowrap: true, cell: (a) => a.cardType ? (<><span className="block">{CARD_LABEL[a.cardType]}</span><span className="block text-xs tabular-nums text-muted">{a.cardMasked}</span></>) : dash },
      { key: "b", header: "Balance", align: "right", role: "amount", nowrap: true, cell: Balance }, actions],
    mobile: [{ key: "n", header: "Provider", role: "title", cell: (a) => link(a, <Who a={a} />) }, { key: "no", header: "Mobile no.", nowrap: true, cell: (a) => <span className="tabular-nums">{a.numberLabel ?? "—"}</span> },
      { key: "s", header: "Status", cell: (a) => <span className={`badge ${a.active ? "" : "!bg-surface-3 !text-muted"}`}>{a.active ? "Active" : "Inactive"}</span> },
      { key: "b", header: "Balance", align: "right", role: "amount", nowrap: true, cell: Balance }, actions],
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">{cards.map(([title, value, note, Icon], n) => <StatCard key={title} i={n} icon={Icon} title={title} value={value} note={note} />)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Account type" className="flex max-w-full overflow-x-auto rounded-2xl border border-line bg-surface p-1 shadow-sm">
          {TABS.map(([k, label, Icon]) => (<button key={k} role="tab" aria-selected={type === k} onClick={() => pick(k)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${type === k ? "bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/25" : "text-muted hover:bg-brand-soft hover:text-primary"}`}>
            <Icon size={16} aria-hidden />{label}<span className={`rounded-full px-1.5 text-xs ${type === k ? "bg-white/25" : "bg-surface-3"}`}>{k === "all" ? accounts.length : count(k)}</span></button>))}</div>
        <div className="flex gap-2"><button onClick={() => setTransfer(true)} className="btn btn-ghost"><ArrowLeftRight size={16} aria-hidden />Transfer money</button>
          {type === "all"
            ? (<Popover open={menu} onOpenChange={setMenu} placement="bottom-end" className="w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
              trigger={(p) => (<button type="button" {...p} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="btn btn-primary"><Plus size={16} aria-hidden />Add account<ChevronDown size={16} aria-hidden /></button>)}>
              <div role="menu">{TABS.slice(1).map(([k, _label, Icon, noun]) => (<button key={k} type="button" role="menuitem" onClick={() => { setMenu(false); setNewType(k); setForm("new"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-brand-soft"><Icon size={16} aria-hidden className="text-primary" />{noun[0].toUpperCase() + noun.slice(1)}</button>))}</div></Popover>)
            : <button onClick={() => { setNewType(type); setForm("new"); }} className="btn btn-primary"><Plus size={16} aria-hidden />Add {tab[3]}</button>}</div>
      </div>
      <div key={type} role="tabpanel" className="animate-fade-up">
        <DataTable columns={COLUMNS[type]} rows={rows} caption={`${tab[1]} accounts`}
          empty={<><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-primary"><TabIcon aria-hidden /></span><p className="mt-4 font-semibold">No {tab[3]}s yet</p><p className="mt-1 text-muted">Add one with its opening balance to start tracking.</p></>} />
      </div>
      {form && <AccountForm type={form === "new" ? newType : form.type} account={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={done} />}
      {transfer && <TransferForm accounts={accounts} onClose={() => setTransfer(false)} onSaved={done} />}
      {confirm && (<Dialog title="Archive this account?" onClose={() => setConfirm(null)}>
        <p className="text-muted"><b className="text-ink">{confirm.name}</b> will be hidden from your balances. Its history is kept. Only accounts with a zero balance can be archived.</p>
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirm(null)} className="btn btn-ghost">Cancel</button><button onClick={() => archive(confirm)} className="btn btn-danger">Archive account</button></div></Dialog>)}
    </div>
  );
}
