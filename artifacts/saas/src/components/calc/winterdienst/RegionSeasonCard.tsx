import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { InfoHint } from "@/components/ui/info-hint";
import { NumberInput } from "@/components/ui/number-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WINTER_REGION_DISCLAIMER, WINTER_REGION_PRESETS } from "@/data/winterdienst";
import type { WinterdienstConfig, WinterRegion } from "@/lib/service-modules/types";
import { formatSeason } from "@/lib/service-modules/util";
import { MonthPicker } from "../MonthPicker";
import {
  REGION_ORDER,
  WD_LIMITS,
  einsaetzeQuickPicks,
  regionBandText,
  regionChange,
  regionChipLabel,
} from "./winterdienst-ui";

export interface WinterCardProps {
  value: WinterdienstConfig;
  onChange: (next: WinterdienstConfig) => void;
  /** Nur lesen (z. B. archiviertes Objekt). */
  readOnly?: boolean;
  className?: string;
}

/** Karte 1 · Region & Saison: Region-Presets, Saison, erwartete Einsätze, Räumanteil. */
export function RegionSeasonCard({ value, onChange, readOnly = false, className }: WinterCardProps) {
  const uid = React.useId();
  const preset = WINTER_REGION_PRESETS[value.region] ?? WINTER_REGION_PRESETS.flachland;
  const picks = einsaetzeQuickPicks(value.region);

  const handleRegion = (region: string) => {
    if (!region || region === value.region) return;
    const { config, message } = regionChange(value, region as WinterRegion);
    onChange(config);
    toast.success(message);
  };

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        title={<span id={`${uid}-title`}>Region & Saison</span>}
        description="Die Region belegt Einsätze, Räumanteil und Saison mit Richtwerten vor. Alle Werte bleiben anpassbar."
      />
      <div className="space-y-5">
        <fieldset className="min-w-0 space-y-2" disabled={readOnly}>
          <legend className="mb-2 text-label text-muted-foreground">Region</legend>
          <ToggleGroup
            type="single"
            variant="chip"
            value={value.region}
            onValueChange={handleRegion}
            disabled={readOnly}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {REGION_ORDER.map((r) => {
              const chip = regionChipLabel(r);
              return (
                <ToggleGroupItem
                  key={r}
                  value={r}
                  className="h-auto min-h-11 w-full flex-col items-start justify-center gap-0.5 whitespace-normal rounded-lg px-3 py-2 text-left pointer-coarse:h-auto"
                >
                  <span className="text-sm font-medium">{chip.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{chip.sub}</span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          <Callout tone="info" className="p-3 text-xs">
            {WINTER_REGION_DISCLAIMER}
          </Callout>
        </fieldset>

        <MonthPicker
          label="Saison"
          value={value.seasonMonths}
          onChange={(seasonMonths) => onChange({ ...value, seasonMonths })}
          hint={`Richtwert ${formatSeason(preset.seasonMonths)}`}
          disabled={readOnly}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FormField
              id={`${uid}-einsaetze`}
              label="Erwartete Einsätze je Saison"
              hint={`${regionBandText(value.region)} (Richtwert)`}
            >
              <NumberInput
                value={value.expectedEinsaetze}
                onValueChange={(v) => onChange({ ...value, expectedEinsaetze: v ?? preset.einsaetzeTyp })}
                decimals={0}
                min={WD_LIMITS.expectedEinsaetze.min}
                max={WD_LIMITS.expectedEinsaetze.max}
                unit="Einsätze"
                readOnly={readOnly}
              />
            </FormField>
            {!readOnly && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Einsätze schnell wählen">
                {picks.map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    size="sm"
                    variant={value.expectedEinsaetze === p.value ? "tonal" : "secondary"}
                    aria-pressed={value.expectedEinsaetze === p.value}
                    onClick={() => onChange({ ...value, expectedEinsaetze: p.value })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <FormField
            id={`${uid}-raeumanteil`}
            label="Räumanteil"
            hint={`Richtwert ${preset.clearingSharePct} % für ${preset.label}`}
            labelAddon={
              <InfoHint label="Erklärung: Räumanteil">
                Anteil der Einsätze mit Schneeräumung; übrige Einsätze nur Streuen.
              </InfoHint>
            }
          >
            <NumberInput
              value={value.clearingSharePct}
              onValueChange={(v) => onChange({ ...value, clearingSharePct: v ?? preset.clearingSharePct })}
              decimals={0}
              min={WD_LIMITS.clearingSharePct.min}
              max={WD_LIMITS.clearingSharePct.max}
              unit="%"
              readOnly={readOnly}
            />
          </FormField>
        </div>
      </div>
    </Card>
  );
}
