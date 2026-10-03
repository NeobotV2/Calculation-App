import * as React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { NumberInput } from "@/components/ui/number-input";
import { HMS_DEFAULTS, HMS_RATE_BENCHMARK } from "@/data/hausmeisterservice";
import { calcHms } from "@/lib/service-modules/hms";
import type { HmsConfig, ModuleRates } from "@/lib/service-modules/types";
import { formatNumber } from "@/lib/utils";
import { SwitchRow } from "../winterdienst/AreaSheet";
import { setOptional } from "../winterdienst/winterdienst-ui";
import { HMS_LIMITS, formatCount } from "./hms-ui";

export interface HmsSettingsCardProps {
  value: HmsConfig;
  onChange: (next: HmsConfig) => void;
  rates: ModuleRates;
  readOnly?: boolean;
  className?: string;
}

/** Karte 2 · Einstellungen: Anfahrt, Einsatztage, Materialaufschlag, Mehrstunden, eigener Satz und Vollkosten. */
export function HmsSettingsCard({ value, onChange, rates, readOnly = false, className }: HmsSettingsCardProps) {
  const uid = React.useId();
  // Automatisch ermittelte Einsatztage (ohne Override) für den Platzhalter.
  const computedVisitDays = React.useMemo(() => {
    const auto = { ...value };
    delete auto.visitDaysPerYear;
    return calcHms(auto, rates).visitDaysPerYear;
  }, [value, rates]);

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        title={<span id={`${uid}-title`}>Einstellungen</span>}
        description="Anfahrt, Einsatztage, Aufschläge und eigene Sätze für den Hausmeisterservice."
      />
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`${uid}-travel`}
            label="Anfahrt je Einsatztag"
            hint={`Richtwert ${HMS_DEFAULTS.travelMinutesPerVisitDay} Min.`}
          >
            <NumberInput
              value={value.travelMinutesPerVisitDay}
              onValueChange={(v) => onChange({ ...value, travelMinutesPerVisitDay: v ?? 0 })}
              decimals={0}
              min={HMS_LIMITS.travelMinutesPerVisitDay.min}
              max={HMS_LIMITS.travelMinutesPerVisitDay.max}
              unit="Min."
              readOnly={readOnly}
            />
          </FormField>
          <FormField
            id={`${uid}-days`}
            label="Einsatztage/Jahr"
            hint="Leer = höchster Turnus der aktiven Leistungen (ohne Kontingente)."
          >
            <NumberInput
              value={value.visitDaysPerYear}
              onValueChange={(v) => onChange(setOptional(value, "visitDaysPerYear", v))}
              decimals={0}
              min={HMS_LIMITS.visitDaysPerYear.min}
              max={HMS_LIMITS.visitDaysPerYear.max}
              unit="Tage"
              placeholder={`automatisch: ${formatCount(computedVisitDays)}`}
              readOnly={readOnly}
            />
          </FormField>
          <FormField id={`${uid}-markup`} label="Materialaufschlag" hint={`Richtwert ${HMS_DEFAULTS.materialMarkupPct} %`}>
            <NumberInput
              value={value.materialMarkupPct}
              onValueChange={(v) => onChange({ ...value, materialMarkupPct: v ?? HMS_DEFAULTS.materialMarkupPct })}
              decimals={1}
              min={HMS_LIMITS.materialMarkupPct.min}
              max={HMS_LIMITS.materialMarkupPct.max}
              unit="%"
              readOnly={readOnly}
            />
          </FormField>
        </div>

        <SwitchRow
          id={`${uid}-overage`}
          label="Mehrstunden über Kontingent berechnen"
          description="Abgerufene Stunden über dem Kontingent werden nach Aufwand zum HMS-Satz berechnet."
          checked={value.contingentOverageBilled}
          onCheckedChange={(contingentOverageBilled) => onChange({ ...value, contingentOverageBilled })}
          disabled={readOnly}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`${uid}-rate`}
            label="Eigener HMS-Satz"
            hint={`Leer = Objektsatz. Marktüblich ${HMS_RATE_BENCHMARK.low}–${HMS_RATE_BENCHMARK.high} €/h (Richtwert).`}
          >
            <NumberInput
              value={value.rateOverride}
              onValueChange={(v) => onChange(setOptional(value, "rateOverride", v, { positive: true }))}
              decimals={2}
              max={HMS_LIMITS.rateOverride.max}
              unit="€/h"
              placeholder={formatNumber(rates.rate, 2)}
              readOnly={readOnly}
            />
          </FormField>
          <FormField
            id={`${uid}-vk`}
            label="Eigene Vollkosten"
            hint="Leer = Vollkosten aus dem Verrechnungssatz (Lohngruppe, Fahrzeug, Werkzeug beachten)."
          >
            <NumberInput
              value={value.vollkostenOverride}
              onValueChange={(v) => onChange(setOptional(value, "vollkostenOverride", v, { positive: true }))}
              decimals={2}
              max={HMS_LIMITS.vollkostenOverride.max}
              unit="€/h"
              placeholder={formatNumber(rates.vollkosten, 2)}
              readOnly={readOnly}
            />
          </FormField>
        </div>
      </div>
    </Card>
  );
}
