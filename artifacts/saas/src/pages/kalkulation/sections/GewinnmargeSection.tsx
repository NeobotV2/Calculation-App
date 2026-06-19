import { Calculator } from "lucide-react";
import { formatEuro } from "@/lib/utils";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { Section } from "../Section";
import { NumberInput } from "../NumberInput";
import { fmtPct } from "../constants";

export function GewinnmargeSection({
  config,
  breakdown,
  open,
  onToggle,
  updateConfig,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
  open: boolean;
  onToggle: () => void;
  updateConfig: (patch: Partial<HourlyRateConfig>) => void;
}) {
  return (
    <Section
      title="Gewinnmarge"
      icon={Calculator}
      open={open}
      onToggle={onToggle}
      badge={`${fmtPct(config.gewinnmarge)} %`}
      tooltip="Der Aufschlag auf die Vollkosten, der den tatsächlichen Unternehmensgewinn ausmacht. Branchenüblich: 8–15%."
    >
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Gewinnaufschlag
        </label>
        <NumberInput
          value={config.gewinnmarge}
          onChange={(v) => updateConfig({ gewinnmarge: v })}
          suffix="%"
        />
      </div>
      <div className="flex items-center justify-between bg-background rounded-xl p-3 border border-border/30">
        <span className="text-sm font-medium text-foreground">
          Gewinn pro Stunde
        </span>
        <span className="text-sm font-bold text-primary">
          {formatEuro(breakdown.gewinnBetrag)} €
        </span>
      </div>
    </Section>
  );
}
