import { formatEuro } from "@/lib/utils";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { fmtPct } from "../constants";

export function BenchmarkCard({
  config,
  breakdown,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Branchen-Benchmark
      </h4>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span className="text-sm text-foreground">Kritisch</span>
          </div>
          <span className="text-sm font-semibold text-destructive">
            {formatEuro(breakdown.vollkosten * 0.9)} €/h
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground ml-[18px] -mt-1">
          Unter den Selbstkosten — Verlustzone
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span className="text-sm text-foreground">Mindest</span>
          </div>
          <span className="text-sm font-semibold text-warning">
            {formatEuro(breakdown.vollkosten)} €/h
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground ml-[18px] -mt-1">
          Vollkostendeckung, 0% Gewinn
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-sm text-foreground">Empfohlen</span>
          </div>
          <span className="text-sm font-semibold text-success">
            {formatEuro(breakdown.stundenverrechnungssatz)} €/h
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground ml-[18px] -mt-1">
          Ihr kalkulierter Satz inkl. {fmtPct(config.gewinnmarge)}% Gewinn
        </p>
      </div>
    </div>
  );
}
