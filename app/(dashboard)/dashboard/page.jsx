import { requirePageUser } from "@/lib/auth";
import { flat } from "@/lib/search-params";
import { ymd } from "@/lib/schemas/transaction";
import { presetRange } from "@/lib/dates";
import { getDashboard } from "@/lib/services/dashboard";
import { listCategories } from "@/lib/services/categories";
import DashboardView from "@/components/DashboardView";
export const metadata = { title: "Dashboard" };

export default async function Page({ searchParams }) {
  const user = await requirePageUser(); const sp = flat(await searchParams);
  let preset = ["today", "week", "month", "year", "custom"].includes(sp.preset) ? sp.preset : "month";
  let range = preset === "custom" ? { from: sp.from, to: sp.to } : presetRange(preset);
  if (preset === "custom" && !(ymd.safeParse(range.from).success && ymd.safeParse(range.to).success && range.from <= range.to)) { preset = "month"; range = presetRange("month"); }
  const [data, income, expense] = await Promise.all([getDashboard(user.uid, range), listCategories(user.uid, "income"), listCategories(user.uid, "expense")]);
  return <DashboardView data={data} preset={preset} accounts={data.accounts} categories={{ income, expense }} />;
}
