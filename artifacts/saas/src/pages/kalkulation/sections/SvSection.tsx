import { Shield } from "lucide-react";
import { formatEuro } from "@/lib/utils";
import type { HourlyRateConfig, HourlyRateBreakdown, SVRate } from "@/lib/hourly-rate-calc";
import { Section } from "../Section";
import { NumberInput } from "../NumberInput";
import { fmtPct } from "../constants";

export function SvSection({
  config,
  breakdown,
  open,
  onToggle,
  activeSvRates,
  svTotalRate,
  updateSvRate,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
  open: boolean;
  onToggle: () => void;
  activeSvRates: SVRate[];
  svTotalRate: number;
  updateSvRate: (index: number, rate: number) => void;
}) {
  return (
    <Section
      title="Sozialversicherung AG-Anteil"
      icon={Shield}
      open={open}
      onToggle={onToggle}
      badge={`${fmtPct(svTotalRate)} %`}
      tooltip="Gesetzliche Abgaben des Arbeitgebers: Kranken-, Renten-, Pflege- und Unfallversicherung. Bei Minijobs gelten Pauschalsätze."
    >
      <p className="text-xs text-muted-foreground -mt-1">
        {config.employmentType === "minijob"
          ? "Pauschale Abgaben für Minijob"
          : "Arbeitgeberanteile Teilzeit/Vollzeit"}
      </p>
      <div className="space-y-3">
        {activeSvRates.map((item, idx) => (
          <div key={`${config.employmentType}-${item.label}`} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-foreground truncate">
              {item.label}
            </span>
            <span className="text-xs text-muted-foreground w-16 text-right tabular-nums shrink-0">
              {formatEuro(config.baseLohn * item.rate / 100)} €
            </span>
            <div className="w-24">
              <NumberInput
                value={item.rate}
                onChange={(v) => updateSvRate(idx, v)}
                suffix="%"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
        <span className="text-sm font-medium text-foreground">
          SV-Beitrag pro Stunde
        </span>
        <span className="text-sm font-bold text-primary">
          {formatEuro(breakdown.svBetrag)} €
        </span>
      </div>
      <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
        <span className="text-sm font-medium text-foreground">
          Lohnkosten / Stunde
        </span>
        <span className="text-sm font-bold text-foreground">
          {formatEuro(breakdown.lohnkostenProStunde)} €
        </span>
      </div>
    </Section>
  );
}
