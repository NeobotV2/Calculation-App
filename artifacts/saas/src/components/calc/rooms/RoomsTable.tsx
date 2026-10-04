import * as React from "react";
import { ArrowDown, ArrowUp, ChevronRight, Copy, Ellipsis, Info, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, columnHideClass, type Column, type DataTableGroup } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Money } from "@/components/ui/money";
import { TableCell, TableRow } from "@/components/ui/table";
import { FREQUENCY_FACTORS } from "@/lib/calc";
import { SURCHARGE_DEFINITIONS, getSurchargeEffectLabel } from "@/data/surcharges";
import { getFrequencyOption } from "@/data/frequencies";
import { cn, formatNumber } from "@/lib/utils";
import type { FrequencyKey, Room } from "@/store/use-store";
import { FrequencySelect } from "./FrequencySelect";
import { roomRow, type RoomGroup, type RoomRow } from "./rooms-editor-logic";

/* ── Formatierung ─────────────────────────────────────────────────────── */

/** Fläche ohne Einheit (Einheit steht im Spaltenkopf). */
export function formatArea(value: number, maxDecimals = 2): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}

export function formatHours(value: number): string {
  return formatNumber(value, 1);
}

/* ── Zeilen-Aktionen ──────────────────────────────────────────────────── */

export type MoveDirection = "up" | "down";

/** Aktionen je Raum. Fehlt ein Handler, fehlt die Aktion (z. B. schreibgeschützt). */
export interface RoomRowHandlers {
  onEdit?: (room: Room) => void;
  onDuplicate?: (room: Room) => void;
  /** Nur gesetzt, wenn Umsortieren möglich ist (Demo-/Entwurfsmodus). */
  onMove?: (room: Room, direction: MoveDirection) => void;
  canMove?: (room: Room, direction: MoveDirection) => boolean;
  onDelete?: (room: Room) => void;
  onFrequencyChange?: (room: Room, frequency: FrequencyKey) => void;
}

export function hasRowActions(h: RoomRowHandlers | undefined): boolean {
  return !!h && !!(h.onEdit || h.onDuplicate || h.onMove || h.onDelete);
}

export function roomDisplayName(room: Room): string {
  return room.name?.trim() || room.typeName || "Raum";
}

export interface RoomActionsMenuProps {
  room: Room;
  handlers: RoomRowHandlers;
  /** Phone: Leistungsdetails ein-/ausblenden. */
  onToggleDetails?: () => void;
  detailsExpanded?: boolean;
}

