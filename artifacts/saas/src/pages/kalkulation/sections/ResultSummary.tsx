import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import type { HourlyRateConfig, HourlyRateBreakdown } from "@/lib/hourly-rate-calc";
import { fmtPct } from "../constants";

export interface RechenwegStep {
  key: string;
  label: string;
  /** Zwischensumme nach diesem Schritt (€/h). */
  total: number;
  /** Veränderung gegenüber der vorherigen Zwischensumme (€/h). */
  amount: number;
}

/**
 * Rechenweg vom Basislohn bis zum Verrechnungssatz. Jede Stufe ist die
 * Differenz zweier Zwischensummen aus `calcHourlyRate` — die Zeilen
 * addieren sich damit exakt zum Ergebnis.
 */
export function buildRechenweg(config: HourlyRateConfig, b: HourlyRateBreakdown): RechenwegStep[] {
  const totals: { key: string; label: string; total: number }[] = [{ key: "basis", label: "Basislohn", total: b.baseLohn }];
  if (b.schichtzuschlag.totalZuschlag > 0) {
    totals.push({ key: "schicht", label: "Schichtzuschläge", total: b.schichtzuschlag.effektiverLohn });
  }
  totals.push(
    { key: "sv", label: `SV AG-Anteil (${fmtPct(b.svTotalRate)} %)`, total: b.lohnkostenProStunde },
    { key: "ausfall", label: `Ausfallzuschlag (× ${fmtPct(b.ausfallzuschlag)})`, total: b.lohnkostenMitAusfall },
    { key: "gemein", label: `Gemeinkosten (${fmtPct(b.overheadTotalRate)} %)`, total: b.vollkosten },
    { key: "gewinn", label: `Gewinnaufschlag (${fmtPct(config.gewinnmarge)} %)`, total: b.stundenverrechnungssatz },
  );
  return totals.map((t, i) => ({ ...t, amount: i === 0 ? t.total : t.total - totals[i - 1].total }));
}

/** Rail „Rechenweg": Schritt, Betrag, laufende Summe und der Verrechnungssatz. */
export function ResultSummary({
  config,
  breakdown,
  savedRate,
  children,
}: {
  config: HourlyRateConfig;
  breakdown: HourlyRateBreakdown;
  /** Aktuell gespeicherter Verrechnungssatz (zum Vergleich). */
  savedRate?: number;
  /** Zusatzinhalt unter dem Ergebnis (z. B. Auswirkungs-Hinweis). */
  children?: ReactNode;
}) {
  const steps = buildRechenweg(config, breakdown);
  const vollkostenIndex = steps.findIndex((s) => s.key === "gemein");

  return (
    <Card as="section" aria-labelledby="rechenweg-title">
      <CardHeader
        title={<span id="rechenweg-title">Rechenweg</span>}
        titleAs="h2"
        description="Vom Bruttolohn zum Verrechnungssatz, je Stunde"
      />
      <table className="w-full text-sm">
        <caption className="sr-only">Rechenweg des Verrechnungssatzes je Stunde</caption>
        <thead>
          <tr className="text-overline uppercase text-muted-foreground">
            <th scope="col" className="pb-2 text-left font-semibold">
              Schritt
            </th>
            <th scope="col" className="pb-2 text-right font-semibold">
              Betrag
            </th>
            <th scope="col" className="pb-2 text-right font-semibold">
              Summe
            </th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={s.key} className="border-t border-border align-top">
              <th scope="row" className="py-2 pr-2 text-left font-normal text-muted-foreground">
                {i === vollkostenIndex ? (
                  <>
                    {s.label}
                    <span className="block text-xs font-medium text-foreground">= Vollkosten</span>
                  </>
                ) : (
                  s.label
                )}
              </th>
              <td className="py-2 text-right">
                <Money value={s.amount} signed={i > 0} />
              </td>
              <td className="py-2 pl-2 text-right font-medium text-foreground">
                <Money value={s.total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t-2 border-border-strong pt-3">
        <span className="text-sm font-semibold text-foreground">Verrechnungssatz</span>
        <Money value={breakdown.stundenverrechnungssatz} size="money" tone="brand" period="hour" />
      </div>
      {savedRate !== undefined && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          Aktuell gespeichert: <Money value={savedRate} size="sm" period="hour" />
        </p>
      )}
      {children != null && <div className="mt-4 space-y-3">{children}</div>}
    </Card>
  );
}
