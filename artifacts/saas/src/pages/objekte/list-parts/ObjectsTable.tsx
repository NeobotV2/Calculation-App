import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Ellipsis,
  FileText,
  FolderOpen,
  PenLine,
  SquarePen,
  Trash2,
} from "lucide-react";
import { DataTable, type Column, type DataTableSort } from "@/components/ui/data-table";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { ModuleIcon } from "@/components/ui/module-badge";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { marginTone } from "@/lib/status";
import { formatDate, formatNumber } from "@/lib/utils";
import { formatPercent, objectSortValue, type ObjectRow, type ObjectsSort, type ObjectsSortKey } from "./objects-filter";

export interface ObjectRowActions {
  onDuplicate: (row: ObjectRow) => void;
  onRename: (row: ObjectRow) => void;
  onArchive: (row: ObjectRow) => void;
  onRestore: (row: ObjectRow) => void;
  onDelete: (row: ObjectRow) => void;
}

export interface ObjectsTableProps extends ObjectRowActions {
  rows: ObjectRow[];
  sort: ObjectsSort;
  onSortChange: (sort: ObjectsSort) => void;
  loading?: boolean;
  empty?: ReactNode;
  caption?: string;
}

export function objectHref(row: ObjectRow): string {
  return `/objekte/${row.project.id}`;
}

function marginBadge(row: ObjectRow) {
  const m = row.econ.strategy.marginPct;
  return (
    <StatusBadge
      size="sm"
      tone={marginTone(m, row.econ.strategy.targetMarginPct)}
      label={formatPercent(m)}
    />
  );
}

function ModuleIcons({ row }: { row: ObjectRow }) {
  return (
    <span className="inline-flex items-center gap-1">
      {row.modules.map((m) => (
        <ModuleIcon key={m} module={m} size="sm" />
      ))}
    </span>
  );
}

/** Zeilenmenü (§10): Öffnen, Bearbeiten, Angebot-Vorschau, Duplizieren, Umbenennen, Archivieren/Wiederherstellen, Löschen. */
export function ObjectRowMenu({ row, actions }: { row: ObjectRow; actions: ObjectRowActions }) {
  const p = row.project;
  const archived = p.status === "archived";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={`Aktionen für ${p.name || "Objekt"}`} icon={Ellipsis} size="sm" tooltip={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem asChild>
          <Link href={objectHref(row)}>
            <FolderOpen aria-hidden="true" />
            Öffnen
          </Link>
        </DropdownMenuItem>
        {!archived && (
          <DropdownMenuItem asChild>
            <Link href={`/kalkulation/${p.id}`}>
              <SquarePen aria-hidden="true" />
              Bearbeiten
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={`/print/${p.id}`}>
            <FileText aria-hidden="true" />
            Angebot-Vorschau
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => actions.onDuplicate(row)}>
          <Copy aria-hidden="true" />
          Duplizieren
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onRename(row)}>
          <PenLine aria-hidden="true" />
          Umbenennen
        </DropdownMenuItem>
        {archived ? (
          <DropdownMenuItem onSelect={() => actions.onRestore(row)}>
            <ArchiveRestore aria-hidden="true" />
            Wiederherstellen
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => actions.onArchive(row)}>
            <Archive aria-hidden="true" />
            Archivieren
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => actions.onDelete(row)}>
          <Trash2 aria-hidden="true" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Objektliste als DataTable (ab md sortierbar) bzw. ListRow-Liste (Phone). */
export function ObjectsTable({
  rows,
  sort,
  onSortChange,
  loading,
  empty,
  caption = "Objekte",
  ...actions
}: ObjectsTableProps) {
  const sortable = (key: ObjectsSortKey) => ({
    sortable: true as const,
    sortValue: (row: ObjectRow) => objectSortValue(row, key),
  });

  const columns: Column<ObjectRow>[] = [
    {
      id: "name",
      header: "Objekt",
      ...sortable("name"),
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-foreground">{row.project.name || "Ohne Namen"}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.project.customer || "Kein Kunde"}</span>
        </span>
      ),
    },
    { id: "modules", header: "Leistungen", hideBelow: "lg", ...sortable("modules"), cell: (row) => <ModuleIcons row={row} /> },
    {
      id: "price",
      header: "Monatspreis",
      numeric: true,
      ...sortable("price"),
      cell: (row) => <Money value={row.econ.totals.priceMonthly} />,
    },
    { id: "margin", header: "Marge", align: "end", ...sortable("margin"), cell: (row) => marginBadge(row) },
    {
      id: "hours",
      header: "Std./Mo",
      numeric: true,
      hideBelow: "lg",
      ...sortable("hours"),
      cell: (row) => formatNumber(row.econ.totals.laborHoursMonthly, 1),
    },
    {
      id: "area",
      header: "Fläche",
      unit: "m²",
      numeric: true,
      // Alle 9 Spalten brauchen ~1120 px: erst ab 72rem Tabellenbreite (1366-px-Laptop: ohne).
      hideBelow: "2xl",
      ...sortable("area"),
      cell: (row) => formatNumber(row.econ.totals.cleaning.area, 0),
    },
    {
      id: "status",
      header: "Status",
      ...sortable("status"),
      cell: (row) => <StatusBadge size="sm" tone={row.status.tone} label={row.status.label} />,
    },
    {
      id: "updated",
      header: "Geändert",
      hideBelow: "2xl",
      ...sortable("updated"),
      cell: (row) => <span className="tabular-nums text-muted-foreground">{formatDate(row.project.updatedAt)}</span>,
    },
  ];

  return (
    <DataTable<ObjectRow>
      caption={caption}
      columns={columns}
      rows={rows}
      getRowId={(row) => row.project.id}
      rowHref={objectHref}
      rowActions={(row) => <ObjectRowMenu row={row} actions={actions} />}
      rowClassName={(row) => (row.project.status === "archived" ? "text-muted-foreground" : undefined)}
      defaultSort={sort as DataTableSort}
      onSortChange={(s) => onSortChange({ id: s.id as ObjectsSortKey, dir: s.dir })}
      loading={loading}
      empty={empty}
      mobile={(row) => (
        <ListRow
          href={objectHref(row)}
          chevron={false}
          title={row.project.name || "Ohne Namen"}
          meta={
            <span className="flex min-w-0 flex-col gap-1">
              <span className="line-clamp-2">
                {row.project.customer || "Kein Kunde"} · {formatNumber(row.econ.totals.laborHoursMonthly, 1)} h
              </span>
              {/* Status unter den Text statt rechts daneben: lässt Kunde und Stunden Platz. */}
              <span className="flex flex-wrap items-center gap-2">
                <ModuleIcons row={row} />
                <StatusBadge size="sm" tone={row.status.tone} label={row.status.label} />
              </span>
            </span>
          }
          trailing={
            <>
              <Money value={row.econ.totals.priceMonthly} className="font-medium" />
              <ObjectRowMenu row={row} actions={actions} />
            </>
          }
        />
      )}
    />
  );
}

