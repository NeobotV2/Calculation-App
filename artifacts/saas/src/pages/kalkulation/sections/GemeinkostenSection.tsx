import { Percent } from "lucide-react";
import { Money } from "@/components/ui/money";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { CalcResultRow, Section } from "../Section";
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
      title="Gemeinkosten und Zuschläge"
      icon={Percent}
      open={open}
      onToggle={onToggle}
      badge={`${fmtPct(breakdown.overheadTotalRate)} %`}
      tooltip="Alle Kosten, die nicht direkt der Reinigung zugeordnet werden können: Verwaltung, Fahrzeuge, Material, Versicherungen."
    >
      <div className="space-y-2">
        {config.overheads.map((item, idx) => {
          const id = `rate-overhead-${item.id}`;
          return (
            <div key={item.id} className="flex items-center gap-3">
              <label htmlFor={id} className="min-w-0 flex-1 truncate text-sm text-foreground">
                {item.label}
              </label>
              <NumberInput
                id={id}
                value={item.rate}
                onChange={(v) => updateOverhead(idx, v)}
                suffix="%"
                inputSize="sm"
                wrapperClassName="w-28 shrink-0"
              />
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <CalcResultRow label="Gemeinkosten pro Stunde" emphasis>
          <Money value={breakdown.overheadBetrag} period="hour" />
        </CalcResultRow>
        <CalcResultRow label="Vollkosten pro Stunde">
          <Money value={breakdown.vollkosten} period="hour" />
        </CalcResultRow>
      </div>
    </Section>
  );
}
