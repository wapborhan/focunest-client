import { requirePageUser } from "@/lib/auth";
import { flat } from "@/lib/search-params";
import { listAccounts } from "@/lib/services/accounts";
import AccountsView from "@/components/AccountsView";
export const metadata = { title: "Accounts" };
export default async function Page({ searchParams }) {
  const user = await requirePageUser(); const { type } = flat(await searchParams);
  const accounts = await listAccounts(user.uid);
  return <AccountsView accounts={accounts} initialType={["cash", "bank", "mobile"].includes(type) ? type : "cash"} />;
}
