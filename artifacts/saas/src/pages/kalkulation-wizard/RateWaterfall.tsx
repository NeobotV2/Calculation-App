import * as React from "react";
import { Money } from "@/components/ui/money";
import type { HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { cn, formatNumber } from "@/lib/utils";

export interface WaterfallStep {
  key: string;
  label: string;
  /** Betrag in €/h (Zuwachs bzw. Zwischensumme). */
  value: number;
  /** "add" = Zuwachs, "total" = Zwischensumme/Ergebnis. */
  kind: "add" | "total";
  /** Startwert des Balkens (€/h) – kumulierte Summe davor. */
  start: number;
}

const pct = (v: number) => `${formatNumber(v, 2)} %`;

/**
 * Stufen vom Basislohn zum Verrechnungssatz: Basislohn → Schichtzuschläge →
 * SV → Ausfall → Gemeinkosten = Vollkosten → Gewinnaufschlag = Satz.
 */
export function buildRateWaterfall(b: HourlyRateBreakdown): WaterfallStep[] {
  const steps: WaterfallStep[] = [];
  let sum = 0;
  const add = (key: string, label: string, value: number) => {
    steps.push({ key, label, value, kind: "add", start: sum });
    sum += value;
  };
  add("base", "Basislohn", b.baseLohn);
  if (b.schichtzuschlag.totalZuschlag > 0) add("shift", "Schichtzuschläge", b.schichtzuschlag.totalZuschlag);
  add("sv", `Sozialversicherung Arbeitgeber (${pct(b.svTotalRate)})`, b.svBetrag);
  add("ausfall", "Ausfallzeiten (Urlaub, Krankheit, Feiertage)", b.lohnkostenMitAusfall - b.lohnkostenProStunde);
  add("overhead", `Gemeinkosten (${pct(b.overheadTotalRate)})`, b.overheadBetrag);
  steps.push({ key: "vollkosten", label: "Vollkosten", value: b.vollkosten, kind: "total", start: 0 });
  sum = b.vollkosten;
  add("profit", `Gewinnaufschlag (${pct(b.gewinnmarge)} auf Vollkosten)`, b.gewinnBetrag);
  steps.push({ key: "rate", label: "Verrechnungssatz", value: b.stundenverrechnungssatz, kind: "total", start: 0 });
  return steps;
}

export interface RateWaterfallProps {
  breakdown: HourlyRateBreakdown;
  className?: string;
}

/** Kostenaufbau des Verrechnungssatzes als Wasserfall (Werte in €/h). */
export function RateWaterfall({ breakdown, className }: RateWaterfallProps) {
  const steps = React.useMemo(() => buildRateWaterfall(breakdown), [breakdown]);
  const max = Math.max(breakdown.stundenverrechnungssatz, ...steps.map((s) => s.start + Math.max(0, s.value)), 0.01);
  const toPct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

  return (
    <ol className={cn("space-y-2", className)} aria-label="Aufbau des Verrechnungssatzes in Euro je Stunde">
      {steps.map((s) => {
        const total = s.kind === "total";
        return (
          <li
            key={s.key}
            className={cn("space-y-1", total && "border-t border-border pt-2")}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn(total ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {total ? "= " : "+ "}
                {s.label}
              </span>
              <span className={cn("shrink-0", total ? "font-semibold text-foreground" : "text-foreground")}>
                <Money value={s.value} period="hour" />
              </span>
            </div>
            <div aria-hidden="true" className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "absolute inset-y-0 rounded-full",
                  total ? "border border-primary bg-primary-soft" : "bg-primary",
                )}
                style={{ left: toPct(s.start), width: toPct(Math.max(0, s.value)) }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
