import { Card } from "@/components/ui/card";
import { Kpi, KpiGroup, formatKpiValue } from "@/components/ui/kpi";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ObjectEconomics } from "@/lib/object-economics";
import { strategyLabel, strategyTone } from "@/lib/status";
import { cn, formatNumber } from "@/lib/utils";
import { workspaceKpis } from "./workspace-tabs";

export interface KpiStripProps {
  economics: ObjectEconomics;
  className?: string;
}

/*
 * Ab md richtet sich das Layout nach der Breite der Inhaltsspalte (Container-
 * Query), nicht nach dem Viewport: Ab lg teilen sich Sidebar, Rail und Inhalt
 * den Platz, die Spalte ist bei 1024 px nur ~370 px, bei 1280 px ~620 px breit.
 * - Hero-Karte und Kennzahlen erst ab @3xl (48rem) nebeneinander, sonst untereinander.
 * - Hero-Betrag: text-display; nebeneinander bis @4xl text-money.
 * - Kennzahlen-Spalten nach verfügbarer Breite (DB mit Vorzeichen braucht ~140 px).
 */
const GROUP_COLUMNS: Record<3 | 4, string> = {
  4: "grid-cols-2 @2xl:grid-cols-4 @3xl:grid-cols-2",
  3: "grid-cols-2 [&>*:last-child]:col-span-2 @xl:grid-cols-3 @xl:[&>*:last-child]:col-span-1 @3xl:grid-cols-2 @3xl:[&>*:last-child]:col-span-2",
};

/**
 * Kennzahlen des Objekts (§8.2): Monatspreis netto als einzige Hero-Zahl,
 * darunter Jahreswert und Wirtschaftlichkeit; daneben DB, Stunden, Fläche, €/m².
 * Für reine Raum-Objekte identisch mit den bisherigen Werten (calcProjectTotals).
 * Unter md kompakt: Monatspreis + eine Metazeile (§8.5).
 */
export function KpiStrip({ economics, className }: KpiStripProps) {
  const k = workspaceKpis(economics);
  const tone = strategyTone(economics.strategy.status);
  const statusLabel = `${strategyLabel(economics.strategy.status)} · Marge ${formatNumber(k.marginPct, 1)} %`;
  const priceLabel = "Monatspreis netto";
  const subLabel = k.hasModules ? "Ø inkl. Zusatzleistungen" : undefined;

  return (
    <section aria-label="Kennzahlen" className={cn("@container space-y-3", className)}>
      {/* Phone: Hero + eine Metazeile */}
      <Card padding="sm" className="space-y-2 md:hidden">
        <div className="text-label text-muted-foreground">
          {priceLabel}
          {subLabel && <span> · {subLabel}</span>}
        </div>
        <Money value={k.priceMonthly} size="money" period="month" className="block" />
        <p className="text-sm tabular-nums text-muted-foreground">
          {formatKpiValue(k.hoursMonthly, "hours")}
          {k.area > 0 && <> · {formatKpiValue(k.area, "area")}</>}
          {" · "}Marge {formatNumber(k.marginPct, 1)} %
        </p>
        <StatusBadge tone={tone} label={statusLabel} size="sm" />
      </Card>

      {/* Ab md: Hero-Karte + KpiGroup */}
      <div className="hidden gap-4 md:grid @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card padding="md" className="flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="text-label text-muted-foreground">{priceLabel}</div>
            <Money
              value={k.priceMonthly}
              size="money"
              period="month"
              className="block text-display @3xl:text-money @4xl:text-display"
            />
            {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm text-muted-foreground">
              Jahreswert <Money value={k.priceAnnual} className="text-foreground" />
            </span>
            <StatusBadge tone={tone} label={statusLabel} />
          </div>
        </Card>

        <KpiGroup columns="custom" className={GROUP_COLUMNS[k.showPricePerSqm ? 4 : 3]}>
          <Kpi
            label="Deckungsbeitrag/Monat"
            value={k.contributionMonthly}
            format="currency"
            signed
            info="Monatspreis netto minus Vollkosten (Lohn, Lohnnebenkosten, Gemeinkosten; bei Zusatzleistungen inkl. Material, Maschinen und Bereitschaft)."
          />
          <Kpi label="Std./Monat" value={k.hoursMonthly} format="hours" hint={k.hasModules ? "inkl. Zusatzleistungen" : undefined} />
          <Kpi label="Fläche" value={k.area} format="area" />
          {k.showPricePerSqm && (
            <Kpi
              label="€/m² Reinigung"
              value={k.pricePerSqm}
              format="currency"
              info="Reinigungspreis je Monat (inkl. Rüst- und Wegezeit) geteilt durch die Reinigungsfläche."
            />
          )}
        </KpiGroup>
      </div>
    </section>
  );
}
