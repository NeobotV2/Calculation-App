import { Moon } from "lucide-react";
import { cn, formatEuro } from "@/lib/utils";
import type {
  HourlyRateConfig,
  HourlyRateBreakdown,
  SchichtzuschlagConfig,
} from "@/lib/hourly-rate-calc";
import { Section } from "../Section";
import { NumberInput } from "../NumberInput";

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
      badge={hasAnySchichtzuschlag ? `+${formatEuro(breakdown.schichtzuschlag.totalZuschlag)} €/h` : "Aus"}
    >
      <p className="text-xs text-muted-foreground -mt-1">
        Zuschläge für Nacht-, Sonntags- und Feiertagsarbeit gewichtet nach Stundenanteil
      </p>

      {(["nacht", "sonntag", "feiertag"] as const).map((key) => {
        const labels = {
          nacht: { title: "Nachtarbeit", defaultZuschlag: "25 %" },
          sonntag: { title: "Sonntagsarbeit", defaultZuschlag: "50 %" },
          feiertag: { title: "Feiertagsarbeit", defaultZuschlag: "100 %" },
        };
        const item = config.schichtzuschlaege[key];
        const betragKey = key === "nacht" ? "nachtBetrag" : key === "sonntag" ? "sonntagBetrag" : "feiertagBetrag";
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {labels[key].title}
              </span>
              <button
                onClick={() => updateSchichtzuschlag(key, { enabled: !item.enabled })}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  item.enabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
                    item.enabled && "translate-x-5"
                  )}
                />
              </button>
            </div>
            {item.enabled && (
              <div className="grid grid-cols-2 gap-3 pl-1">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Zuschlagssatz
                  </label>
                  <NumberInput
                    value={item.zuschlag}
                    onChange={(v) => updateSchichtzuschlag(key, { zuschlag: v })}
                    suffix="%"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Stundenanteil
                  </label>
                  <NumberInput
                    value={item.anteil}
                    onChange={(v) => updateSchichtzuschlag(key, { anteil: v })}
                    suffix="%"
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between bg-background rounded-lg p-2 border border-border/30">
                  <span className="text-xs text-muted-foreground">
                    Gewichteter Zuschlag
                  </span>
                  <span className="text-xs font-medium text-primary">
                    +{formatEuro(breakdown.schichtzuschlag[betragKey])} €/h
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {hasAnySchichtzuschlag && (
        <>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Schichtzuschläge gesamt
            </span>
            <span className="text-sm font-bold text-primary">
              +{formatEuro(breakdown.schichtzuschlag.totalZuschlag)} €/h
            </span>
          </div>
          <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
            <span className="text-sm font-medium text-foreground">
              Effektiver Stundenlohn
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatEuro(breakdown.schichtzuschlag.effektiverLohn)} €/h
            </span>
          </div>
        </>
      )}
    </Section>
  );
}
