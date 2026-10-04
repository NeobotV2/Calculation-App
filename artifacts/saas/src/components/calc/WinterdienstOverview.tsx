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
import { calcHourlyRate } from "@/lib/hourly-rate-calc";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import type { ModuleFinding } from "@/lib/service-modules/plausibility";
import type { ModuleRates, WinterdienstConfig, WinterdienstResult } from "@/lib/service-modules/types";
import { useStore, type Project } from "@/store/use-store";
import { ModuleFindingsList } from "./ModuleFindingsList";
import { AreaTable } from "./winterdienst/AreaTable";
import { ScenarioTable } from "./winterdienst/ScenarioTable";
import { WinterdienstKpis, WinterdienstResultLines } from "./winterdienst/WinterdienstResultCard";
import { winterFindings, winterMetaLine } from "./winterdienst/winterdienst-ui";

/** Sätze des Objekts (wie computeObjectEconomics), falls der Aufrufer keine übergibt. */
export function useObjectModuleRates(project: Pick<Project, "hourlyRate">, override?: ModuleRates): ModuleRates {
  const hourlyRate = useStore((s) => s.hourlyRate);
  const config = useStore((s) => s.hourlyRateConfig);
  const vollkosten = React.useMemo(() => calcHourlyRate(config).vollkosten, [config]);
  const rate = project.hourlyRate ?? hourlyRate;
  return React.useMemo(() => override ?? { rate, vollkosten }, [override, rate, vollkosten]);
}

export interface WinterdienstOverviewProps {
  project: Project;
  config: WinterdienstConfig;
  /** Ergebnis aus `econ.totals.winterdienst`; bei pausiertem Modul (null) wird es hier berechnet. */
  result?: WinterdienstResult | null;
  /** Modul-Befunde (alle oder nur Winterdienst). */
  findings?: readonly ModuleFinding[];
  /** Öffnet den Editor (ResponsiveSheet lg). */
  onEdit?: () => void;
  /** Pausieren/Aktivieren; erhält den neuen Zustand. */
  onToggleEnabled?: (enabled: boolean) => void;
  /** Entfernen (nach Bestätigung). */
  onRemove?: () => void;
  /** Schreibgeschützt (z. B. archiviert): keine Aktionen. */
  readOnly?: boolean;
  /** Sätze für die Berechnung bei fehlendem `result` (Standard: Objektsatz + Vollkosten). */
  rates?: ModuleRates;
  targetMarginPct?: number;
  className?: string;
}

/** Workspace-Abschnitt Winterdienst (§7.4): Kennzahlen, Flächen, Abrechnung, Szenarien und Befunde. */
export function WinterdienstOverview({
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
}: WinterdienstOverviewProps) {
  const uid = React.useId();
  const moduleRates = useObjectModuleRates(project, rates);
  const r = React.useMemo(() => result ?? calcWinterdienst(config, moduleRates), [result, config, moduleRates]);
  const list = React.useMemo(() => winterFindings(findings), [findings]);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const paused = !config.enabled;
  const hasMenu = !readOnly && (!!onToggleEnabled || !!onRemove);

  return (
    <Card as="section" padding="none" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        titleAs="h2"
        title={
          <span id={`${uid}-title`} className="flex flex-wrap items-center gap-2">
            <ModuleIcon module="winterdienst" size="sm" decorative />
            Winterdienst
            {paused && <Badge tone="neutral">Pausiert</Badge>}
          </span>
        }
        description={winterMetaLine(config)}
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
                    <IconButton label="Weitere Aktionen für Winterdienst" icon={Ellipsis} size="sm" tooltip={false} />
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
            Der Winterdienst bleibt gespeichert, fließt aber derzeit nicht in Preis und Angebot ein.
          </Callout>
        )}
        <WinterdienstKpis result={r} targetMarginPct={targetMarginPct} />
        <WinterdienstResultLines result={r} />

        <div className="space-y-2">
          <h3 className="text-h3 text-foreground">Flächen</h3>
          <AreaTable
            config={config}
            result={r}
            empty={
              <StateView
                kind="empty"
                compact
                titleAs="h3"
                title="Noch keine Flächen erfasst"
                description="Ohne Flächen kann der Winterdienst nicht kalkuliert werden."
                action={!readOnly && onEdit ? { label: "Flächen erfassen", icon: Plus, onClick: onEdit } : undefined}
                className="rounded-lg border border-dashed border-border"
              />
            }
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-h3 text-foreground">Wetterszenarien je Saison</h3>
          <ScenarioTable result={r} targetMarginPct={targetMarginPct} />
        </div>

        <ModuleFindingsList findings={list} compact heading="Hinweise" />
      </CardContent>

      {onRemove && (
        <ConfirmDialog
          open={confirmRemove}
          onClose={() => setConfirmRemove(false)}
          onConfirm={onRemove}
          title="Winterdienst entfernen?"
          description="Alle Winterdienst-Daten dieses Objekts werden gelöscht."
          confirmLabel="Entfernen"
          destructive
        />
      )}
    </Card>
  );
}
