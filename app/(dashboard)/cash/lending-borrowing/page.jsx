import { requirePageUser } from "@/lib/auth";
import { parseQuery } from "@/lib/search-params";
import { listLoansQuery } from "@/lib/schemas/loan";
import { listLoans } from "@/lib/services/loans";
import { listAccounts } from "@/lib/services/accounts";
import LoansView from "@/components/LoansView";
export const metadata = { title: "Lending & Borrowing" };
export default async function Page({ searchParams }) {
  const user = await requirePageUser();
  const query = parseQuery(listLoansQuery, await searchParams, { limit: 12 }); query.direction ??= "lent";
  const [data, accounts] = await Promise.all([listLoans(user.uid, query), listAccounts(user.uid)]);
  return <LoansView query={query} data={data} accounts={accounts} />;
}
