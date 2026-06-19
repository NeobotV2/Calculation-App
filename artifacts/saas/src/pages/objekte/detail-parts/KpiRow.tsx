import { StatTile } from "@/components/ui/stat-tile";
import { calcProjectTotals } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";

type ProjectTotals = ReturnType<typeof calcProjectTotals>;

export function KpiRow({ totals }: { totals: ProjectTotals }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 snap-x md:mx-0 md:px-0 md:flex-wrap">
      {[
        { label: "Monatspreis", value: formatCurrency(totals.cost), accent: true },
        { label: "Stunden/Mo", value: `${formatNumber(totals.hours, 1)} h` },
        { label: "Fläche", value: `${formatNumber(totals.area, 0)} m²` },
        { label: "€/m²", value: formatCurrency(totals.pricePerSqm) },
      ].map((kpi) => (
        <StatTile
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          tone={kpi.accent ? "primary" : "default"}
          className="shrink-0 w-32 md:w-auto md:flex-1 md:min-w-[140px] snap-start"
        />
      ))}
    </div>
  );
}
