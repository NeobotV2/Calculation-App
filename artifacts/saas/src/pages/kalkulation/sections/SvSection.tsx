import { Shield } from "lucide-react";
import { Money } from "@/components/ui/money";
import type { HourlyRateConfig, HourlyRateBreakdown, SVRate } from "@/lib/hourly-rate-calc";
import { CalcResultRow, Section } from "../Section";
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
      <p className="text-sm text-muted-foreground">
        {config.employmentType === "minijob"
          ? "Pauschale Abgaben für Minijob"
          : "Arbeitgeberanteile Teilzeit/Vollzeit"}
      </p>
      <div className="space-y-2">
        {activeSvRates.map((item, idx) => {
          const id = `rate-sv-${config.employmentType}-${idx}`;
          return (
            <div key={`${config.employmentType}-${item.label}`} className="flex items-center gap-3">
              <label htmlFor={id} className="min-w-0 flex-1 truncate text-sm text-foreground">
                {item.label}
              </label>
              <Money
                value={(breakdown.schichtzuschlag.effektiverLohn * item.rate) / 100}
                size="sm"
                className="inline-block w-16 shrink-0 text-right text-muted-foreground"
              />
              <NumberInput
                id={id}
                value={item.rate}
                onChange={(v) => updateSvRate(idx, v)}
                suffix="%"
                inputSize="sm"
                wrapperClassName="w-28 shrink-0"
              />
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <CalcResultRow label="SV-Beitrag pro Stunde" emphasis>
          <Money value={breakdown.svBetrag} period="hour" />
        </CalcResultRow>
        <CalcResultRow label="Lohnkosten pro Stunde">
          <Money value={breakdown.lohnkostenProStunde} period="hour" />
        </CalcResultRow>
      </div>
    </Section>
  );
}
