import * as React from "react";
import { Link, useLocation } from "wouter";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMediaQuery } from "@/lib/theme";
import { MEDIA } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";
export interface DataTableSort {
  id: string;
  dir: SortDirection;
}

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  /** Einheit im Spaltenkopf, z. B. "m²" → „Fläche (m²)". Zellen ohne Einheit. */
  unit?: string;
  cell: (row: T) => React.ReactNode;
  align?: "start" | "end" | "center";
  /** Rechtsbündig + `tabular-nums`. */
  numeric?: boolean;
  /** Spalte erst ab diesem Breakpoint zeigen. */
  hideBelow?: "lg" | "xl";
  /** CSS-Breite des Spaltenkopfs, z. B. "8rem" oder "20%". */
  width?: string;
  /** Inhalt der Summenzeile (tfoot) für diese Spalte. */
  footer?: React.ReactNode;
  sortable?: boolean;
  /** Pflicht für `sortable`: Vergleichswert der Zeile. */
  sortValue?: (row: T) => string | number | null | undefined;
  headerClassName?: string;
  cellClassName?: string;
}
export type DataTableColumn<T> = Column<T>;

export interface DataTableGroup<T> {
  id: string;
  label: React.ReactNode;
  rows: T[];
  /** Ganze Zeile unter der Gruppe (z. B. „Zwischensumme: …"). */
  footer?: React.ReactNode;
  /** Spaltengenaue Zwischensummen (Schlüssel = Spalten-id). */
  footerCells?: Partial<Record<string, React.ReactNode>>;
}

export interface DataTableProps<T> {
  /** Pflicht; als sr-only `<caption>` und Name der Scroll-Region. */
  caption: string;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  /** Entweder `rows` … */
  rows?: T[];
  /** … oder `groups` (mit Gruppenkopf und optionalem Gruppenfuß). */
  groups?: DataTableGroup<T>[];
  /** Zusätzliche `<tr>`-Zeilen im tfoot (vor der Summenzeile). Mit `TableRow`/`TableCell` bauen. */
  footerRows?: React.ReactNode;
  /** Darstellung einer Zeile unter `md` (z. B. ein `ListRow`). */
  mobile: (row: T) => React.ReactNode;
  /** Fuß der mobilen Liste (z. B. Summen). */
  mobileFooter?: React.ReactNode;
  /** Ganze Zeile verlinken: die erste Spalte wird zum Link, Klick auf die Zeile navigiert. */
  rowHref?: (row: T) => string | undefined;
  /** Alternative zu `rowHref`: Zeile per Klick/Enter auslösen. */
  onRowClick?: (row: T) => void;
  /** Inhalt der letzten Spalte (z. B. DropdownMenu „Aktionen"). */
  rowActions?: (row: T) => React.ReactNode;
  density?: "comfortable" | "compact";
  loading?: boolean;
  /** Anzahl Skelett-Zeilen bei `loading` (Standard 5). */
  loadingRows?: number;
  /** Ersetzt die Tabelle, wenn keine Zeilen vorhanden sind (z. B. `StateView`). */
  empty?: React.ReactNode;
  stickyHeader?: boolean;
  selectedId?: string | null;
  defaultSort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /** Aufgeklappte Zeilen (ids); Inhalt via `renderExpanded`. */
  expandedIds?: ReadonlySet<string> | readonly string[];
  renderExpanded?: (row: T) => React.ReactNode;
  /** Rahmen (Karte) um Tabelle/Liste. Standard: true. In einer `Card padding="none"` auf false setzen. */
  framed?: boolean;
  /** Erzwingt eine Darstellung unabhängig von der Breite. */
  layout?: "auto" | "table" | "list";
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}

const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="combobox"], [data-no-row-click]';

function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "de", { numeric: true, sensitivity: "base" });
}

function hideClass(hideBelow?: "lg" | "xl") {
  if (hideBelow === "lg") return "hidden lg:table-cell";
  if (hideBelow === "xl") return "hidden xl:table-cell";
  return undefined;
}

function alignClass<T>(col: Column<T>) {
  if (col.numeric || col.align === "end") return "text-right tabular-nums";
  if (col.align === "center") return "text-center";
  return "text-left";
}

/**
 * Responsive Datentabelle: ab `md` eine echte `<table>` (sortierbar, Gruppen,
 * Summenzeile, Zeilenaktionen), darunter eine Kartenliste mit `mobile(row)`.
 */
