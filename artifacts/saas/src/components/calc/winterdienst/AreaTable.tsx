import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { Check, Copy, Ellipsis, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { ListRow } from "@/components/ui/list-row";
import { StateView } from "@/components/ui/state-view";
import { createWinterArea } from "@/data/winterdienst";
import type { WinterArea, WinterAreaResult, WinterAreaType, WinterdienstConfig, WinterdienstResult } from "@/lib/service-modules/types";
import { formatNumber } from "@/lib/utils";
import { AreaSheet, SwitchRow } from "./AreaSheet";
import {
  METHOD_LABELS,
  areaDisplayName,
  areaMaterialLabel,
  areaMinutesPerEinsatz,
  areaTypeLabel,
  areaWorkLabel,
  duplicateArea,
  formatCount,
  machineAllowed,
  removeArea,
  upsertArea,
} from "./winterdienst-ui";

interface AreaRow {
  area: WinterArea;
  index: number;
  res: WinterAreaResult | undefined;
  minutes: number;
}

export interface AreaRowHandlers {
  onEdit?: (area: WinterArea) => void;
  onDuplicate?: (area: WinterArea) => void;
  onRemove?: (area: WinterArea) => void;
}

export interface AreaTableProps extends AreaRowHandlers {
  config: WinterdienstConfig;
  result: WinterdienstResult;
  /** Leerzustand (nur ohne Flächen); Standard: einfacher Hinweis. */
  empty?: React.ReactNode;
  /** In einer `Card padding="none"` auf false setzen. */
  framed?: boolean;
  className?: string;
}

function YesNo({ value, label }: { value: boolean; label: string }) {
  return value ? (
    <span className="inline-flex justify-center text-foreground">
      <Check aria-hidden="true" className="size-4" />
      <span className="sr-only">{label}: ja</span>
    </span>
  ) : (
    <span className="inline-flex justify-center text-muted-foreground">
      <Minus aria-hidden="true" className="size-4" />
      <span className="sr-only">{label}: nein</span>
    </span>
  );
}

function AreaActionsMenu({ area, onEdit, onDuplicate, onRemove }: AreaRowHandlers & { area: WinterArea }) {
  const name = areaDisplayName(area);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={`Aktionen für ${name}`} icon={Ellipsis} size="sm" tooltip={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onSelect={() => onEdit(area)}>
            <Pencil aria-hidden="true" />
            Bearbeiten
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem onSelect={() => onDuplicate(area)}>
            <Copy aria-hidden="true" />
            Duplizieren
          </DropdownMenuItem>
        )}
        {onRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => onRemove(area)}>
              <Trash2 aria-hidden="true" />
              Entfernen
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Flächentabelle des Winterdienstes (DataTable; unter md Listenzeilen).
 * Ohne Handler schreibgeschützt (Übersicht).
 */
export function AreaTable({ config, result, onEdit, onDuplicate, onRemove, empty, framed = true, className }: AreaTableProps) {
  const rows: AreaRow[] = config.areas.map((area, index) => ({
    area,
    index,
    res: result.areas[index],
    minutes: areaMinutesPerEinsatz(result, index, config.clearingSharePct),
  }));
  const totalM2 = rows.reduce((s, r) => s + (Number.isFinite(r.area.areaM2) ? r.area.areaM2 : 0), 0);
  const totalMin = rows.reduce((s, r) => s + r.minutes, 0);
  const hasActions = !!(onEdit || onDuplicate || onRemove);

  const columns: Column<AreaRow>[] = [
    {
      id: "bezeichnung",
      header: "Bezeichnung",
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{areaDisplayName(r.area)}</div>
          <div className="truncate text-xs text-muted-foreground">{areaTypeLabel(r.area.type)}</div>
        </div>
      ),
      footer: "Summe",
    },
    {
      id: "flaeche",
      header: "Fläche",
      unit: "m²",
      numeric: true,
      cell: (r) => formatCount(r.area.areaM2, 2),
      footer: formatCount(totalM2, 2),
    },
    {
      // Schmale Tabelle (Flow, Arbeitsbereich): Methode, Räumen/Streuen und Streugut in einer Spalte.
      id: "leistung",
      header: "Leistung",
      onlyBelow: "lg",
      cellClassName: "min-w-32",
      cell: (r) => (
        <span className="text-sm">
          {areaWorkLabel(r.area, config, { short: true })}
          <span className="block text-xs text-muted-foreground">{METHOD_LABELS[r.res?.effectiveMethod ?? r.area.method]}</span>
        </span>
      ),
    },
    {
      id: "methode",
      header: "Methode",
      hideBelow: "lg",
      cell: (r) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {METHOD_LABELS[r.res?.effectiveMethod ?? r.area.method]}
          {!machineAllowed(r.area.type) && (
            <Badge tone="neutral" size="sm">
              nur manuell
            </Badge>
          )}
        </span>
      ),
    },
    { id: "raeumen", header: "Räumen", align: "center", hideBelow: "lg", cell: (r) => <YesNo value={r.area.clear} label="Räumen" /> },
    { id: "streuen", header: "Streuen", align: "center", hideBelow: "lg", cell: (r) => <YesNo value={r.area.spread} label="Streuen" /> },
    { id: "streugut", header: "Streugut", hideBelow: "lg", cell: (r) => areaMaterialLabel(r.area, config) },
    {
      id: "zeit",
      header: "Zeit je Einsatz",
      unit: "Min.",
      numeric: true,
      hideBelow: "lg",
      cell: (r) => formatNumber(r.minutes, 0),
      footer: formatNumber(totalMin, 0),
    },
    {
      // Schmale Tabelle: kurzer Kopf, damit Zeilenaktionen ohne Querscrollen sichtbar bleiben.
      id: "zeit_kompakt",
      header: "Zeit",
      unit: "Min.",
      numeric: true,
      onlyBelow: "lg",
      cell: (r) => formatNumber(r.minutes, 0),
      footer: formatNumber(totalMin, 0),
    },
  ];

  return (
    <DataTable
      caption="Winterdienst-Flächen"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.area.id}
      density="compact"
      framed={framed}
      className={className}
      empty={empty}
      onRowClick={onEdit ? (r) => onEdit(r.area) : undefined}
      rowActions={hasActions ? (r) => <AreaActionsMenu area={r.area} onEdit={onEdit} onDuplicate={onDuplicate} onRemove={onRemove} /> : undefined}
      mobile={(r) => (
        <ListRow
          title={areaDisplayName(r.area)}
          meta={[
            areaTypeLabel(r.area.type),
            `${formatCount(r.area.areaM2, 2)} m²`,
            METHOD_LABELS[r.res?.effectiveMethod ?? r.area.method],
            areaWorkLabel(r.area, config, { short: true }),
            `${formatNumber(r.minutes, 0)} Min.`,
          ].join(" · ")}
          onClick={onEdit ? () => onEdit(r.area) : undefined}
          chevron={false}
          trailing={hasActions ? <AreaActionsMenu area={r.area} onEdit={onEdit} onDuplicate={onDuplicate} onRemove={onRemove} /> : undefined}
        />
      )}
      mobileFooter={
        rows.length > 0 ? (
          <span className="flex justify-between gap-3">
            <span>Summe</span>
            <span className="tabular-nums">
              {formatCount(totalM2, 2)} m² · {formatNumber(totalMin, 0)} Min. je Einsatz
            </span>
          </span>
        ) : undefined
      }
    />
  );
}

