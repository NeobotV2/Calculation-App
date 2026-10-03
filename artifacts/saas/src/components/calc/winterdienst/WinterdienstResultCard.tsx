import { Receipt, Scale, TriangleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { StatusBadge } from "@/components/ui/status-badge";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { marginTone } from "@/lib/status";
import type { WinterdienstResult } from "@/lib/service-modules/types";
import { cn, formatNumber } from "@/lib/utils";
import { useStore } from "@/store/use-store";
import { ScenarioTable } from "./ScenarioTable";
import { billingPreviewText, breakEvenText, crewNeeded } from "./winterdienst-ui";

/** Ziel-Marge (Umsatz) aus Prop oder Store-Gewinnaufschlag. */
function useTargetMargin(override?: number): number {
  const markup = useStore((s) => s.targetMargin);
  return override ?? markupToRevenueMargin(markup);
}

export interface WinterdienstKpisProps {
  result: WinterdienstResult;
  targetMarginPct?: number;
  className?: string;
}

/** KpiGroup (4): Preis je Einsatz, Saisonpreis netto, Ø pro Monat (Jahresmittel), Marge. */
export function WinterdienstKpis({ result, targetMarginPct, className }: WinterdienstKpisProps) {
  const target = useTargetMargin(targetMarginPct);
  return (
    <KpiGroup columns={4} className={className}>
      <Kpi
        label="Preis je Einsatz"
        value={result.billing.pricePerEinsatz}
        format="currency"
        period="visit"
        info="Arbeitszeit (inkl. Zeitzuschlag) und Maschine zzgl. Haftungszuschlag plus Streugut mit Aufschlag – erwarteter Wert je Einsatz."
      />
      <Kpi label="Saisonpreis netto" value={result.revenue.total} format="currency" period="season" />
      <Kpi
        label="Ø pro Monat (Jahresmittel)"
        value={result.revenueMonthly}
        format="currency"
        period="month"
        info="Saisonpreis geteilt durch 12 Monate – so geht der Winterdienst in den Monatspreis des Objekts ein."
      />
      <Kpi
        label="Marge"
        value={
          <StatusBadge
            tone={marginTone(result.marginPct, target)}
            label={`${formatNumber(result.marginPct, 1)} %`}
          />
        }
        hint={`Ziel ${formatNumber(target, 1)} %`}
      />
    </KpiGroup>
  );
}

export interface WinterdienstResultLinesProps {
  result: WinterdienstResult;
  className?: string;
}

/** Abrechnungsvorschau, Verlustschwelle und (falls nötig) Kräfte im Räumfenster. */
export function WinterdienstResultLines({ result, className }: WinterdienstResultLinesProps) {
  const crew = crewNeeded(result);
  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      <li className="flex items-start gap-2">
        <Receipt aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>
          <span className="sr-only">Abrechnung: </span>
          {billingPreviewText(result)}
        </span>
      </li>
      <li className="flex items-start gap-2">
        <Scale aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>{breakEvenText(result.billing)}</span>
      </li>
      {crew !== null && (
        <li className="flex items-start gap-2 font-medium text-warning">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Kräfte im Räumfenster: {crew}</span>
        </li>
      )}
    </ul>
  );
}

export interface WinterdienstResultCardProps {
  result: WinterdienstResult;
  targetMarginPct?: number;
  /** `full` (Standard): Kennzahlen, Texte und Szenario-Tabelle. `compact`: ohne Szenarien (Sheet-Fußbereich). */
  variant?: "full" | "compact";
  /** Überschrift der Karte. Standard: „Ergebnis Winterdienst“. */
  title?: string;
  className?: string;
}

/**
 * Live-Ergebnis des Winterdienstes. Alle Werte aus `calcWinterdienst`;
 * Szenarien: Mild / Normal / Streng mit DB (Vorzeichen) und Marge.
 */
export function WinterdienstResultCard({
  result,
  targetMarginPct,
  variant = "full",
  title = "Ergebnis Winterdienst",
  className,
}: WinterdienstResultCardProps) {
  return (
    <Card as="section" aria-label={title} className={className}>
      <CardHeader title={title} description="Netto, Erwartungswert für die kalkulierte Einsatzzahl." />
      <div className="space-y-4">
        <WinterdienstKpis result={result} targetMarginPct={targetMarginPct} />
        <WinterdienstResultLines result={result} />
        {variant === "full" && (
          <div className="space-y-2">
            <h4 className="text-label text-muted-foreground">Wetterszenarien je Saison</h4>
            <ScenarioTable result={result} targetMarginPct={targetMarginPct} />
          </div>
        )}
      </div>
    </Card>
  );
}