export function DataTable<T>({
  caption,
  columns,
  getRowId,
  rows,
  groups,
  footerRows,
  mobile,
  mobileFooter,
  rowHref,
  onRowClick,
  rowActions,
  density = "comfortable",
  loading = false,
  loadingRows = 5,
  empty,
  stickyHeader = false,
  selectedId,
  defaultSort,
  onSortChange,
  expandedIds,
  renderExpanded,
  framed = true,
  layout = "auto",
  rowClassName,
  className,
}: DataTableProps<T>) {
  const isMdUp = useMediaQuery(MEDIA.md, true);
  const showTable = layout === "table" || (layout === "auto" && isMdUp);
  const [, navigate] = useLocation();
  const captionId = React.useId();
  const [sort, setSort] = React.useState<DataTableSort | null>(defaultSort ?? null);

  const expandedSet = React.useMemo(() => {
    if (!expandedIds) return null;
    return expandedIds instanceof Set ? (expandedIds as ReadonlySet<string>) : new Set(expandedIds as readonly string[]);
  }, [expandedIds]);

  const sortRows = React.useCallback(
    (list: T[]): T[] => {
      if (!sort) return list;
      const col = columns.find((c) => c.id === sort.id);
      if (!col?.sortValue) return list;
      const getter = col.sortValue;
      const factor = sort.dir === "asc" ? 1 : -1;
      return list
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
          const va = getter(a.row);
          const vb = getter(b.row);
          const aEmpty = va === null || va === undefined || va === "";
          const bEmpty = vb === null || vb === undefined || vb === "";
          // Leere Werte immer ans Ende, unabhängig von der Richtung
          if (aEmpty || bEmpty) return compareValues(va, vb) || a.index - b.index;
          return compareValues(va, vb) * factor || a.index - b.index;
        })
        .map((x) => x.row);
    },
    [sort, columns],
  );

  const sections = React.useMemo(() => {
    if (groups) return groups.map((g) => ({ ...g, rows: sortRows(g.rows) }));
    return [{ id: "__all", label: null as React.ReactNode, rows: sortRows(rows ?? []), footer: undefined, footerCells: undefined }];
  }, [groups, rows, sortRows]);

  const totalRows = sections.reduce((n, s) => n + s.rows.length, 0);
  const hasGroups = !!groups;
  const colCount = columns.length + (rowActions ? 1 : 0);
  const hasColumnFooter = columns.some((c) => c.footer !== undefined);

  const toggleSort = (col: Column<T>) => {
    const next: DataTableSort =
      sort?.id === col.id
        ? { id: col.id, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { id: col.id, dir: col.numeric ? "desc" : "asc" };
    setSort(next);
    onSortChange?.(next);
  };

  const cellPad = density === "compact" ? "py-1.5" : "py-2.5";

  if (!loading && totalRows === 0 && empty !== undefined) {
    return <div className={className}>{empty}</div>;
  }

  // ── Mobile Liste ────────────────────────────────────────────────────────
  if (!showTable) {
    return (
      <div
        className={cn(framed && "overflow-hidden rounded-lg border border-border bg-card shadow-surface", className)}
        aria-busy={loading || undefined}
      >
        <ul role="list" aria-label={caption} className="divide-y divide-border">
          {loading
            ? Array.from({ length: loadingRows }).map((_, i) => (
                <li key={`sk-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </li>
              ))
            : totalRows === 0
              ? (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">Keine Einträge vorhanden.</li>
                )
              : sections.map((section) => (
                  <React.Fragment key={section.id}>
                    {hasGroups && (
                      <li className="bg-surface-sunken px-4 py-2 text-overline uppercase text-muted-foreground">
                        {section.label}
                      </li>
                    )}
                    {section.rows.map((row) => (
                      <li key={getRowId(row)} className={cn(selectedId === getRowId(row) && "bg-primary-soft")}>
                        {mobile(row)}
                      </li>
                    ))}
                    {hasGroups && section.footer != null && (
                      <li className="bg-surface-sunken px-4 py-2 text-sm font-medium">{section.footer}</li>
                    )}
                  </React.Fragment>
                ))}
          {!loading && mobileFooter != null && (
            <li className="border-t-2 border-border-strong bg-surface-sunken px-4 py-3 text-sm font-semibold">
              {mobileFooter}
            </li>
          )}
        </ul>
      </div>
    );
  }

  // ── Tabelle ─────────────────────────────────────────────────────────────
  const renderHeaderCell = (col: Column<T>) => {
    const active = sort?.id === col.id;
    const ariaSort = active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined;
    const unit = col.unit ? <span className="ml-1 normal-case tracking-normal">({col.unit})</span> : null;
    const canSort = col.sortable && !!col.sortValue;
    const SortIcon = active ? (sort!.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
    return (
      <TableHead
        key={col.id}
        aria-sort={ariaSort}
        style={col.width ? { width: col.width } : undefined}
        className={cn(
          alignClass(col),
          hideClass(col.hideBelow),
          stickyHeader && "sticky top-0 z-10 bg-surface-sunken",
          col.headerClassName,
        )}
      >
        {canSort ? (
          <button
            type="button"
            onClick={() => toggleSort(col)}
            className={cn(
              "-mx-1 inline-flex items-center gap-1 rounded-xs px-1 uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              active && "text-foreground",
            )}
          >
            <span>
              {col.header}
              {unit}
            </span>
            <SortIcon aria-hidden="true" className={cn("size-3.5 shrink-0", !active && "opacity-50")} />
          </button>
        ) : (
          <>
            {col.header}
            {unit}
          </>
        )}
      </TableHead>
    );
  };

  const renderRow = (row: T) => {
    const id = getRowId(row);
    const href = rowHref?.(row);
    const clickable = !!href || !!onRowClick;
    const expanded = !!renderExpanded && !!expandedSet?.has(id);

    const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
      if (!clickable) return;
      const target = e.target as HTMLElement;
      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (interactive && e.currentTarget.contains(interactive)) return;
      if (typeof window !== "undefined" && window.getSelection()?.toString()) return;
      if (href) navigate(href);
      else onRowClick?.(row);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (!onRowClick || href || e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onRowClick(row);
      }
    };

    return (
      <React.Fragment key={id}>
        <TableRow
          data-state={selectedId === id ? "selected" : undefined}
          onClick={clickable ? handleClick : undefined}
          onKeyDown={onRowClick && !href ? handleKeyDown : undefined}
          tabIndex={onRowClick && !href ? 0 : undefined}
          className={cn(
            clickable && "cursor-pointer hover:bg-muted/50",
            onRowClick && !href && "focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            expanded && "border-b-0",
            rowClassName?.(row),
          )}
        >
          {columns.map((col, index) => {
            const content = col.cell(row);
            return (
              <TableCell
                key={col.id}
                className={cn(cellPad, alignClass(col), hideClass(col.hideBelow), col.cellClassName)}
              >
                {index === 0 && href ? (
                  <Link
                    href={href}
                    className="rounded-xs text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </TableCell>
            );
          })}
          {rowActions && (
            <TableCell className={cn(cellPad, "w-12 text-right")}>
              <div className="flex justify-end">{rowActions(row)}</div>
            </TableCell>
          )}
        </TableRow>
        {expanded && (
          <TableRow className="bg-surface-sunken">
            <TableCell colSpan={colCount} className="px-3 py-3">
              {renderExpanded!(row)}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  const renderSkeletonRows = () =>
    Array.from({ length: loadingRows }).map((_, i) => (
      <TableRow key={`sk-${i}`}>
        {columns.map((col) => (
          <TableCell key={col.id} className={cn(cellPad, hideClass(col.hideBelow))}>
            <Skeleton className={cn("h-4", col.numeric || col.align === "end" ? "ml-auto w-16" : "w-3/4")} />
          </TableCell>
        ))}
        {rowActions && <TableCell className={cellPad} />}
      </TableRow>
    ));

  return (
    <div
      className={cn(framed && "overflow-hidden rounded-lg border border-border bg-card shadow-surface", className)}
    >
      <div
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
        className={cn(
          "relative w-full overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          stickyHeader && "max-h-[70vh] overflow-y-auto",
        )}
      >
        <table className="w-full border-collapse text-sm" aria-busy={loading || undefined}>
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>
          <TableHeader>
            <TableRow>
              {columns.map(renderHeaderCell)}
              {rowActions && (
                <TableHead className={cn("w-12", stickyHeader && "sticky top-0 z-10 bg-surface-sunken")}>
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          {loading ? (
            <TableBody>{renderSkeletonRows()}</TableBody>
          ) : totalRows === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={colCount} className="py-8 text-center text-muted-foreground">
                  Keine Einträge vorhanden.
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            sections.map((section) => (
              <TableBody key={section.id} className={cn(hasGroups && "[&_tr:last-child]:border-b")}>
                {hasGroups && (
                  <TableRow className="bg-muted/40">
                    <th
                      scope="rowgroup"
                      colSpan={colCount}
                      className="px-3 py-2 text-left text-label font-semibold text-foreground"
                    >
                      {section.label}
                    </th>
                  </TableRow>
                )}
                {section.rows.map(renderRow)}
                {hasGroups && section.footerCells && (
                  <TableRow className="bg-surface-sunken/60 font-medium">
                    {columns.map((col) => (
                      <TableCell key={col.id} className={cn(cellPad, alignClass(col), hideClass(col.hideBelow))}>
                        {section.footerCells?.[col.id] ?? null}
                      </TableCell>
                    ))}
                    {rowActions && <TableCell className={cellPad} />}
                  </TableRow>
                )}
                {hasGroups && section.footer != null && (
                  <TableRow className="bg-surface-sunken/60">
                    <TableCell colSpan={colCount} className={cn(cellPad, "text-sm font-medium")}>
                      {section.footer}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            ))
          )}

          {!loading && (footerRows != null || hasColumnFooter) && (
            <TableFooter>
              {footerRows}
              {hasColumnFooter && (
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col.id} className={cn(cellPad, alignClass(col), hideClass(col.hideBelow))}>
                      {col.footer ?? null}
                    </TableCell>
                  ))}
                  {rowActions && <TableCell className={cellPad} />}
                </TableRow>
              )}
            </TableFooter>
          )}
        </table>
      </div>
    </div>
  );
}
