import { Calculator } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Money } from "@/components/ui/money";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { CalcResultRow, Section } from "../Section";
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
      title="Gewinnaufschlag"
      icon={Calculator}
      open={open}
      onToggle={onToggle}
      badge={`${fmtPct(config.gewinnmarge)} %`}
      tooltip="Der Aufschlag auf die Vollkosten, der den tatsächlichen Unternehmensgewinn ausmacht. Branchenüblich: 8–15 %."
    >
      <FormField
        id="rate-gewinn"
        label="Gewinnaufschlag auf Vollkosten (%)"
        hint={`entspricht ${fmtPct(markupToRevenueMargin(config.gewinnmarge))} % Marge vom Umsatz`}
      >
        <NumberInput value={config.gewinnmarge} onChange={(v) => updateConfig({ gewinnmarge: v })} suffix="%" />
      </FormField>
      <CalcResultRow label="Gewinn pro Stunde" emphasis>
        <Money value={breakdown.gewinnBetrag} period="hour" />
      </CalcResultRow>
    </Section>
  );
}
