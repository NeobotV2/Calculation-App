import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormField } from "@/components/ui/form-field";
import { InfoHint } from "@/components/ui/info-hint";
import { NumberInput } from "@/components/ui/number-input";
import { SPREAD_MATERIALS, WINTER_DEFAULTS } from "@/data/winterdienst";
import type { ModuleRates } from "@/lib/service-modules/types";
import { formatNumber } from "@/lib/utils";
import type { WinterCardProps } from "./RegionSeasonCard";
import {
  MATERIAL_LABELS,
  MATERIAL_ORDER,
  WD_LIMITS,
  formatCount,
  hasMachineArea,
  setMaterialOverride,
  setOptional,
} from "./winterdienst-ui";

export interface AdvancedCardProps extends WinterCardProps {
  /** Objektwerte als Platzhalter für eigenen Satz / eigene Vollkosten. */
  rates: ModuleRates;
  /** Anfangszustand der aufklappbaren Einstellungen (Standard: zu). */
  defaultOpen?: boolean;
}

const eur = (v: number) => formatNumber(v, 2);

/** Karte 5 · Erweitert (standardmäßig eingeklappt). Maschinensätze stehen außen, sobald eine Fläche maschinell geräumt wird. */
export function AdvancedCard({ value, onChange, rates, readOnly = false, defaultOpen = false, className }: AdvancedCardProps) {
  const uid = React.useId();
  const [open, setOpen] = React.useState(defaultOpen);
  const d = WINTER_DEFAULTS;
  const machineOutside = hasMachineArea(value);

  const machineFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        id={`${uid}-mrate`}
        label="Maschinensatz"
        hint={`Erlös je Maschinenstunde ohne Fahrer · Richtwert ${eur(d.machineRatePerHour)} €/h`}
      >
        <NumberInput
          value={value.machineRatePerHour}
          onValueChange={(v) => onChange({ ...value, machineRatePerHour: v ?? 0 })}
          decimals={2}
          min={WD_LIMITS.machineRatePerHour.min}
          max={WD_LIMITS.machineRatePerHour.max}
          unit="€/h"
          readOnly={readOnly}
        />
      </FormField>
      <FormField
        id={`${uid}-mcost`}
        label="Maschinenkosten"
        hint={`Selbstkosten je Maschinenstunde ohne Fahrer · Richtwert ${eur(d.machineCostPerHour)} €/h`}
      >
        <NumberInput
          value={value.machineCostPerHour}
          onValueChange={(v) => onChange({ ...value, machineCostPerHour: v ?? 0 })}
          decimals={2}
          min={WD_LIMITS.machineCostPerHour.min}
          max={WD_LIMITS.machineCostPerHour.max}
          unit="€/h"
          readOnly={readOnly}
        />
      </FormField>
    </div>
  );

  return (
    <Card as="section" aria-labelledby={`${uid}-title`} className={className}>
      <div className="space-y-4">
        <div>
          <h3 id={`${uid}-title`} className="text-h3 text-foreground">
            Erweitert
          </h3>
          <p className="text-sm text-muted-foreground">Kostenparameter, Risikovorsorge und eigene Sätze für den Winterdienst.</p>
        </div>

        {machineOutside && (
          <div className="space-y-2">
            <h4 className="text-label text-muted-foreground">Maschine (mindestens eine Fläche wird maschinell geräumt)</h4>
            {machineFields}
          </div>
        )}

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="group -ml-2">
              <ChevronDown aria-hidden="true" className="transition-transform group-data-[state=open]:rotate-180" />
              {open ? "Erweiterte Einstellungen ausblenden" : "Erweiterte Einstellungen anzeigen"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 pt-4">
            <fieldset className="min-w-0 space-y-3" disabled={readOnly}>
              <legend className="mb-1 text-label text-muted-foreground">Streugut: eigene Werte</legend>
              <div className="space-y-3">
                {MATERIAL_ORDER.map((m) => {
                  const base = SPREAD_MATERIALS[m];
                  const o = value.materialOverrides?.[m];
                  return (
                    <div key={m} className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                      <p className="text-sm font-medium text-foreground sm:pb-2">{MATERIAL_LABELS[m]}</p>
                      <FormField id={`${uid}-${m}-g`} label="Streumenge">
                        <NumberInput
                          value={o?.gramsPerM2}
                          onValueChange={(v) => onChange(setMaterialOverride(value, m, "gramsPerM2", v))}
                          decimals={0}
                          min={WD_LIMITS.gramsPerM2.min}
                          max={WD_LIMITS.gramsPerM2.max}
                          unit="g/m²"
                          placeholder={`Richtwert ${formatCount(base.gramsPerM2, 0)}`}
                          readOnly={readOnly}
                        />
                      </FormField>
                      <FormField id={`${uid}-${m}-p`} label="Einkaufspreis">
                        <NumberInput
                          value={o?.pricePerKg}
                          onValueChange={(v) => onChange(setMaterialOverride(value, m, "pricePerKg", v))}
                          decimals={2}
                          min={WD_LIMITS.pricePerKg.min}
                          max={WD_LIMITS.pricePerKg.max}
                          unit="€/kg"
                          placeholder={`Richtwert ${eur(base.pricePerKg)}`}
                          readOnly={readOnly}
                        />
                      </FormField>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${uid}-standbycost`}
                label="Bereitschaftskosten intern"
                hint={`Je Saisonmonat (Rufbereitschaft, Wetterdienst, Disposition) · Richtwert ${eur(d.standbyCostMonthly)} €`}
              >
                <NumberInput
                  value={value.standbyCostMonthly}
                  onValueChange={(v) => onChange({ ...value, standbyCostMonthly: v ?? 0 })}
                  decimals={2}
                  min={WD_LIMITS.standbyCostMonthly.min}
                  max={WD_LIMITS.standbyCostMonthly.max}
                  unit="€"
                  readOnly={readOnly}
                />
              </FormField>
              <FormField
                id={`${uid}-wage`}
                label="Lohnzuschlag außerhalb der Arbeitszeit"
                hint="Kostenseite; leer = wie Preisaufschlag."
              >
                <NumberInput
                  value={value.offHoursWageSurchargePct}
                  onValueChange={(v) => onChange(setOptional(value, "offHoursWageSurchargePct", v))}
                  decimals={1}
                  min={WD_LIMITS.offHoursWageSurchargePct.min}
                  max={WD_LIMITS.offHoursWageSurchargePct.max}
                  unit="%"
                  placeholder={`wie Zuschlag (${formatCount(value.offHoursSurchargePct)})`}
                  readOnly={readOnly}
                />
              </FormField>
              <FormField
                id={`${uid}-risk`}
                label="Risikovorsorge"
                hint={`Anteil des Haftungszuschlags als Kosten · Richtwert ${d.riskProvisionPct} %`}
                labelAddon={
                  <InfoHint label="Erklärung: Risikovorsorge">
                    100 % stellt den gesamten Haftungszuschlag als Vorsorge für Schadensfälle zurück (margenneutral).
                    Ein niedrigerer Wert erhöht die kalkulierte Marge.
                  </InfoHint>
                }
              >
                <NumberInput
                  value={value.riskProvisionPct}
                  onValueChange={(v) => onChange({ ...value, riskProvisionPct: v ?? d.riskProvisionPct })}
                  decimals={0}
                  min={WD_LIMITS.riskProvisionPct.min}
                  max={WD_LIMITS.riskProvisionPct.max}
                  unit="%"
                  readOnly={readOnly}
                />
              </FormField>
              <FormField
                id={`${uid}-window`}
                label="Räumfenster"
                hint={`Zeit, in der alle Flächen geräumt sein müssen (z. B. 4–7 Uhr) · Richtwert ${d.clearingWindowHours} Std.`}
              >
                <NumberInput
                  value={value.clearingWindowHours}
                  onValueChange={(v) => onChange({ ...value, clearingWindowHours: v ?? d.clearingWindowHours })}
                  decimals={1}
                  min={WD_LIMITS.clearingWindowHours.min}
                  max={WD_LIMITS.clearingWindowHours.max}
                  unit="Std."
                  readOnly={readOnly}
                />
              </FormField>
            </div>

            {!machineOutside && (
              <div className="space-y-2">
                <h4 className="text-label text-muted-foreground">Maschine</h4>
                {machineFields}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${uid}-rate`} label="Eigener Satz" hint="Nur für den Winterdienst; leer = Objektsatz.">
                <NumberInput
                  value={value.rateOverride}
                  onValueChange={(v) => onChange(setOptional(value, "rateOverride", v, { positive: true }))}
                  decimals={2}
                  max={WD_LIMITS.rateOverride.max}
                  unit="€/h"
                  placeholder={eur(rates.rate)}
                  readOnly={readOnly}
                />
              </FormField>
              <FormField id={`${uid}-vk`} label="Eigene Vollkosten" hint="Leer = Vollkosten aus dem Verrechnungssatz.">
                <NumberInput
                  value={value.vollkostenOverride}
                  onValueChange={(v) => onChange(setOptional(value, "vollkostenOverride", v, { positive: true }))}
                  decimals={2}
                  max={WD_LIMITS.vollkostenOverride.max}
                  unit="€/h"
                  placeholder={eur(rates.vollkosten)}
                  readOnly={readOnly}
                />
              </FormField>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}
