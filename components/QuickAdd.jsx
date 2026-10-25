"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import TransactionForm from "./TransactionForm";
import { LoanForm } from "./LoansView";
import TransferForm from "./TransferForm";
import { api } from "@/lib/client-api";

/** Loads what each quick-action dialog needs, then shows the same form used on its own page. */
export default function QuickAdd({ action, onClose, onSaved }) {
  const [accounts, setAccounts] = useState(null); const [categories, setCategories] = useState([]);
  const kind = action === "income" || action === "expense" ? action : null;
  const loadCats = useCallback(() => (kind ? api(`/api/categories?kind=${kind}`).then((r) => setCategories(r.items)) : Promise.resolve()), [kind]);
  useEffect(() => {
    if (action === "transfer") return;
    Promise.all([api("/api/accounts").then((r) => setAccounts(r.items)), loadCats()]).catch((e) => { toast.error(e.message); onClose(); });
  }, [action, loadCats, onClose]);
  if (action === "transfer") return <TransferForm onClose={onClose} onSaved={onSaved} />;
  if (!accounts) return null;
  if (kind) return <TransactionForm kind={kind} tx={null} accounts={accounts} categories={categories} onClose={onClose} onSaved={onSaved} onCategoryAdded={loadCats} />;
  return <LoanForm direction={action === "lent" ? "lent" : "borrowed"} accounts={accounts} onClose={onClose} onSaved={onSaved} />;
}
