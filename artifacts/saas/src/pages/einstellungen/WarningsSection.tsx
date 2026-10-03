import { Card, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { WARNING_TYPES } from "@/lib/warnings";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { severityLabel, severityTone, TONE_CLASSES, TONE_ICON } from "@/lib/status";
import { formatNumber } from "@/lib/utils";
import type { SettingsForm } from "./use-settings-form";

interface WarningsSectionProps {
  /** Gewinnaufschlag-Feld (Teil des gemeinsamen Speichermodells). */
  form: Pick<SettingsForm, "values" | "setField" | "errors">;
  /** Schalter wirken sofort. */
  disabledWarnings: string[];
  setDisabledWarnings: (warnings: string[]) => void;
}

/** Ziel (Gewinnaufschlag auf Vollkosten) und Prüfregeln mit Schaltern. */
export function WarningsSection({ form, disabledWarnings, setDisabledWarnings }: WarningsSectionProps) {
  const { values, setField, errors } = form;
  const markup = values.targetMargin;
  const revenueMargin = markup !== undefined ? markupToRevenueMargin(markup) : undefined;

  return (
    <>
      <Card as="section" aria-labelledby="settings-target-title">
        <CardHeader
          title={<span id="settings-target-title">Ziel</span>}
          description="Objekte mit einer Marge unter diesem Ziel erhalten einen Hinweis."
        />
        <FormField
          id="setting-target-margin"
          label="Gewinnaufschlag auf Vollkosten (%)"
          error={errors.targetMargin}
          hint={
            <span aria-live="polite">
              {revenueMargin !== undefined
                ? `entspricht ${formatNumber(revenueMargin, 1)} % Marge vom Umsatz`
                : "Bitte geben Sie einen Wert ein."}
            </span>
          }
        >
          <NumberInput
            value={values.targetMargin}
            onValueChange={(v) => setField("targetMargin", v)}
            unit="%"
            decimals={1}
            min={0}
            max={100}
            wrapperClassName="sm:max-w-40"
          />
        </FormField>
      </Card>

      <Card as="section" aria-labelledby="settings-rules-title">
        <CardHeader
          title={<span id="settings-rules-title">Prüfregeln</span>}
          description="Deaktivierte Prüfregeln erzeugen keine Hinweise mehr. Änderungen gelten sofort."
        />
        <ul className="divide-y divide-border">
          {WARNING_TYPES.map((wt) => {
            const enabled = !disabledWarnings.includes(wt.key);
            const tone = severityTone(wt.severity);
            const Icon = TONE_ICON[tone];
            const id = `setting-warning-${wt.key}`;
            return (
              <li key={wt.key} className="flex min-h-12 items-center justify-between gap-3 py-2">
                <label htmlFor={id} className="flex min-w-0 cursor-pointer items-center gap-3">
                  <Icon aria-hidden="true" strokeWidth={2} className={`size-4 shrink-0 ${TONE_CLASSES[tone].icon}`} />
                  <span className="min-w-0">
                    <span className="block text-sm text-foreground">{wt.label}</span>
                    <span className="block text-xs text-muted-foreground">{severityLabel(wt.severity)}</span>
                  </span>
                </label>
                <Switch
                  id={id}
                  checked={enabled}
                  onCheckedChange={(next) =>
                    setDisabledWarnings(
                      next ? disabledWarnings.filter((k) => k !== wt.key) : [...disabledWarnings, wt.key],
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
