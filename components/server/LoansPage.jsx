import { requirePageUser } from "@/lib/auth";
import { parseQuery } from "@/lib/search-params";
import { listLoansQuery } from "@/lib/schemas/loan";
import { listLoans } from "@/lib/services/loans";
import { listAccounts } from "@/lib/services/accounts";
import LoansView from "../LoansView";
/** One page component for both sections. The direction comes from the route, never from the URL's query string. */
export default async function LoansPage({ direction, searchParams }) {
  const user = await requirePageUser();
  const query = parseQuery(listLoansQuery, await searchParams, { limit: 12, direction });
  const [data, accounts] = await Promise.all([listLoans(user.uid, query), listAccounts(user.uid)]);
  return <LoansView query={query} data={data} accounts={accounts} />;
}
