import { Euro } from "lucide-react";
import { cn, formatEuro } from "@/lib/utils";
import type { HourlyRateConfig, EmploymentType } from "@/lib/hourly-rate-calc";
import { Section } from "../Section";
import { NumberInput } from "../NumberInput";
import { EMPLOYMENT_LABELS } from "../constants";

export function BasislohnSection({
  config,
  open,
  onToggle,
  updateConfig,
}: {
  config: HourlyRateConfig;
  open: boolean;
  onToggle: () => void;
  updateConfig: (patch: Partial<HourlyRateConfig>) => void;
}) {
  return (
    <Section
      title="Basislohn"
      icon={Euro}
      open={open}
      onToggle={onToggle}
      badge={`${formatEuro(config.baseLohn)} €/h`}
      tooltip="Der tarifliche oder vereinbarte Bruttostundenlohn Ihrer Reinigungskräfte. Grundlage für alle weiteren Berechnungen."
    >
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Beschäftigungsart
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["minijob", "teilzeit", "vollzeit"] as EmploymentType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => updateConfig({ employmentType: type })}
                className={cn(
                  "h-10 rounded-xl text-sm font-medium transition-all border",
                  config.employmentType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                {EMPLOYMENT_LABELS[type]}
              </button>
            )
          )}
        </div>
        {config.employmentType === "minijob" && (
          <p className="text-xs text-muted-foreground mt-2">
            Minijob-Grenze 2026: max. 603 €/Monat
          </p>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Brutto-Stundenlohn (Tariflohn LG1 ab 01/2026)
        </label>
        <NumberInput
          value={config.baseLohn}
          onChange={(v) => updateConfig({ baseLohn: v })}
          suffix="€/h"
        />
      </div>
    </Section>
  );
}
