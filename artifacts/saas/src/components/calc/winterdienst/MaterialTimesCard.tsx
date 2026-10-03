import * as React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { InfoHint } from "@/components/ui/info-hint";
import { NumberInput } from "@/components/ui/number-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WINTER_DEFAULTS } from "@/data/winterdienst";
import { materialParams } from "@/lib/service-modules/winterdienst";
import type { SpreadMaterial } from "@/lib/service-modules/types";
import type { WinterCardProps } from "./RegionSeasonCard";
import { MATERIAL_LABELS, MATERIAL_ORDER, WD_LIMITS, formatCount, materialHint, materialSpecText } from "./winterdienst-ui";

/** Karte 3 · Streugut & Einsatzzeiten. */
export function MaterialTimesCard({ value, onChange, readOnly = false, className }: WinterCardProps) {
  const uid = React.useId();
  const d = WINTER_DEFAULTS;

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        title={<span id={`${uid}-title`}>Streugut & Einsatzzeiten</span>}
        description="Standard-Streugut aller Flächen ohne eigenes Streugut sowie Zeiten je Einsatz und Saison."
      />
      <div className="space-y-5">
        <fieldset className="min-w-0" disabled={readOnly} aria-describedby={`${uid}-material-hint`}>
          <legend className="mb-2 text-label text-muted-foreground">Standard-Streugut</legend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={value.material}
            onValueChange={(m) => m && onChange({ ...value, material: m as SpreadMaterial })}
            disabled={readOnly}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {MATERIAL_ORDER.map((m) => {
              const params = materialParams(value, m);
              const overridden = !!value.materialOverrides?.[m];
              return (
                <ToggleGroupItem
                  key={m}
                  value={m}
                  className="h-auto min-h-11 w-full flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left pointer-coarse:h-auto"
                >
                  <span className="text-sm font-medium">{MATERIAL_LABELS[m]}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {materialSpecText(params.gramsPerM2, params.pricePerKg)} {overridden ? "(eigener Wert)" : "Richtwert"}
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          <p id={`${uid}-material-hint`} className="mt-2 text-xs text-muted-foreground">
            {materialHint(value.material)}
          </p>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${uid}-markup`} label="Materialaufschlag" hint={`Richtwert ${d.materialMarkupPct} %`}>
            <NumberInput
              value={value.materialMarkupPct}
              onValueChange={(v) => onChange({ ...value, materialMarkupPct: v ?? d.materialMarkupPct })}
              decimals={1}
              min={WD_LIMITS.materialMarkupPct.min}
              max={WD_LIMITS.materialMarkupPct.max}
              unit="%"
              readOnly={readOnly}
            />
          </FormField>
          <FormField id={`${uid}-travel`} label="Anfahrt je Einsatz" hint={`Richtwert ${d.travelMinutesPerEinsatz} Min.`}>
            <NumberInput
              value={value.travelMinutesPerEinsatz}
              onValueChange={(v) => onChange({ ...value, travelMinutesPerEinsatz: v ?? 0 })}
              decimals={0}
              min={WD_LIMITS.travelMinutesPerEinsatz.min}
              max={WD_LIMITS.travelMinutesPerEinsatz.max}
              unit="Min."
              readOnly={readOnly}
            />
          </FormField>
          <FormField
            id={`${uid}-doc`}
            label="Dokumentation je Einsatz"
            hint={`Richtwert ${d.documentationMinutesPerEinsatz} Min.`}
            labelAddon={
              <InfoHint label="Erklärung: Dokumentation je Einsatz">
                Räum- und Streuprotokoll als Nachweis der Verkehrssicherungspflicht.
              </InfoHint>
            }
          >
            <NumberInput
              value={value.documentationMinutesPerEinsatz}
              onValueChange={(v) => onChange({ ...value, documentationMinutesPerEinsatz: v ?? 0 })}
              decimals={0}
              min={WD_LIMITS.documentationMinutesPerEinsatz.min}
              max={WD_LIMITS.documentationMinutesPerEinsatz.max}
              unit="Min."
              readOnly={readOnly}
            />
          </FormField>
          <FormField
            id={`${uid}-setup`}
            label="Saisonvorbereitung"
            hint={`Richtwert ${formatCount(d.seasonSetupHours)} Std. (Begehung, Markierungsstangen, Streugutbehälter)`}
          >
            <NumberInput
              value={value.seasonSetupHours}
              onValueChange={(v) => onChange({ ...value, seasonSetupHours: v ?? 0 })}
              decimals={1}
              min={WD_LIMITS.seasonSetupHours.min}
              max={WD_LIMITS.seasonSetupHours.max}
              unit="Std."
              readOnly={readOnly}
            />
          </FormField>
        </div>
      </div>
    </Card>
  );
}
