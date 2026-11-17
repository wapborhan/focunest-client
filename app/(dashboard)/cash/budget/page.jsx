import { requirePageUser } from "@/lib/auth";
import { resolveMonth } from "@/lib/period";
import { getBudgetStatus } from "@/lib/services/budgets";
import BudgetView from "@/components/BudgetView";
export const metadata = { title: "Budget" };
export default async function Page({ searchParams }) {
  const user = await requirePageUser();
  return <BudgetView data={await getBudgetStatus(user.uid, resolveMonth(await searchParams))} />;
}
