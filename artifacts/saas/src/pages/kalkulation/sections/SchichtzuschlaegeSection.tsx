import { Moon } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Money } from "@/components/ui/money";
import { Switch } from "@/components/ui/switch";
import type {
  HourlyRateConfig,
  HourlyRateBreakdown,
  SchichtzuschlagConfig,
} from "@/lib/hourly-rate-calc";
import { CalcResultRow, Section } from "../Section";
import { NumberInput } from "../NumberInput";

const SHIFT_KEYS = ["nacht", "sonntag", "feiertag"] as const;

const SHIFT_LABELS: Record<(typeof SHIFT_KEYS)[number], string> = {
  nacht: "Nachtarbeit",
  sonntag: "Sonntagsarbeit",
  feiertag: "Feiertagsarbeit",
};

const BETRAG_KEY = {
  nacht: "nachtBetrag",
  sonntag: "sonntagBetrag",
  feiertag: "feiertagBetrag",
} as const;

export function SchichtzuschlaegeSection({
  config,
  breakdown,
  open,
  onToggle,
  updateSchichtzuschlag,
  hasAnySchichtzuschlag,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
  open: boolean;
  onToggle: () => void;
  updateSchichtzuschlag: (
    key: "nacht" | "sonntag" | "feiertag",
    patch: Partial<SchichtzuschlagConfig>
  ) => void;
  hasAnySchichtzuschlag: boolean;
}) {
  return (
    <Section
      title="Schichtzuschläge"
      icon={Moon}
      open={open}
      onToggle={onToggle}
      badge={
        hasAnySchichtzuschlag ? (
          <Money value={breakdown.schichtzuschlag.totalZuschlag} size="sm" period="hour" signed />
        ) : (
          "Aus"
        )
      }
    >
      <p className="text-sm text-muted-foreground">
        Zuschläge für Nacht-, Sonntags- und Feiertagsarbeit, gewichtet nach Stundenanteil.
      </p>

      {SHIFT_KEYS.map((key) => {
        const item = config.schichtzuschlaege[key];
        const switchId = `rate-shift-${key}`;
        return (
          <div key={key} className="space-y-3">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <label htmlFor={switchId} className="text-sm font-medium text-foreground">
                {SHIFT_LABELS[key]}
              </label>
              <Switch
                id={switchId}
                checked={item.enabled}
                onCheckedChange={(enabled) => updateSchichtzuschlag(key, { enabled })}
              />
            </div>
            {item.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <FormField id={`rate-shift-${key}-zuschlag`} label="Zuschlagssatz">
                  <NumberInput
                    value={item.zuschlag}
                    onChange={(v) => updateSchichtzuschlag(key, { zuschlag: v })}
                    suffix="%"
                  />
                </FormField>
                <FormField id={`rate-shift-${key}-anteil`} label="Stundenanteil">
                  <NumberInput
                    value={item.anteil}
                    onChange={(v) => updateSchichtzuschlag(key, { anteil: v })}
                    suffix="%"
                  />
                </FormField>
                <div className="col-span-2">
                  <CalcResultRow label="Gewichteter Zuschlag">
                    <Money value={breakdown.schichtzuschlag[BETRAG_KEY[key]]} period="hour" signed />
                  </CalcResultRow>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {hasAnySchichtzuschlag && (
        <div className="space-y-2">
          <CalcResultRow label="Schichtzuschläge gesamt" emphasis>
            <Money value={breakdown.schichtzuschlag.totalZuschlag} period="hour" signed />
          </CalcResultRow>
          <CalcResultRow label="Effektiver Stundenlohn">
            <Money value={breakdown.schichtzuschlag.effektiverLohn} period="hour" />
          </CalcResultRow>
        </div>
      )}
    </Section>
  );
}
