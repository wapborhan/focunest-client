import { requirePageUser } from "@/lib/auth";
import { parseQuery } from "@/lib/search-params";
import { listTransactionsQuery } from "@/lib/schemas/transaction";
import { listTransactions, periodTotals } from "@/lib/services/transactions";
import { listAccounts } from "@/lib/services/accounts";
import { listCategories } from "@/lib/services/categories";
import { getBudgetHints } from "@/lib/services/budgets";
import TransactionsView from "../TransactionsView";
/** Server component: reads the URL filters, loads everything in parallel on the server, hands plain data to the client view. */
export default async function TransactionsPage({ kind, searchParams }) {
  const user = await requirePageUser();
  const query = parseQuery(listTransactionsQuery, await searchParams, { kind, limit: 15 });
  const [data, totals, accounts, categories, budgetHints] = await Promise.all([listTransactions(user.uid, query), periodTotals(user.uid, kind), listAccounts(user.uid), listCategories(user.uid, kind), kind === "expense" ? getBudgetHints(user.uid) : undefined]);
  return <TransactionsView kind={kind} query={query} data={data} totals={totals} accounts={accounts} categories={categories} budgetHints={budgetHints} />;
}
