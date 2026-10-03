import { DataTable, type Column } from "@/components/ui/data-table";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { ModuleIcon } from "@/components/ui/module-badge";
import { marginTone } from "@/lib/status";
import { formatPercent, type ObjectRow } from "@/pages/objekte/list-parts/objects-filter";

export const RECENT_OBJECTS_LIMIT = 5;

/** Relative Zeitangabe („vor 3 Std.", „gestern", „vor 2 Wo."). */
export function relativeTime(dateStr: string, now: number = Date.now()): string {
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return "–";
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "gestern";
  if (diffD < 7) return `vor ${diffD} Tagen`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `vor ${diffW} Wo.`;
  const diffM = Math.floor(diffD / 30);
  if (diffM < 12) return `vor ${Math.max(1, diffM)} Mon.`;
  return `vor ${Math.floor(diffM / 12)} J.`;
}

function time(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Die zuletzt geänderten aktiven Objekte. */
export function pickRecentRows(rows: readonly ObjectRow[], limit = RECENT_OBJECTS_LIMIT): ObjectRow[] {
  return rows
    .filter((r) => r.project.status !== "archived")
    .slice()
    .sort((a, b) => time(b.project.updatedAt) - time(a.project.updatedAt))
    .slice(0, limit);
}

function MarginBadge({ row }: { row: ObjectRow }) {
  const m = row.econ.strategy.marginPct;
  return <StatusBadge size="sm" tone={marginTone(m, row.econ.strategy.targetMarginPct)} label={formatPercent(m)} />;
}

const columns: Column<ObjectRow>[] = [
  {
    id: "name",
    header: "Objekt",
    cell: (row) => (
      <span className="block min-w-0">
        <span className="block truncate font-medium text-foreground">{row.project.name || "Ohne Namen"}</span>
        <span className="block truncate text-xs text-muted-foreground">{row.project.customer || "Kein Kunde"}</span>
      </span>
    ),
  },
  {
    id: "modules",
    header: "Leistungen",
    cell: (row) => (
      <span className="inline-flex items-center gap-1">
        {row.modules.map((m) => (
          <ModuleIcon key={m} module={m} size="sm" />
        ))}
      </span>
    ),
  },
  { id: "price", header: "Monatspreis", numeric: true, cell: (row) => <Money value={row.econ.totals.priceMonthly} /> },
  { id: "margin", header: "Marge", align: "end", cell: (row) => <MarginBadge row={row} /> },
  {
    id: "status",
    header: "Status",
    hideBelow: "lg",
    cell: (row) => <StatusBadge size="sm" tone={row.status.tone} label={row.status.label} />,
  },
  {
    id: "updated",
    header: "Geändert",
    hideBelow: "xl",
    cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{relativeTime(row.project.updatedAt)}</span>,
  },
];

/** „Zuletzt bearbeitet" (§10): kompakte Tabelle, auf dem Phone eine Liste. */
export function RecentObjectsTable({ rows, loading }: { rows: ObjectRow[]; loading?: boolean }) {
  return (
    <DataTable<ObjectRow>
      caption="Zuletzt bearbeitete Objekte"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.project.id}
      rowHref={(row) => `/objekte/${row.project.id}`}
      density="compact"
      loading={loading}
      loadingRows={RECENT_OBJECTS_LIMIT}
      mobile={(row) => (
        <ListRow
          href={`/objekte/${row.project.id}`}
          chevron={false}
          title={row.project.name || "Ohne Namen"}
          meta={`${row.project.customer || "Kein Kunde"} · ${relativeTime(row.project.updatedAt)}`}
          trailing={
            <span className="flex flex-col items-end gap-1">
              <Money value={row.econ.totals.priceMonthly} className="font-medium" />
              <StatusBadge size="sm" tone={row.status.tone} label={row.status.label} />
            </span>
          }
        />
      )}
    />
  );
}
