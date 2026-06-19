import { formatEuro } from "@/lib/utils";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { fmtPct } from "../constants";

export function ResultSummary({
  config,
  breakdown,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
}) {
  return (
    <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-4">
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">
          Ergebnis
        </p>
        <p className="text-3xl font-bold text-primary">
          {formatEuro(breakdown.stundenverrechnungssatz)} €/h
        </p>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Basislohn</span>
          <span className="text-foreground">
            {formatEuro(breakdown.baseLohn)} €
          </span>
        </div>
        {breakdown.schichtzuschlag.totalZuschlag > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              + Schichtzuschläge
            </span>
            <span className="text-foreground">
              {formatEuro(breakdown.schichtzuschlag.totalZuschlag)} €
            </span>
          </div>
        )}
        {breakdown.schichtzuschlag.totalZuschlag > 0 && (
          <div className="flex justify-between font-medium border-t border-border/30 pt-1.5">
            <span className="text-foreground">= Effektiver Lohn</span>
            <span className="text-foreground">
              {formatEuro(breakdown.schichtzuschlag.effektiverLohn)} €
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            + SV AG-Anteil ({fmtPct(breakdown.svTotalRate)} %)
          </span>
          <span className="text-foreground">
            {formatEuro(breakdown.svBetrag)} €
          </span>
        </div>
        <div className="flex justify-between font-medium border-t border-border/30 pt-1.5">
          <span className="text-foreground">= Lohnkosten</span>
          <span className="text-foreground">
            {formatEuro(breakdown.lohnkostenProStunde)} €
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            × Ausfallzuschlag ({fmtPct(breakdown.ausfallzuschlag)})
          </span>
          <span className="text-foreground">
            {formatEuro(breakdown.lohnkostenMitAusfall)} €
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            + Gemeinkosten ({fmtPct(breakdown.overheadTotalRate)} %)
          </span>
          <span className="text-foreground">
            {formatEuro(breakdown.overheadBetrag)} €
          </span>
        </div>
        <div className="flex justify-between font-medium border-t border-border/30 pt-1.5">
          <span className="text-foreground">= Vollkosten</span>
          <span className="text-foreground">
            {formatEuro(breakdown.vollkosten)} €
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            + Gewinn ({fmtPct(config.gewinnmarge)} %)
          </span>
          <span className="text-foreground">
            {formatEuro(breakdown.gewinnBetrag)} €
          </span>
        </div>
        <div className="flex justify-between font-bold text-primary border-t border-primary/30 pt-1.5">
          <span>= Verrechnungssatz</span>
          <span>{formatEuro(breakdown.stundenverrechnungssatz)} €/h</span>
        </div>
      </div>
    </div>
  );
}
