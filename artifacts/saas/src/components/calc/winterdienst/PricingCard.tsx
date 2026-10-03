import * as React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { InfoHint } from "@/components/ui/info-hint";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WINTER_DEFAULTS } from "@/data/winterdienst";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import type { ModuleRates, WinterBillingMode } from "@/lib/service-modules/types";
import { cn } from "@/lib/utils";
import type { WinterCardProps } from "./RegionSeasonCard";
import {
  BILLING_MODE_ORDER,
  WD_LIMITS,
  billingModeLabel,
  billingPreviewText,
  isPauschaleMode,
  setOptional,
} from "./winterdienst-ui";

export interface PricingCardProps extends WinterCardProps {
  rates: ModuleRates;
}

const BILLING_DESCRIPTION: Record<WinterBillingMode, string> = {
  pauschale_12: "Gleichmäßige Monatsrate über das ganze Jahr – planbar für Kunde und Betrieb.",
  pauschale_saison: "Raten nur in den Saisonmonaten.",
  pro_einsatz: "Fester Betrag je Saisonmonat plus Preis je tatsächlichem Einsatz – kein Wetterrisiko.",
};

/** Karte 4 · Preisgestaltung: Abrechnungsmodus, Deckelung, Bereitschaft, Haftung, Zeitzuschläge. */
export function PricingCard({ value, onChange, rates, readOnly = false, className }: PricingCardProps) {
  const uid = React.useId();
  const d = WINTER_DEFAULTS;
  const pauschale = isPauschaleMode(value.billingMode);

  // Vorschau je Modus (gleiche Config, nur anderer Abrechnungsmodus).
  const previews = React.useMemo(
    () =>
      Object.fromEntries(
        BILLING_MODE_ORDER.map((mode) => [mode, billingPreviewText(calcWinterdienst({ ...value, billingMode: mode }, rates))]),
      ) as Record<WinterBillingMode, string>,
    [value, rates],
  );

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <CardHeader
        title={<span id={`${uid}-title`}>Preisgestaltung</span>}
        description="Abrechnung gegenüber dem Kunden und Zuschläge für Bereitschaft, Haftung und Einsatzzeiten."
      />
      <div className="space-y-5">
        <fieldset className="min-w-0" disabled={readOnly}>
          <legend className="mb-2 text-label text-muted-foreground">Abrechnung</legend>
          <RadioGroup
            value={value.billingMode}
            onValueChange={(m) => onChange({ ...value, billingMode: m as WinterBillingMode })}
            disabled={readOnly}
            className="gap-2"
          >
            {BILLING_MODE_ORDER.map((mode) => {
              const id = `${uid}-billing-${mode}`;
              const checked = value.billingMode === mode;
              return (
                <label
                  key={mode}
                  htmlFor={id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    checked ? "border-primary ring-1 ring-primary" : "border-border",
                  )}
                >
                  <RadioGroupItem
                    id={id}
                    value={mode}
                    className="mt-0.5"
                    aria-labelledby={`${id}-title`}
                    aria-describedby={`${id}-desc`}
                  />
                  <span className="min-w-0 space-y-0.5">
                    <span id={`${id}-title`} className="block text-sm font-medium text-foreground">
                      {billingModeLabel(mode, value.seasonMonths)}
                    </span>
                    <span id={`${id}-desc`} className="block text-xs text-muted-foreground">
                      {BILLING_DESCRIPTION[mode]} <span className="tabular-nums text-foreground">{previews[mode]}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {pauschale && (
            <FormField
              id={`${uid}-cap`}
              label="Deckelung (optional)"
              hint="Pauschale umfasst bis zu dieser Zahl an Einsätzen; jeder weitere wird je Einsatz berechnet. Leer = keine Deckelung."
            >
              <NumberInput
                value={value.capEinsaetze}
                onValueChange={(v) => onChange(setOptional(value, "capEinsaetze", v))}
                decimals={0}
                min={WD_LIMITS.capEinsaetze.min}
                max={WD_LIMITS.capEinsaetze.max}
                unit="Einsätze"
                placeholder="keine"
                readOnly={readOnly}
              />
            </FormField>
          )}
          <FormField
            id={`${uid}-standby`}
            label="Bereitschaftspauschale"
            hint={`Je Saisonmonat · Richtwert ${d.standbyFeeMonthly} €`}
          >
            <NumberInput
              value={value.standbyFeeMonthly}
              onValueChange={(v) => onChange({ ...value, standbyFeeMonthly: v ?? 0 })}
              decimals={2}
              min={WD_LIMITS.standbyFeeMonthly.min}
              max={WD_LIMITS.standbyFeeMonthly.max}
              unit="€"
              readOnly={readOnly}
            />
          </FormField>
          <FormField
            id={`${uid}-liability`}
            label="Haftungs-/Risikozuschlag"
            hint={`Richtwert ${d.liabilitySurchargePct} %`}
            labelAddon={
              <InfoHint label="Erklärung: Haftungs- und Risikozuschlag">
                Zuschlag auf den Leistungserlös für die übernommene Verkehrssicherungspflicht. Unter „Erweitert“ legen
                Sie fest, welcher Anteil als Risikovorsorge in die Kosten eingeht.
              </InfoHint>
            }
          >
            <NumberInput
              value={value.liabilitySurchargePct}
              onValueChange={(v) => onChange({ ...value, liabilitySurchargePct: v ?? 0 })}
              decimals={1}
              min={WD_LIMITS.liabilitySurchargePct.min}
              max={WD_LIMITS.liabilitySurchargePct.max}
              unit="%"
              readOnly={readOnly}
            />
          </FormField>
        </div>

        <fieldset className="min-w-0 space-y-3" disabled={readOnly} aria-describedby={`${uid}-offhours-hint`}>
          <legend className="text-label text-muted-foreground">Einsätze außerhalb der Arbeitszeit</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${uid}-offshare`} label="Anteil der Einsatzstunden" hint={`Richtwert ${d.offHoursSharePct} %`}>
              <NumberInput
                value={value.offHoursSharePct}
                onValueChange={(v) => onChange({ ...value, offHoursSharePct: v ?? 0 })}
                decimals={0}
                min={WD_LIMITS.offHoursSharePct.min}
                max={WD_LIMITS.offHoursSharePct.max}
                unit="%"
                readOnly={readOnly}
              />
            </FormField>
            <FormField id={`${uid}-offsurcharge`} label="Zuschlag auf diese Stunden" hint={`Richtwert ${d.offHoursSurchargePct} %`}>
              <NumberInput
                value={value.offHoursSurchargePct}
                onValueChange={(v) => onChange({ ...value, offHoursSurchargePct: v ?? 0 })}
                decimals={1}
                min={WD_LIMITS.offHoursSurchargePct.min}
                max={WD_LIMITS.offHoursSurchargePct.max}
                unit="%"
                readOnly={readOnly}
              />
            </FormField>
          </div>
          <p id={`${uid}-offhours-hint`} className="text-xs text-muted-foreground">
            Falls Nacht-/Sonntagszuschläge bereits im Verrechnungssatz aktiv sind, hier 0 % ansetzen.
          </p>
        </fieldset>
      </div>
    </Card>
  );
}
