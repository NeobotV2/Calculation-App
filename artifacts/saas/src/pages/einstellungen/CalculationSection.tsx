import { Link } from "wouter";
import { Calculator, ChevronRight } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { NumberInput } from "@/components/ui/number-input";
import { NativeSelect } from "@/components/ui/select";
import { FREQUENCY_OPTIONS } from "@/data/frequencies";
import { formatMoney } from "@/components/ui/money";
import type { FrequencyKey } from "@/store/use-store";
import type { RateImpact } from "@/pages/auswertung/portfolio";
import type { SettingsForm } from "./use-settings-form";

interface CalculationSectionProps {
  form: Pick<SettingsForm, "values" | "setField" | "errors">;
  /** Auswirkung eines geänderten Standard-Verrechnungssatzes (vor dem Speichern). */
  rateImpact?: RateImpact | null;
}

/** Kalkulations-Standards: Verrechnungssatz, Standardturnus, Link zum Rechner. */
export function CalculationSection({ form, rateImpact }: CalculationSectionProps) {
  const { values, setField, errors } = form;
  return (
    <>
      <Card as="section" aria-labelledby="settings-calc-title">
        <CardHeader
          title={<span id="settings-calc-title">Standardwerte</span>}
          description="Gelten für neue Objekte und für alle Objekte ohne eigenen Verrechnungssatz."
        />
        <div className="space-y-4">
          <FormField
            id="setting-rate"
            label="Standard-Verrechnungssatz"
            error={errors.hourlyRate}
            hint="Ermitteln Sie den Satz am besten mit dem Verrechnungssatz-Rechner."
          >
            <NumberInput
              value={values.hourlyRate}
              onValueChange={(v) => setField("hourlyRate", v)}
              unit="€/h"
              decimals={2}
              min={0}
              wrapperClassName="sm:max-w-48"
            />
          </FormField>
          {rateImpact && (
            <Callout tone="info" title="Auswirkung beim Speichern">
              Betrifft {rateImpact.affectedCount} {rateImpact.affectedCount === 1 ? "Objekt" : "Objekte"} ohne eigenen Satz
              {" · "}Monatsumsatz {formatMoney(rateImpact.deltaMonthly, { signed: true })}
            </Callout>
          )}
          <FormField id="setting-frequency" label="Standardturnus" hint="Vorauswahl für neue Räume.">
            <NativeSelect
              value={values.defaultFrequency}
              onChange={(e) => setField("defaultFrequency", e.target.value as FrequencyKey)}
              wrapperClassName="sm:max-w-72"
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </Card>

      <Card padding="none" interactive>
        <Link
          href="/verrechnungssatz"
          className="flex min-h-14 items-center gap-3 px-4 py-3 outline-none after:absolute after:inset-0 after:content-['']"
        >
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Calculator className="size-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">Verrechnungssatz-Rechner öffnen</span>
            <span className="block text-xs text-muted-foreground">
              Lohn, Zuschläge, Ausfallzeiten und Gemeinkosten kalkulieren
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </Card>
    </>
  );
}
