import { requirePageUser } from "@/lib/auth";
import { resolvePeriod } from "@/lib/period";
import { getOverview } from "@/lib/services/overview";
import OverviewView from "@/components/OverviewView";
export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";   // financial totals must never be served from a cache
export default async function Page({ searchParams }) {
  const user = await requirePageUser();
  const { preset, range } = resolvePeriod(await searchParams);
  return <OverviewView data={await getOverview(user.uid, range)} preset={preset} />;
}
