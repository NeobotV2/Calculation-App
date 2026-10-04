import { DataTable, type Column } from "@/components/ui/data-table";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { marginTone } from "@/lib/status";
import type { WinterdienstResult, WinterScenario } from "@/lib/service-modules/types";
import { formatNumber } from "@/lib/utils";
import { useStore } from "@/store/use-store";
import { SCENARIO_LABELS, SCENARIO_ORDER, formatCount } from "./winterdienst-ui";

export interface ScenarioTableProps {
  result: WinterdienstResult;
  /** Ziel-Marge auf den Umsatz in %. Standard: aus dem Gewinnaufschlag der Einstellungen. */
  targetMarginPct?: number;
  /** In einer `Card padding="none"` auf false setzen. */
  framed?: boolean;
  className?: string;
}

function MarginBadge({ value, target }: { value: number; target: number }) {
  return <StatusBadge tone={marginTone(value, target)} label={`${formatNumber(value, 1)} %`} size="sm" />;
}

/** Wetterszenarien Mild / Normal / Streng mit Erlös, Kosten, DB und Marge je Saison. */
export function ScenarioTable({ result, targetMarginPct, framed = true, className }: ScenarioTableProps) {
  const storeMarkup = useStore((s) => s.targetMargin);
  const target = targetMarginPct ?? markupToRevenueMargin(storeMarkup);
  const rows = SCENARIO_ORDER.map((k) => result.scenarios[k]);

  const columns: Column<WinterScenario>[] = [
    {
      id: "szenario",
      header: "Szenario",
      cell: (s) => (
        <span className="font-medium text-foreground">
          {SCENARIO_LABELS[s.key]}
          {s.key === "normal" && <span className="ml-1 font-normal text-muted-foreground">(erwartet)</span>}
        </span>
      ),
    },
    { id: "einsaetze", header: "Einsätze", numeric: true, cell: (s) => formatCount(s.einsaetze) },
    { id: "erloes", header: "Erlös", numeric: true, cell: (s) => <Money value={s.revenue} /> },
    { id: "kosten", header: "Kosten", numeric: true, hideBelow: "lg", cell: (s) => <Money value={s.cost} /> },
    {
      id: "db",
      header: <abbr title="Deckungsbeitrag">DB</abbr>,
      numeric: true,
      cell: (s) => <Money value={s.contribution} signed tone={s.contribution < 0 ? "critical" : undefined} />,
    },
    { id: "marge", header: "Marge", align: "end", cell: (s) => <MarginBadge value={s.marginPct} target={target} /> },
  ];

  return (
    <DataTable
      caption="Wetterszenarien je Saison (netto)"
      columns={columns}
      rows={rows}
      getRowId={(s) => s.key}
      density="compact"
      framed={framed}
      className={className}
      rowClassName={(s) => (s.key === "normal" ? "bg-surface-sunken" : undefined)}
      mobile={(s) => (
        <ListRow
          title={`${SCENARIO_LABELS[s.key]} · ${formatCount(s.einsaetze)} Einsätze`}
          meta={
            <>
              Erlös <Money value={s.revenue} size="sm" /> · Kosten <Money value={s.cost} size="sm" />
            </>
          }
          trailing={
            <div className="flex flex-col items-end gap-1">
              <Money value={s.contribution} signed tone={s.contribution < 0 ? "critical" : undefined} />
              <MarginBadge value={s.marginPct} target={target} />
            </div>
          }
        />
      )}
    />
  );
}
