import * as React from "react";
import { Check, Copy, Ellipsis, Minus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, columnHideClass, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { InfoHint } from "@/components/ui/info-hint";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import type { HmsConfig, HmsResult, HmsTask, HmsTaskResult } from "@/lib/service-modules/types";
import { cn, formatNumber } from "@/lib/utils";
import {
  formatCount,
  hmsDisplayAmounts,
  taskCategoryLabel,
  taskDisplayName,
  taskFrequencyLabel,
  taskNote,
  taskQuantityLabel,
  taskResultMap,
  taskTimeLabel,
  travelLabel,
} from "./hms-ui";

interface TaskRow {
  task: HmsTask;
  res: HmsTaskResult | undefined;
}

export interface TaskRowHandlers {
  onToggle?: (task: HmsTask, enabled: boolean) => void;
  onEdit?: (task: HmsTask) => void;
  onDuplicate?: (task: HmsTask) => void;
  onRemove?: (task: HmsTask) => void;
}

export interface TaskTableProps extends TaskRowHandlers {
  config: HmsConfig;
  result: HmsResult;
  empty?: React.ReactNode;
  /** In einer `Card padding="none"` auf false setzen. */
  framed?: boolean;
  className?: string;
}

const hours = (v: number) => formatNumber(v, 1);
const euro = (v: number) => formatNumber(v, 2);

function TaskActionsMenu({ task, onEdit, onDuplicate, onRemove }: TaskRowHandlers & { task: HmsTask }) {
  if (!onEdit && !onDuplicate && !onRemove) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={`Aktionen für ${taskDisplayName(task)}`} icon={Ellipsis} size="sm" tooltip={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onSelect={() => onEdit(task)}>
            <Pencil aria-hidden="true" />
            Bearbeiten
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem onSelect={() => onDuplicate(task)}>
            <Copy aria-hidden="true" />
            Duplizieren
          </DropdownMenuItem>
        )}
        {onRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => onRemove(task)}>
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
 * Aktiv-Schalter mit ausreichend großer Trefferfläche (≥ 32 px, Touch 44 px):
 * Das umschließende `<label>` leitet Klicks auf den Schalter weiter und
 * verhindert, dass ein knapper Fehlgriff die Zeile (Bearbeiten) öffnet.
 */
function ActiveSwitch({ task, onToggle }: { task: HmsTask; onToggle: NonNullable<TaskRowHandlers["onToggle"]> }) {
  return (
    <label
      data-no-row-click
      className="relative z-10 inline-flex h-8 min-w-11 shrink-0 cursor-pointer items-center justify-center pointer-coarse:size-11"
    >
      <Switch checked={task.enabled} onCheckedChange={(v) => onToggle(task, v)} aria-label={`${taskDisplayName(task)} aktiv`} />
    </label>
  );
}

function ActiveCell({ task, onToggle }: { task: HmsTask; onToggle?: TaskRowHandlers["onToggle"] }) {
  if (onToggle) return <ActiveSwitch task={task} onToggle={onToggle} />;
  return task.enabled ? (
    <span className="inline-flex text-foreground">
      <Check aria-hidden="true" className="size-4" />
      <span className="sr-only">aktiv</span>
    </span>
  ) : (
    <span className="inline-flex text-muted-foreground">
      <Minus aria-hidden="true" className="size-4" />
      <span className="sr-only">inaktiv</span>
    </span>
  );
}

/**
 * Leistungstabelle des Hausmeisterservice mit Anfahrten-Zeile und Summe
 * (Ø €/Monat = `revenueMonthly`). Inaktive Leistungen erscheinen gedämpft
 * und zählen nicht in die Summen. Ohne Handler schreibgeschützt.
 */
export function TaskTable({ config, result, onToggle, onEdit, onDuplicate, onRemove, empty, framed = true, className }: TaskTableProps) {
  const resultById = React.useMemo(() => taskResultMap(result), [result]);
  const rows: TaskRow[] = config.tasks.map((task) => ({ task, res: task.enabled ? resultById.get(task.id) : undefined }));
  const hasActions = !!(onEdit || onDuplicate || onRemove);
  // Anzeige-Rundung: Zeilen + Anfahrten ergeben exakt die Summenzeile.
  const shown = React.useMemo(() => hmsDisplayAmounts(result), [result]);
  const travelMonthly = shown.travelMonthly;
  const showTravel = result.travelHoursAnnual > 0;
  const rowMonthly = (r: TaskRow) => (r.res ? (shown.monthlyById.get(r.task.id) ?? 0) : 0);
  const rowHours = (r: TaskRow) => (r.res ? (shown.hoursById.get(r.task.id) ?? 0) : 0);

  const columns: Column<TaskRow>[] = [
    {
      id: "aktiv",
      header: "Aktiv",
      width: "4.5rem",
      cell: (r) => <ActiveCell task={r.task} onToggle={onToggle} />,
    },
    {
      id: "leistung",
      header: "Leistung",
      cell: (r) => {
        const note = taskNote(r.task);
        return (
          <div className="flex min-w-0 items-start gap-1">
            <div className="min-w-0 hyphens-auto break-words">
              <div className={cn("font-medium", r.task.enabled ? "text-foreground" : "text-muted-foreground")}>
                {taskDisplayName(r.task)}
                {!r.task.enabled && (
                  <Badge tone="neutral" size="sm" className="ml-2 align-middle">
                    inaktiv
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{taskCategoryLabel(r.task)}</div>
            </div>
            {note && (
              <InfoHint label={`Hinweis: ${taskDisplayName(r.task)}`} className="-mt-0.5">
                {note}
              </InfoHint>
            )}
          </div>
        );
      },
      footer: "Gesamt",
      // Nimmt die Restbreite und bricht lange Namen um, statt die Tabelle zu verbreitern.
      cellClassName: "w-full max-w-0",
    },
    { id: "menge", header: "Menge", align: "end", cell: (r) => <span className="tabular-nums">{taskQuantityLabel(r.task)}</span> },
    { id: "zeit", header: "Zeitwert", hideBelow: "lg", cell: (r) => taskTimeLabel(r.task) },
    { id: "turnus", header: "Turnus", cell: (r) => taskFrequencyLabel(r.task) },
    {
      id: "stunden",
      header: "Std./Jahr",
      numeric: true,
      hideBelow: "lg",
      cell: (r) => (r.res ? hours(rowHours(r)) : "–"),
      footer: hours(shown.laborHoursAnnual),
    },
    {
      id: "material",
      header: "Material",
      unit: "€/Jahr",
      numeric: true,
      hideBelow: "xl",
      cell: (r) => (r.task.materialCostPerYear ? euro(r.task.materialCostPerYear) : "–"),
      footer: result.materialCostAnnual > 0 ? euro(result.materialCostAnnual) : "–",
    },
    {
      id: "monat",
      header: "Ø €/Monat",
      numeric: true,
      cell: (r) => (r.res ? <Money value={rowMonthly(r)} /> : "–"),
      footer: <Money value={shown.revenueMonthly} />,
    },
  ];

  const travelCells: Partial<Record<string, React.ReactNode>> = {
    leistung: <span className="font-medium text-foreground">{travelLabel(result, config)}</span>,
    stunden: hours(shown.travelHoursAnnual),
    monat: <Money value={travelMonthly} />,
  };

  const footerRows = showTravel ? (
    <TableRow className="font-normal">
      {columns.map((col) => (
        <TableCell
          key={col.id}
          numeric={col.numeric}
          className={cn("py-1.5", col.align === "end" && "text-right", columnHideClass(col.hideBelow, col.onlyBelow))}
        >
          {travelCells[col.id] ?? null}
        </TableCell>
      ))}
      {hasActions && <TableCell className="w-12 py-1.5" />}
    </TableRow>
  ) : undefined;

  return (
    <DataTable
      caption="Leistungen des Hausmeisterservice"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.task.id}
      density="compact"
      framed={framed}
      className={className}
      empty={empty}
      footerRows={footerRows}
      rowClassName={(r) => (r.task.enabled ? undefined : "text-muted-foreground")}
      onRowClick={onEdit ? (r) => onEdit(r.task) : undefined}
      rowActions={hasActions ? (r) => <TaskActionsMenu task={r.task} onEdit={onEdit} onDuplicate={onDuplicate} onRemove={onRemove} /> : undefined}
      mobile={(r) => (
        <ListRow
          className={cn(!r.task.enabled && "text-muted-foreground")}
          title={
            <>
              {taskDisplayName(r.task)}
              {!r.task.enabled && <span className="ml-1 font-normal text-muted-foreground">(inaktiv)</span>}
            </>
          }
          meta={[taskQuantityLabel(r.task), taskTimeLabel(r.task), taskFrequencyLabel(r.task)].join(" · ")}
          onClick={onEdit ? () => onEdit(r.task) : undefined}
          chevron={false}
          trailing={
            // Betrag über den Bedienelementen: lässt dem Leistungsnamen auf Phones genug Breite.
            <div className="flex flex-col items-end gap-1">
              {r.res ? <Money value={rowMonthly(r)} size="sm" /> : null}
              <div className="flex items-center gap-1">
                {onToggle && <ActiveSwitch task={r.task} onToggle={onToggle} />}
                <TaskActionsMenu task={r.task} onEdit={onEdit} onDuplicate={onDuplicate} onRemove={onRemove} />
              </div>
            </div>
          }
        />
      )}
      mobileFooter={
        rows.length > 0 ? (
          <div className="space-y-1">
            {showTravel && (
              <div className="flex justify-between gap-3 font-normal">
                <span>{travelLabel(result, config)}</span>
                <Money value={travelMonthly} size="sm" />
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span>
                Gesamt · {hours(shown.laborHoursAnnual)} Std./Jahr
                {result.visitDaysPerYear > 0 && (
                  <span className="sr-only"> bei {formatCount(result.visitDaysPerYear)} Einsatztagen</span>
                )}
              </span>
              <Money value={shown.revenueMonthly} period="month" />
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