export interface WinterAreasCardProps {
  value: WinterdienstConfig;
  onChange: (next: WinterdienstConfig) => void;
  result: WinterdienstResult;
  readOnly?: boolean;
  className?: string;
}

/** Karte 2 · Flächen: Tabelle, [+ Fläche], Salzbeschränkung und Flächen-Sheet. */
export function WinterAreasCard({ value, onChange, result, readOnly = false, className }: WinterAreasCardProps) {
  const uid = React.useId();
  const [sheet, setSheet] = React.useState<{ area: WinterArea; isNew: boolean } | null>(null);
  const [open, setOpen] = React.useState(false);

  const startNew = (type: WinterAreaType = "gehweg") => {
    setSheet({ area: createWinterArea(uuidv4(), type), isNew: true });
    setOpen(true);
  };

  const handlers: AreaRowHandlers = readOnly
    ? {}
    : {
        onEdit: (area) => {
          setSheet({ area, isNew: false });
          setOpen(true);
        },
        onDuplicate: (area) => onChange(duplicateArea(value, area.id, uuidv4())),
        onRemove: (area) => onChange(removeArea(value, area.id)),
      };

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        title={<span id={`${uid}-title`}>Flächen</span>}
        description="Räum- und Streuflächen mit m², Methode und Streugut."
        action={
          !readOnly && value.areas.length > 0 ? (
            <Button type="button" variant="tonal" size="sm" onClick={() => startNew(value.areas.at(-1)?.type)}>
              <Plus aria-hidden="true" />
              Fläche
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4">
        <AreaTable
          config={value}
          result={result}
          {...handlers}
          empty={
            <StateView
              kind="empty"
              compact
              titleAs="h3"
              title="Noch keine Flächen erfasst"
              description="Erfassen Sie Gehwege, Zufahrten, Parkplätze und Treppen mit ihrer Fläche."
              action={readOnly ? undefined : { label: "Erste Fläche hinzufügen", icon: Plus, onClick: () => startNew("gehweg") }}
              className="rounded-lg border border-dashed border-border"
            />
          }
        />
        <SwitchRow
          id={`${uid}-salt`}
          label="Ortssatzung schränkt Auftausalz ein"
          description="Auf Gehwegen und Zufahrten ist dann Splitt oder Granulat vorzusehen."
          checked={value.saltRestricted}
          onCheckedChange={(saltRestricted) => onChange({ ...value, saltRestricted })}
          disabled={readOnly}
        />
      </div>

      {!readOnly && (
        <AreaSheet
          open={open}
          onOpenChange={setOpen}
          area={sheet?.area ?? null}
          isNew={sheet?.isNew ?? true}
          config={value}
          onSave={(area, { next }) => {
            onChange(upsertArea(value, area));
            if (next) {
              setSheet({ area: createWinterArea(uuidv4(), area.type), isNew: true });
            } else {
              setOpen(false);
            }
          }}
        />
      )}
    </Card>
  );
}
