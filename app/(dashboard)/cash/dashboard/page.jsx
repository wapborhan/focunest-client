import { requirePageUser } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { getDashboard } from "@/lib/services/dashboard";
import { listCategories } from "@/lib/services/categories";
import DashboardView from "@/components/DashboardView";
export const metadata = { title: "Cash dashboard" };
export default async function Page({ searchParams }) {
  const user = await requirePageUser();
  const { preset, range } = resolvePeriod(await searchParams);
  const [data, income, expense] = await Promise.all([getDashboard(user.uid, range), listCategories(user.uid, "income"), listCategories(user.uid, "expense")]);
  return <DashboardView data={data} preset={preset} accounts={data.accounts} categories={{ income, expense }} />;
}
