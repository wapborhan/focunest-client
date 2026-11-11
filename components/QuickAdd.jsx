"use client";
import TransactionForm from "./TransactionForm";
import { LoanForm } from "./LoanForms";
/** Quick-action dialogs for the dashboard (transfers live under Cash Management > Transfers). Accounts and categories were already loaded on the server with the page. */
export default function QuickAdd({ action, accounts, categories, onClose, onSaved }) {
  if (action === "income" || action === "expense") return <TransactionForm kind={action} tx={null} accounts={accounts} categories={categories[action]} onClose={onClose} onSaved={onSaved} />;
  return <LoanForm direction={action === "lent" ? "lent" : "borrowed"} accounts={accounts} onClose={onClose} onSaved={onSaved} />;
}
