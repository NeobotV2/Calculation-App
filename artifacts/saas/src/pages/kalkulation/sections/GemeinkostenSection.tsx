import { Percent } from "lucide-react";
import { formatEuro } from "@/lib/utils";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { Section } from "../Section";
import { NumberInput } from "../NumberInput";
import { fmtPct } from "../constants";

export function GemeinkostenSection({
  config,
  breakdown,
  open,
  onToggle,
  updateOverhead,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
  open: boolean;
  onToggle: () => void;
  updateOverhead: (index: number, rate: number) => void;
}) {
  return (
    <Section
      title="Gemeinkosten & Zuschläge"
      icon={Percent}
      open={open}
      onToggle={onToggle}
      badge={`${fmtPct(breakdown.overheadTotalRate)} %`}
      tooltip="Alle Kosten, die nicht direkt der Reinigung zugeordnet werden können: Verwaltung, Fahrzeuge, Material, Versicherungen."
    >
      <div className="space-y-3">
        {config.overheads.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-foreground truncate">
              {item.label}
            </span>
            <div className="w-24">
              <NumberInput
                value={item.rate}
                onChange={(v) => updateOverhead(idx, v)}
                suffix="%"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
        <span className="text-sm font-medium text-foreground">
          Gemeinkosten pro Stunde
        </span>
        <span className="text-sm font-bold text-primary">
          {formatEuro(breakdown.overheadBetrag)} €
        </span>
      </div>
      <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
        <span className="text-sm font-medium text-foreground">
          Vollkosten / Stunde
        </span>
        <span className="text-sm font-bold text-foreground">
          {formatEuro(breakdown.vollkosten)} €
        </span>
      </div>
    </Section>
  );
}
