"use client";
import { useMemo } from "react";
import Select from "./Select";
import { AccountIcon } from "./ProviderIcon";
import { formatBDT } from "@/lib/money";
import { accountMeta, GROUP_LABEL } from "@/lib/account-display";

const ORDER = ["cash", "bank", "mobile"];
/** Accounts grouped as Cash / Bank accounts / Mobile banking. Each shows its icon, name, number and balance. */
export function accountOptions(accounts, { selected, includeInactive = false } = {}) {
  return accounts
    .filter((a) => includeInactive || a.id === selected || (a.status === "active" && a.active !== false))
    .map((a, i) => ({ a, i })).sort((x, y) => ORDER.indexOf(x.a.type) - ORDER.indexOf(y.a.type) || x.i - y.i)
    .map(({ a }) => { const m = accountMeta(a); return {
      value: a.id, label: m.title, sub: `${m.sub}${a.active === false ? " · Inactive" : ""}`, hint: formatBDT(a.balanceMinor), group: GROUP_LABEL[a.type], icon: <AccountIcon account={a} size={30} />,
      keywords: `${a.name} ${a.provider ?? ""} ${a.numberLabel ?? ""}`,
    }; });
}
export default function AccountSelect({ accounts, value, onChange, all, exclude, includeInactive, placeholder = "Choose an account", ...rest }) {
  const options = useMemo(() => [...(all ? [{ value: "", label: all }] : []), ...accountOptions(accounts, { selected: value, includeInactive }).filter((o) => o.value !== exclude)], [accounts, value, all, exclude, includeInactive]);
  return <Select value={value} onChange={onChange} options={options} placeholder={placeholder} {...rest} />;
}
