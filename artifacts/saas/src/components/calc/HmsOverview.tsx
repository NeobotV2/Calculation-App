import * as React from "react";
import { Ellipsis, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { ModuleIcon } from "@/components/ui/module-badge";
import { StateView } from "@/components/ui/state-view";
import { calcHms } from "@/lib/service-modules/hms";
import type { ModuleFinding } from "@/lib/service-modules/plausibility";
import type { HmsConfig, HmsResult, ModuleRates } from "@/lib/service-modules/types";
import type { Project } from "@/store/use-store";
import { ModuleFindingsList } from "./ModuleFindingsList";
import { useObjectModuleRates } from "./WinterdienstOverview";
import { HmsContingentLine, HmsKpis } from "./hms/HmsResultCard";
import { MonthProfileBar } from "./hms/MonthProfileBar";
import { TaskTable } from "./hms/TaskTable";
import { hmsFindings, hmsMetaLine } from "./hms/hms-ui";

export interface HmsOverviewProps {
  project: Project;
  config: HmsConfig;
  /** Ergebnis aus `econ.totals.hms`; bei pausiertem Modul (null) wird es hier berechnet. */
  result?: HmsResult | null;
  /** Modul-Befunde (alle oder nur HMS). */
  findings?: readonly ModuleFinding[];
  onEdit?: () => void;
  /** Pausieren/Aktivieren; erhält den neuen Zustand. */
  onToggleEnabled?: (enabled: boolean) => void;
  /** Entfernen (nach Bestätigung). */
  onRemove?: () => void;
  readOnly?: boolean;
  /** Sätze für die Berechnung bei fehlendem `result` (Standard: Objektsatz + Vollkosten). */
  rates?: ModuleRates;
  targetMarginPct?: number;
  className?: string;
}

/** Workspace-Abschnitt Hausmeisterservice (§7.4): Kennzahlen, Leistungen, Monatsprofil und Befunde. */
export function HmsOverview({
  project,
  config,
  result,
  findings,
  onEdit,
  onToggleEnabled,
  onRemove,
  readOnly = false,
  rates,
  targetMarginPct,
  className,
}: HmsOverviewProps) {
  const uid = React.useId();
  const moduleRates = useObjectModuleRates(project, rates);
  const r = React.useMemo(() => result ?? calcHms(config, moduleRates), [result, config, moduleRates]);
  const list = React.useMemo(() => hmsFindings(findings), [findings]);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const paused = !config.enabled;
  const hasMenu = !readOnly && (!!onToggleEnabled || !!onRemove);

  return (
    <Card as="section" padding="none" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        titleAs="h2"
        title={
          <span id={`${uid}-title`} className="flex flex-wrap items-center gap-2">
            <ModuleIcon module="hms" size="sm" decorative />
            Hausmeisterservice
            {paused && <Badge tone="neutral">Pausiert</Badge>}
          </span>
        }
        description={hmsMetaLine(config, r)}
        action={
          !readOnly && (onEdit || hasMenu) ? (
            <>
              {onEdit && (
                <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
                  <Pencil aria-hidden="true" />
                  Bearbeiten
                </Button>
              )}
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton label="Weitere Aktionen für Hausmeisterservice" icon={Ellipsis} size="sm" tooltip={false} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onToggleEnabled && (
                      <DropdownMenuItem onSelect={() => onToggleEnabled(!config.enabled)}>
                        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                        {paused ? "Aktivieren" : "Pausieren"}
                      </DropdownMenuItem>
                    )}
                    {onToggleEnabled && onRemove && <DropdownMenuSeparator />}
                    {onRemove && (
                      <DropdownMenuItem destructive onSelect={() => setConfirmRemove(true)}>
                        <Trash2 aria-hidden="true" />
                        Entfernen
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : undefined
        }
      />
      <CardContent className="space-y-5">
        {paused && (
          <Callout tone="neutral" title="Pausiert">
            Der Hausmeisterservice bleibt gespeichert, fließt aber derzeit nicht in Preis und Angebot ein.
          </Callout>
        )}
        <HmsKpis result={r} targetMarginPct={targetMarginPct} />
        <HmsContingentLine result={r} />

        <div className="space-y-2">
          <h3 className="text-h3 text-foreground">Leistungen</h3>
          <TaskTable
            config={config}
            result={r}
            empty={
              <StateView
                kind="empty"
                compact
                titleAs="h3"
                title="Noch keine Leistungen erfasst"
                description="Wählen Sie Leistungen aus dem Katalog oder legen Sie eigene an."
                action={!readOnly && onEdit ? { label: "Leistungen erfassen", icon: Plus, onClick: onEdit } : undefined}
                className="rounded-lg border border-dashed border-border"
              />
            }
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-h3 text-foreground">Arbeitsstunden je Monat</h3>
          <MonthProfileBar hours={r.monthlyLaborHours} />
        </div>

        <ModuleFindingsList findings={list} compact heading="Hinweise" />
      </CardContent>

      {onRemove && (
        <ConfirmDialog
          open={confirmRemove}
          onClose={() => setConfirmRemove(false)}
          onConfirm={onRemove}
          title="Hausmeisterservice entfernen?"
          description="Alle Hausmeisterservice-Daten dieses Objekts werden gelöscht."
          confirmLabel="Entfernen"
          destructive
        />
      )}
    </Card>
  );
}
