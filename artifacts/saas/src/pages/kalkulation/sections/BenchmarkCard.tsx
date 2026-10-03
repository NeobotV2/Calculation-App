import { Card, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import type { Tone } from "@/lib/status";
import { fmtPct } from "../constants";

export function BenchmarkCard({
  config,
  breakdown,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
}) {
  const rows: { key: string; tone: Tone; label: string; value: number; note: string }[] = [
    {
      key: "kritisch",
      tone: "critical",
      label: "Kritisch",
      value: breakdown.vollkosten * 0.9,
      note: "Unter den Selbstkosten – Verlustzone",
    },
    {
      key: "mindest",
      tone: "warning",
      label: "Mindestsatz",
      value: breakdown.vollkosten,
      note: "Vollkostendeckung, 0 % Gewinn",
    },
    {
      key: "empfohlen",
      tone: "success",
      label: "Empfohlen",
      value: breakdown.stundenverrechnungssatz,
      note: `Ihr kalkulierter Satz inkl. ${fmtPct(config.gewinnmarge)} % Gewinnaufschlag`,
    },
  ];

  return (
    <Card as="section" aria-labelledby="benchmark-title">
      <CardHeader title={<span id="benchmark-title">Einordnung Ihres Satzes</span>} titleAs="h2" />
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 space-y-1">
              <StatusBadge tone={r.tone} label={r.label} size="sm" />
              <p className="text-xs text-muted-foreground">{r.note}</p>
            </div>
            <Money value={r.value} period="hour" className="font-semibold" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