/** „⋯“-Menü einer Raumzeile: Bearbeiten, Duplizieren, Nach oben/unten, Entfernen. */
export function RoomActionsMenu({ room, handlers, onToggleDetails, detailsExpanded }: RoomActionsMenuProps) {
  const name = roomDisplayName(room);
  const canUp = handlers.onMove ? (handlers.canMove?.(room, "up") ?? true) : false;
  const canDown = handlers.onMove ? (handlers.canMove?.(room, "down") ?? true) : false;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={`Aktionen für ${name}`} icon={Ellipsis} size="sm" tooltip={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {handlers.onEdit && (
          <DropdownMenuItem onSelect={() => handlers.onEdit?.(room)}>
            <Pencil aria-hidden="true" />
            Bearbeiten
          </DropdownMenuItem>
        )}
        {onToggleDetails && (
          <DropdownMenuItem onSelect={onToggleDetails}>
            <Info aria-hidden="true" />
            {detailsExpanded ? "Leistungsdetails ausblenden" : "Leistungsdetails anzeigen"}
          </DropdownMenuItem>
        )}
        {handlers.onDuplicate && (
          <DropdownMenuItem onSelect={() => handlers.onDuplicate?.(room)}>
            <Copy aria-hidden="true" />
            Duplizieren
          </DropdownMenuItem>
        )}
        {handlers.onMove && (
          <>
            <DropdownMenuItem disabled={!canUp} onSelect={() => handlers.onMove?.(room, "up")}>
              <ArrowUp aria-hidden="true" />
              Nach oben
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canDown} onSelect={() => handlers.onMove?.(room, "down")}>
              <ArrowDown aria-hidden="true" />
              Nach unten
            </DropdownMenuItem>
          </>
        )}
        {handlers.onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => handlers.onDelete?.(room)}>
              <Trash2 aria-hidden="true" />
              Entfernen
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Leistungsdetails (aufgeklappte Zeile) ───────────────────────────── */

export interface RoomPerformanceDetailProps {
  room: Room;
  rate: number;
  /** „Anpassen“ öffnet den Raum-Editor. */
  onEdit?: (room: Room) => void;
  /** Angezeigte (gerundete) Monatswerte der Tabellenzeile, damit Detail und Zeile übereinstimmen. */
  shown?: { hoursMonthly: number; priceMonthly: number };
  id?: string;
  className?: string;
}

function DetailItem({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Leistungsdetails eines Raums: Leistungswert, Zu-/Abschläge mit Zeitwirkung,
 * effektive Leistung, Zeit je Reinigung, Reinigungen und Stunden je Monat.
 */
export function RoomPerformanceDetail({ room, rate, onEdit, shown, id, className }: RoomPerformanceDetailProps) {
  const row = { ...roomRow(room, rate), ...shown };
  const surcharges = SURCHARGE_DEFINITIONS.flatMap((def) => {
    const selected = room[def.category];
    const option = selected ? def.options.find((o) => o.id === selected) : undefined;
    return option ? [{ category: def.label, label: option.label, effect: getSurchargeEffectLabel(option.modifier) }] : [];
  });
  const frequency = getFrequencyOption(room.frequency);

  return (
    <div id={id} className={cn("space-y-3", className)}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        <DetailItem label="Leistungswert Raumart">{formatNumber(room.typePerformance, 0)} m²/h</DetailItem>
        <DetailItem label="Eigener Leistungswert">
          {room.customPerformance ? `${formatNumber(room.customPerformance, 0)} m²/h` : "–"}
        </DetailItem>
        <DetailItem label="Effektive Leistung">{formatNumber(row.effectivePerformance, 0)} m²/h</DetailItem>
        <DetailItem label="Zeit je Reinigung">{formatNumber(row.timePerCleaning * 60, 0)} Min.</DetailItem>
        <DetailItem label="Reinigungen / Monat">
          {formatNumber(FREQUENCY_FACTORS[room.frequency] ?? 0, 2)}
          {frequency && <span className="ml-1 font-normal text-muted-foreground">({frequency.short})</span>}
        </DetailItem>
        <DetailItem label="Stunden / Monat">{formatHours(row.hoursMonthly)} h</DetailItem>
        <DetailItem label="Preis / Monat">
          <Money value={row.priceMonthly} />
        </DetailItem>
        <div className="col-span-full min-w-0">
          <dt className="text-xs text-muted-foreground">Zu-/Abschläge</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {surcharges.length === 0 ? (
              <span className="text-sm text-foreground">Keine (Standard)</span>
            ) : (
              surcharges.map((s) => (
                <Badge key={s.category} tone="neutral" size="sm">
                  <span className="sr-only">{s.category}: </span>
                  {s.label} · {s.effect}
                </Badge>
              ))
            )}
          </dd>
        </div>
      </dl>
      {onEdit && (
        <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(room)}>
          <Pencil aria-hidden="true" />
          Leistungswert anpassen
        </Button>
      )}
    </div>
  );
}

/* ── Fußzeilen (Rüst-/Wegezeit u. Ä.) ─────────────────────────────────── */

type ColumnId = "raum" | "gruppe" | "flaeche" | "turnus" | "lw" | "minuten" | "stunden" | "preis";

/** Spalten der Raumtabelle – eine Quelle für Kopf, Zeilen und Fußzeilen. */
const COLUMN_META: { id: ColumnId; hideBelow?: "lg" | "xl"; numeric?: boolean }[] = [
  { id: "raum" },
  { id: "gruppe", hideBelow: "xl" },
  { id: "flaeche", numeric: true },
  { id: "turnus" },
  { id: "lw", hideBelow: "lg", numeric: true },
  { id: "minuten", hideBelow: "xl", numeric: true },
  { id: "stunden", hideBelow: "lg", numeric: true },
  { id: "preis", numeric: true },
];

function metaCellClass(meta: (typeof COLUMN_META)[number]) {
  return cn(
    meta.numeric ? "text-right tabular-nums" : "text-left",
    columnHideClass(meta.hideBelow),
  );
}

type FooterLayout = { variant: "table"; hasActions: boolean } | { variant: "list" };

const RoomsFooterContext = React.createContext<FooterLayout | null>(null);

/** Angezeigte (gerundete) Beträge der Fußzeilen je `amountKey` (aus `roundRoomsForDisplay`). */
export type RoomsFooterAmounts = ReadonlyMap<string, { hoursMonthly: number; priceMonthly: number }>;
const RoomsFooterAmountsContext = React.createContext<RoomsFooterAmounts | null>(null);

/** Stellt `RoomsFooterRow` die Darstellung bereit (Tabelle ab md, Liste darunter). */
export function RoomsFooterProvider({ layout, children }: { layout: FooterLayout; children: React.ReactNode }) {
  return <RoomsFooterContext.Provider value={layout}>{children}</RoomsFooterContext.Provider>;
}

/**
 * Gerundete Fußzeilen-Beträge für `RoomsFooterRow amountKey`: So ergeben
 * Raumzeilen + Fußzeilen exakt die Gesamtsumme der Tabelle.
 */
export function RoomsFooterAmountsProvider({ amounts, children }: { amounts: RoomsFooterAmounts; children: React.ReactNode }) {
  return <RoomsFooterAmountsContext.Provider value={amounts}>{children}</RoomsFooterAmountsContext.Provider>;
}

export interface RoomsFooterRowProps {
  label: React.ReactNode;
  /** Zweite Zeile (gedämpft), z. B. „× 21,67 Einsätze/Monat“. */
  description?: React.ReactNode;
  /** Eingabe (z. B. Minuten) – in der Tabelle in der Turnus-Spalte. */
  control?: React.ReactNode;
  hoursMonthly?: number;
  priceMonthly?: number;
  /** Schlüssel für die gerundeten Beträge des `RoomsEditor` (z. B. „ruestzeit“). */
  amountKey?: string;
}

/**
 * Eine Fußzeile der Raumtabelle (über der Gesamtsumme), z. B. Rüstzeit.
 * Im `footer` des `RoomsEditor` verwenden: Ab md wird sie zur `<tr>` mit den
 * Spalten der Tabelle, darunter zur Listenzeile. Außerhalb des Editors
 * erscheint sie als einfache Zeile.
 */
export function RoomsFooterRow({ label, description, control, hoursMonthly: hoursProp, priceMonthly: priceProp, amountKey }: RoomsFooterRowProps) {
  const layout = React.useContext(RoomsFooterContext);
  const shown = React.useContext(RoomsFooterAmountsContext)?.get(amountKey ?? "");
  const hoursMonthly = hoursProp !== undefined && shown ? shown.hoursMonthly : hoursProp;
  const priceMonthly = priceProp !== undefined && shown ? shown.priceMonthly : priceProp;
  const hours = hoursMonthly !== undefined ? `${formatHours(hoursMonthly)} h` : null;

  if (layout?.variant === "table") {
    return (
      <TableRow className="font-normal">
        {COLUMN_META.map((meta) => {
          let content: React.ReactNode = null;
          if (meta.id === "raum") {
            content = (
              <div className="min-w-0">
                <div className="font-medium text-foreground">{label}</div>
                {description != null && <div className="text-xs text-muted-foreground">{description}</div>}
              </div>
            );
          } else if (meta.id === "turnus") content = control ?? null;
          else if (meta.id === "stunden" && hoursMonthly !== undefined) content = formatHours(hoursMonthly);
          else if (meta.id === "preis" && priceMonthly !== undefined) content = <Money value={priceMonthly} />;
          return (
            <TableCell key={meta.id} className={cn("py-2", metaCellClass(meta))}>
              {content}
            </TableCell>
          );
        })}
        {layout.hasActions && <TableCell className="w-12 py-2" />}
      </TableRow>
    );
  }

  const Comp = layout?.variant === "list" ? "li" : "div";
  return (
    <Comp className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description != null && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {control != null && <div className="w-28 shrink-0">{control}</div>}
      {(priceMonthly !== undefined || hours) && (
        <div className="shrink-0 text-right">
          {priceMonthly !== undefined && <Money value={priceMonthly} className="block text-sm font-medium" />}
          {hours && <div className="text-xs tabular-nums text-muted-foreground">{hours}</div>}
        </div>
      )}
    </Comp>
  );
}

/* ── Tabelle ──────────────────────────────────────────────────────────── */

export interface RoomsTotal {
  label: string;
  area: number;
  hoursMonthly: number;
  priceMonthly: number;
}

export interface RoomsTableProps {
  groups: RoomGroup[];
  rate: number;
  /** Ohne Handler: schreibgeschützt (kein Menü, Turnus als Text). */
  handlers?: RoomRowHandlers;
  /** Zusätzliche Fußzeilen (`RoomsFooterRow`, z. B. `SetupTimeEditor compact`). */
  footer?: React.ReactNode;
  total: RoomsTotal;
  caption?: string;
  density?: "comfortable" | "compact";
  className?: string;
}

/**
 * Raumtabelle (ab md): gruppiert nach Raumgruppe, Turnus direkt änderbar,
 * aufklappbare Leistungsdetails, Zwischensummen je Gruppe, Fußzeilen und
 * Gesamtsumme. Klick/Enter auf eine Zeile öffnet den Raum-Editor.
 */
export function RoomsTable({
  groups,
  rate,
  handlers,
  footer,
  total,
  caption = "Räume mit Fläche, Turnus, Leistung und Monatspreis",
  density = "comfortable",
  className,
}: RoomsTableProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showActions = hasRowActions(handlers);
  const showSubtotals = groups.length > 1;
  const detailId = React.useId();

  const columnContent: Record<ColumnId, Omit<Column<RoomRow>, "id" | "hideBelow" | "numeric">> = {
    raum: {
      header: "Raum",
      cell: (row) => {
        const name = roomDisplayName(row.room);
        const isOpen = expanded.has(row.room.id);
        return (
          <div className="flex min-w-0 items-start gap-1">
            <IconButton
              label={`Leistungsdetails zu ${name}`}
              icon={ChevronRight}
              size="sm"
              tooltip={false}
              aria-expanded={isOpen}
              aria-controls={isOpen ? `${detailId}-${row.room.id}` : undefined}
              onClick={() => toggle(row.room.id)}
              className={cn("-my-1 -ml-2 [&_svg]:transition-transform", isOpen && "[&_svg]:rotate-90")}
            />
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground" title={name}>
                {name}
              </div>
              {row.room.typeName && row.room.typeName !== name && (
                <div className="truncate text-xs text-muted-foreground">{row.room.typeName}</div>
              )}
            </div>
          </div>
        );
      },
      footer: <span>{total.label}</span>,
      // Nimmt die Restbreite; lange Namen kürzen statt die Tabelle zu verbreitern.
      cellClassName: "w-full max-w-0",
    },
    gruppe: {
      header: "Gruppe",
      cell: (row) => <span className="text-muted-foreground">{row.room.groupName || "–"}</span>,
    },
    flaeche: {
      header: "Fläche",
      unit: "m²",
      cell: (row) => formatArea(row.room.area),
      footer: formatArea(total.area, 1),
      width: "6rem",
    },
    turnus: {
      header: "Turnus",
      cell: (row) => {
        const option = getFrequencyOption(row.room.frequency);
        if (!handlers?.onFrequencyChange) {
          return <span title={option?.label}>{option?.short ?? row.room.frequency}</span>;
        }
        return (
          <FrequencySelect
            value={row.room.frequency}
            onValueChange={(f) => handlers.onFrequencyChange?.(row.room, f)}
            labels="short"
            inputSize="sm"
            aria-label={`Turnus für ${roomDisplayName(row.room)}`}
            wrapperClassName="w-28"
          />
        );
      },
      width: "8.5rem",
    },
    lw: {
      header: "LW eff.",
      unit: "m²/h",
      cell: (row) => (
        <span className="inline-flex items-center justify-end gap-1.5">
          {row.isAdjusted && (
            <Badge tone="neutral" size="sm">
              angepasst
            </Badge>
          )}
          {formatNumber(row.effectivePerformance, 0)}
        </span>
      ),
    },
    minuten: {
      header: "Min./Reinigung",
      cell: (row) => formatNumber(row.timePerCleaning * 60, 0),
    },
    stunden: {
      header: "Std./Mo",
      cell: (row) => formatHours(row.hoursMonthly),
      footer: formatHours(total.hoursMonthly),
    },
    preis: {
      header: "€/Mo",
      cell: (row) => <Money value={row.priceMonthly} />,
      footer: <Money value={total.priceMonthly} className="font-semibold" />,
    },
  };

  const columns: Column<RoomRow>[] = COLUMN_META.map((meta) => ({
    id: meta.id,
    hideBelow: meta.hideBelow,
    numeric: meta.numeric,
    ...columnContent[meta.id],
  }));

  const tableGroups: DataTableGroup<RoomRow>[] = groups.map((g) => ({
    id: g.groupId,
    label: (
      <span>
        {g.groupName}
        <span className="ml-1.5 font-normal text-muted-foreground">
          · {g.rooms.length} {g.rooms.length === 1 ? "Raum" : "Räume"}
        </span>
      </span>
    ),
    rows: g.rows,
    footerCells: showSubtotals
      ? {
          raum: <span className="text-xs text-muted-foreground">Summe {g.groupName}</span>,
          flaeche: formatArea(g.area, 1),
          stunden: formatHours(g.hoursMonthly),
          preis: <Money value={g.priceMonthly} />,
        }
      : undefined,
  }));

  return (
    <DataTable<RoomRow>
      caption={caption}
      columns={columns}
      groups={tableGroups}
      getRowId={(row) => row.room.id}
      layout="table"
      density={density}
      mobile={() => null}
      onRowClick={(row) => (handlers?.onEdit ? handlers.onEdit(row.room) : toggle(row.room.id))}
      rowActions={showActions && handlers ? (row) => <RoomActionsMenu room={row.room} handlers={handlers} /> : undefined}
      expandedIds={expanded}
      renderExpanded={(row) => (
        <RoomPerformanceDetail
          id={`${detailId}-${row.room.id}`}
          room={row.room}
          rate={rate}
          onEdit={handlers?.onEdit}
          shown={{ hoursMonthly: row.hoursMonthly, priceMonthly: row.priceMonthly }}
          className="px-1"
        />
      )}
      footerRows={
        footer != null ? (
          <RoomsFooterProvider layout={{ variant: "table", hasActions: showActions }}>{footer}</RoomsFooterProvider>
        ) : undefined
      }
      className={className}
    />
  );
}
