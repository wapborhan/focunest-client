export const TYPE_LABEL = { cash: "Cash", bank: "Bank account", mobile: "Mobile banking" };
export const GROUP_LABEL = { cash: "Cash", bank: "Bank accounts", mobile: "Mobile banking" };
export const SUBTYPE_LABEL = { saving: "Savings", current: "Current" };
export const CARD_LABEL = { debit: "Debit card", credit: "Credit card" };
/** Title and second line used wherever an account is picked or listed. */
export function accountMeta(a) {
  if (a.type === "cash") return { title: a.name, sub: "Cash in hand" };
  const num = a.numberLabel ? (a.type === "bank" ? `A/C ${a.numberLabel}` : a.numberLabel) : null;
  return { title: a.provider ?? a.name, sub: [a.name, num, a.type === "bank" ? SUBTYPE_LABEL[a.subtype] : null].filter(Boolean).join(" · ") };
}
