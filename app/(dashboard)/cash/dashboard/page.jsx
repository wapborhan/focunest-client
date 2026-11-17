import { requirePageUser } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { getDashboard } from "@/lib/services/dashboard";
import { listCategories } from "@/lib/services/categories";
import { getBudgetStatus, hintsFrom } from "@/lib/services/budgets";
import DashboardView from "@/components/DashboardView";
export const metadata = { title: "Cash dashboard" };
export default async function Page({ searchParams }) {
  const user = await requirePageUser();
  const { preset, range } = resolvePeriod(await searchParams);
  const [data, income, expense, budget] = await Promise.all([getDashboard(user.uid, range), listCategories(user.uid, "income"), listCategories(user.uid, "expense"), getBudgetStatus(user.uid)]);
  return <DashboardView data={data} preset={preset} accounts={data.accounts} categories={{ income, expense }} budget={budget} budgetHints={hintsFrom(budget)} />;
}
