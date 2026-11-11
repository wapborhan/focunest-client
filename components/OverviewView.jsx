"use client";
import OverviewCards from "./OverviewCards";
import PeriodFilter, { periodNote } from "./PeriodFilter";
import { useUrlFilters } from "@/lib/use-url-filters";
/** The whole main dashboard: the period filter and five cards. */
export default function OverviewView({ data, preset }) {
  const { update, pending } = useUrlFilters();
  return (
    <div className="space-y-6">
      <PeriodFilter preset={preset} range={data.range} update={update} />
      <div className={`transition-opacity duration-200 ${pending ? "opacity-60" : ""}`}><OverviewCards data={data} periodNote={periodNote(preset)} /></div>
    </div>
  );
}
