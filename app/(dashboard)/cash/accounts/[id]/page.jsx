import { requirePageUser } from "@/lib/auth";
import { parseQuery } from "@/lib/search-params";
import { historyQuery } from "@/lib/schemas/account";
import { getAccount, getAccountHistory } from "@/lib/services/accounts";
import AccountDetail from "@/components/AccountDetail";
import { notFound } from "next/navigation";
export const metadata = { title: "Account" };
export default async function Page({ params, searchParams }) {
  const user = await requirePageUser(); const { id } = await params;
  const q = parseQuery(historyQuery, await searchParams, { limit: 20 });
  try {
    const [account, history] = await Promise.all([getAccount(user.uid, id), getAccountHistory(user.uid, id, q)]);
    return <AccountDetail account={account} history={history} />;
  } catch (e) { if (e?.status === 404) notFound(); throw e; }
}
