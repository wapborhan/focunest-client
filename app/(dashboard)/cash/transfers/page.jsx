import { requirePageUser } from "@/lib/auth";
import { parseQuery } from "@/lib/search-params";
import { listTransfersQuery } from "@/lib/schemas/transfer";
import { listTransfers } from "@/lib/services/transfers";
import { listAccounts } from "@/lib/services/accounts";
import TransfersView from "@/components/TransfersView";
export const metadata = { title: "Transfers" };
export default async function Page({ searchParams }) {
  const user = await requirePageUser();
  const query = parseQuery(listTransfersQuery, await searchParams, { limit: 15 });
  const [transfers, accounts] = await Promise.all([listTransfers(user.uid, query), listAccounts(user.uid)]);
  return <TransfersView transfers={transfers} accounts={accounts} />;
}
