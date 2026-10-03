import { Hourglass } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi, KpiGroup } from "@/components/ui/kpi";
import { StatusBadge } from "@/components/ui/status-badge";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { marginTone } from "@/lib/status";
import type { HmsResult } from "@/lib/service-modules/types";
import { cn, formatNumber } from "@/lib/utils";
import { useStore } from "@/store/use-store";
import { MonthProfileBar } from "./MonthProfileBar";

export interface HmsKpisProps {
  result: HmsResult;
  /** Ziel-Marge auf den Umsatz in %; Standard: aus den Einstellungen. */
  targetMarginPct?: number;
  className?: string;
}

/** KpiGroup (4): Ø €/Monat, Jahreswert, Std./Monat (Ø), Marge. */
export function HmsKpis({ result, targetMarginPct, className }: HmsKpisProps) {
  const markup = useStore((s) => s.targetMargin);
  const target = targetMarginPct ?? markupToRevenueMargin(markup);
  return (
    <KpiGroup columns={4} className={className}>
      <Kpi
        label="Ø pro Monat"
        value={result.revenueMonthly}
        format="currency"
        period="month"
        info="Jahreswert geteilt durch 12. Saisonleistungen verteilen nur die Stunden, der Monatspreis bleibt gleich."
      />
      <Kpi label="Jahreswert" value={result.revenueAnnual} format="currency" period="year" />
      <Kpi label="Std./Monat (Ø)" value={result.laborHoursMonthly} format="hours" />
      <Kpi
        label="Marge"
        value={<StatusBadge tone={marginTone(result.marginPct, target)} label={`${formatNumber(result.marginPct, 1)} %`} />}
        hint={`Ziel ${formatNumber(target, 1)} %`}
      />
    </KpiGroup>
  );
}

/** „Kontingent: {h} Std./Monat“ (nur mit Kontingent). */
export function HmsContingentLine({ result, className }: { result: HmsResult; className?: string }) {
  if (!(result.contingentHoursMonthly > 0)) return null;
  return (
    <p className={cn("flex items-center gap-2 text-sm", className)}>
      <Hourglass aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span>
        Kontingent: <span className="tabular-nums">{formatNumber(result.contingentHoursMonthly, 1)} Std./Monat</span>
      </span>
    </p>
  );
}

export interface HmsResultCardProps {
  result: HmsResult;
  targetMarginPct?: number;
  /** `full` (Standard) mit Monatsprofil; `compact` ohne. */
  variant?: "full" | "compact";
  title?: string;
  className?: string;
}

/** Live-Ergebnis des Hausmeisterservice (alle Werte aus `calcHms`). */
export function HmsResultCard({
  result,
  targetMarginPct,
  variant = "full",
  title = "Ergebnis Hausmeisterservice",
  className,
}: HmsResultCardProps) {
  return (
    <Card as="section" aria-label={title} className={className}>
      <CardHeader title={title} description="Netto; Monatswerte als Jahresmittel." />
      <div className="space-y-4">
        <HmsKpis result={result} targetMarginPct={targetMarginPct} />
        <HmsContingentLine result={result} />
        {variant === "full" && (
          <div className="space-y-2">
            <h4 className="text-label text-muted-foreground">Arbeitsstunden je Monat</h4>
            <MonthProfileBar hours={result.monthlyLaborHours} />
          </div>
        )}
      </div>
    </Card>
  );
}
