import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { calcHourlyRate } from "@/lib/hourly-rate-calc";
import { cn } from "@/lib/utils";
import { fmtEuro } from "../constants";

type Breakdown = ReturnType<typeof calcHourlyRate>;

interface Step6RateProps {
  breakdown: Breakdown;
  rateInput: string;
  setRateInput: (v: string) => void;
  hourlyRate: number;
  effectiveRate: number;
  marginPercent: number;
  targetMargin: number;
}

export function Step6Rate({
  breakdown,
  rateInput,
  setRateInput,
  hourlyRate,
  effectiveRate,
  marginPercent,
  targetMargin,
}: Step6RateProps) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Verrechnungssatz & Marge</h3>
        <p className="text-sm text-muted-foreground">
          Nachvollziehbarer Aufbau vom Basislohn zum Verrechnungssatz.
        </p>
      </div>

      <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Kostenaufbau (Wasserfall)
        </h4>
        <div className="space-y-2">
          {[
            { label: "Basislohn", value: breakdown.baseLohn, color: "bg-info" },
            ...(breakdown.schichtzuschlag.totalZuschlag > 0
              ? [{ label: "+ Schichtzuschläge", value: breakdown.schichtzuschlag.totalZuschlag, color: "bg-primary" }]
              : []),
            { label: `+ SV AG-Anteil (${fmtEuro(breakdown.svTotalRate)}%)`, value: breakdown.svBetrag, color: "bg-info" },
            { label: `× Ausfallzuschlag`, value: breakdown.lohnkostenMitAusfall - breakdown.lohnkostenProStunde, color: "bg-warning" },
            { label: `+ Gemeinkosten (${fmtEuro(breakdown.overheadTotalRate)}%)`, value: breakdown.overheadBetrag, color: "bg-warning" },
            { label: `+ Gewinn (${fmtEuro(breakdown.gewinnmarge)}%)`, value: breakdown.gewinnBetrag, color: "bg-success" },
          ].map((item, idx) => {
            const maxWidth = breakdown.stundenverrechnungssatz;
            const widthPct = maxWidth > 0 ? Math.min((item.value / maxWidth) * 100, 100) : 0;
            return (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{fmtEuro(item.value)} €</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", item.color)}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex justify-between text-sm font-bold text-primary border-t border-border/20 pt-3 mt-3">
            <span>= Empfohlener Verrechnungssatz</span>
            <span>{fmtEuro(breakdown.stundenverrechnungssatz)} €/h</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Objektspezifischer Verrechnungssatz
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          Optional: Abweichenden Stundensatz für dieses Objekt festlegen.
        </p>
        <Input
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          inputMode="decimal"
          placeholder={`Standard: ${hourlyRate.toString().replace(".", ",")} €/h`}
          className="bg-background h-12 text-lg font-semibold"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leer = globaler Standard ({hourlyRate.toString().replace(".", ",")} €/h)
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Empfohlener Satz</span>
            <span className={cn("font-semibold", effectiveRate >= breakdown.stundenverrechnungssatz ? "text-success" : "text-destructive")}>
              {fmtEuro(breakdown.stundenverrechnungssatz)} €/h
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gewählter Satz</span>
            <span className="font-bold text-foreground">{fmtEuro(effectiveRate)} €/h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Vollkosten</span>
            <span className="font-medium text-foreground">{fmtEuro(breakdown.vollkosten)} €/h</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border/20 pt-2">
            <span className="text-muted-foreground">Marge</span>
            <span className={cn("font-bold", marginPercent >= targetMargin ? "text-success" : marginPercent >= 0 ? "text-warning" : "text-destructive")}>
              {fmtEuro(marginPercent)} %
            </span>
          </div>
        </div>
      </div>

      {effectiveRate < breakdown.vollkosten && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Unter Vollkosten!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Der gewählte Verrechnungssatz liegt unter den Vollkosten. Dieses Objekt wird mit Verlust kalkuliert.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
