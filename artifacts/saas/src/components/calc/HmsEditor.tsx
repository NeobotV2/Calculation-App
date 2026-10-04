import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StateView } from "@/components/ui/state-view";
import { calcHms } from "@/lib/service-modules/hms";
import type { ModuleFinding } from "@/lib/service-modules/plausibility";
import type { HmsConfig, HmsResult, HmsTask, ModuleRates } from "@/lib/service-modules/types";
import { SHEET_STICKY_RESULT } from "@/components/ui/responsive-sheet";
import { cn } from "@/lib/utils";
import { ModuleFindingsList } from "./ModuleFindingsList";
import { CatalogPicker } from "./hms/CatalogPicker";
import { HmsContingentLine, HmsKpis, HmsResultCard } from "./hms/HmsResultCard";
import { HmsSettingsCard } from "./hms/HmsSettingsCard";
import { MonthProfileBar } from "./hms/MonthProfileBar";
import { TaskSheet } from "./hms/TaskSheet";
import { TaskTable } from "./hms/TaskTable";
import {
  addCatalogItems,
  createCustomTask,
  duplicateTask,
  hmsFindings,
  missingPresetTasks,
  presetTargetLabel,
  removeTask,
  setTaskEnabled,
  upsertTask,
} from "./hms/hms-ui";

export interface HmsTasksCardProps {
  value: HmsConfig;
  onChange: (next: HmsConfig) => void;
  result: HmsResult;
  objectType?: string;
  readOnly?: boolean;
  className?: string;
}

/** Karte 1 · Leistungen: Katalog, Leistungstabelle und Leistungs-Sheet. */
export function HmsTasksCard({ value, onChange, result, objectType, readOnly = false, className }: HmsTasksCardProps) {
  const uid = React.useId();
  const [sheet, setSheet] = React.useState<{ task: HmsTask; isNew: boolean } | null>(null);
  const [open, setOpen] = React.useState(false);
  const missing = missingPresetTasks(value, objectType);

  const startCustom = () => {
    setSheet({ task: createCustomTask(uuidv4()), isNew: true });
    setOpen(true);
  };

  const handlers = readOnly
    ? {}
    : {
        onToggle: (task: HmsTask, enabled: boolean) => onChange(setTaskEnabled(value, task.id, enabled)),
        onEdit: (task: HmsTask) => {
          setSheet({ task, isNew: false });
          setOpen(true);
        },
        onDuplicate: (task: HmsTask) => onChange(duplicateTask(value, task.id, uuidv4())),
        onRemove: (task: HmsTask) => onChange(removeTask(value, task.id)),
      };

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        title={<span id={`${uid}-title`}>Leistungen</span>}
        description="Leistungen aus dem Katalog übernehmen oder eigene anlegen. Zeiten, Mengen und Turnus sind Richtwerte."
      />
      <div className="space-y-5">
        {!readOnly && <CatalogPicker value={value} onChange={onChange} objectType={objectType} onCustom={startCustom} />}
        <TaskTable
          config={value}
          result={result}
          {...handlers}
          empty={
            <StateView
              kind="empty"
              compact
              titleAs="h3"
              title="Noch keine Leistungen erfasst"
              description="Übernehmen Sie den Vorschlag für die Objektart oder legen Sie eigene Leistungen an."
              action={
                readOnly
                  ? undefined
                  : missing.length > 0
                    ? {
                        label: `Vorschlag für ${presetTargetLabel(objectType)} übernehmen`,
                        icon: Plus,
                        onClick: () => onChange(addCatalogItems(value, missing, uuidv4)),
                      }
                    : { label: "Eigene Leistung", icon: Plus, onClick: startCustom }
              }
              secondaryAction={readOnly || missing.length === 0 ? undefined : { label: "Eigene Leistung", onClick: startCustom }}
              className="rounded-lg border border-dashed border-border"
            />
          }
        />
      </div>

      {!readOnly && (
        <TaskSheet
          open={open}
          onOpenChange={setOpen}
          task={sheet?.task ?? null}
          isNew={sheet?.isNew ?? true}
          onSave={(task, { next }) => {
            onChange(upsertTask(value, task));
            if (next) setSheet({ task: createCustomTask(uuidv4()), isNew: true });
            else setOpen(false);
          }}
        />
      )}
    </Card>
  );
}

export interface HmsEditorProps {
  value: HmsConfig;
  /** Immer eine neue Config (unveränderlich): `onChange({ ...value, … })`. */
  onChange: (next: HmsConfig) => void;
  /** Objektsatz und Vollkosten (z. B. `econ.rates`). */
  rates: ModuleRates;
  /** Modul-Befunde des Objekts (alle oder nur HMS; gefiltert wird hier). */
  findings?: readonly ModuleFinding[];
  /** Objektart für den Leistungsvorschlag. */
  objectType?: string;
  /** `flow`: Karten untereinander (max-w-3xl). `sheet`: im ResponsiveSheet lg, Ergebnis ab md unten fixiert. */
  layout?: "flow" | "sheet";
  /** Ziel-Marge auf den Umsatz in %; Standard: aus den Einstellungen. */
  targetMarginPct?: number;
  readOnly?: boolean;
  className?: string;
}

/**
 * Hausmeisterservice-Editor (§7.3): Leistungen (Katalog, Tabelle, Sheet),
 * Einstellungen, Live-Ergebnis mit Monatsprofil und Befunde.
 * Das Ergebnis rechnet `calcHms(value, rates)`.
 */
export function HmsEditor({
  value,
  onChange,
  rates,
  findings,
  objectType,
  layout = "flow",
  targetMarginPct,
  readOnly = false,
  className,
}: HmsEditorProps) {
  const result = React.useMemo(() => calcHms(value, rates), [value, rates]);
  const list = React.useMemo(() => hmsFindings(findings), [findings]);
  const common = { value, onChange, readOnly };

  if (layout === "sheet") {
    return (
      <div className={cn("space-y-4", className)}>
        <HmsTasksCard {...common} result={result} objectType={objectType} />
        <HmsSettingsCard {...common} rates={rates} />
        <section aria-label="Arbeitsstunden je Monat" className="space-y-2">
          <h3 className="text-h3 text-foreground">Arbeitsstunden je Monat</h3>
          <MonthProfileBar hours={result.monthlyLaborHours} />
        </section>
        <ModuleFindingsList findings={list} compact label="Hinweise zum Hausmeisterservice" heading="Hinweise" />
        <HmsContingentLine result={result} />
        <div className={SHEET_STICKY_RESULT}>
          <section aria-label="Ergebnis Hausmeisterservice" className="rounded-lg border border-border bg-card p-4 shadow-raised">
            <HmsKpis result={result} targetMarginPct={targetMarginPct} />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto max-w-3xl space-y-6", className)}>
      <HmsTasksCard {...common} result={result} objectType={objectType} />
      <HmsSettingsCard {...common} rates={rates} />
      <HmsResultCard result={result} targetMarginPct={targetMarginPct} />
      <ModuleFindingsList findings={list} label="Hinweise zum Hausmeisterservice" heading="Hinweise zum Hausmeisterservice" />
    </div>
  );
}
