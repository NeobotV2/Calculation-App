import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleIcon, type ServiceModule } from "@/components/ui/module-badge";
import { Money, formatMoney } from "@/components/ui/money";
import { PriceRangeBar } from "@/components/ui/price-range-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CalcDraft } from "@/lib/drafts";
import type { ObjectEconomics } from "@/lib/object-economics";
import type { OfferReadiness } from "@/lib/offer-readiness";
import { marginTone } from "@/lib/status";
import { cn, formatNumber } from "@/lib/utils";

export interface LiveSummaryProps {
  draft: CalcDraft;
  econ: ObjectEconomics;
  readiness: OfferReadiness;
  /** „{n} Hinweise prüfen“ → Schritt Prüfen & Abschließen. */
  onReviewHints?: () => void;
  /** Überschrift (Standard „Live-Kalkulation“); im Sheet ohne eigene Überschrift. */
  heading?: string | null;
  className?: string;
}

/** Wartezeit, bis Screenreader eine Preisänderung hören (≈ nach Abschluss der Eingabe). */
const ANNOUNCE_DELAY_MS = 900;

function ModuleRow({ module, label, children }: { module: ServiceModule; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
        <ModuleIcon module={module} size="sm" />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 text-right">{children}</span>
    </li>
  );
}

/**
 * Live-Zusammenfassung des Entwurfs (§6.3): Monatspreis, Module, Stunden,
 * Fläche, Marge, Preis-Einordnung und offene Hinweise. Änderungen werden
 * Screenreadern verzögert (nach der Eingabe) angesagt.
 */
export function LiveSummary({ draft, econ, readiness, onReviewHints, heading = "Live-Kalkulation", className }: LiveSummaryProps) {
  const { totals, strategy } = econ;
  const hasPrice = totals.priceMonthly > 0;
  const openItems = readiness.items.length;
  const headingId = React.useId();

  // Polite-Ansage erst, wenn sich der Preis eine Weile nicht geändert hat.
  const [announced, setAnnounced] = React.useState("");
  const firstRef = React.useRef(true);
  React.useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    const t = setTimeout(
      () => setAnnounced(`Monatspreis netto ${formatMoney(totals.priceMonthly)}, Marge ${formatNumber(strategy.marginPct, 1)} %`),
      ANNOUNCE_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, [totals.priceMonthly, strategy.marginPct]);

  return (
    <section aria-labelledby={heading ? headingId : undefined} aria-label={heading ? undefined : "Live-Kalkulation"} className={cn("space-y-5", className)}>
      {heading && (
        <h2 id={headingId} className="text-overline uppercase text-muted-foreground">
          {heading}
        </h2>
      )}
      <p className="sr-only" aria-live="polite">
        {announced}
      </p>

      <div className="space-y-1">
        <p className="text-label text-muted-foreground">Monatspreis netto</p>
        <Money value={totals.priceMonthly} size="money" period="month" />
        {totals.hasModules && <p className="text-xs text-muted-foreground">Ø inkl. Zusatzleistungen</p>}
      </div>

      {(draft.modules.unterhalt || totals.winterdienst || totals.hms) && (
        <ul className="divide-y divide-border border-y border-border" aria-label="Preis je Leistung">
          {draft.modules.unterhalt && (
            <ModuleRow module="unterhalt" label="Unterhaltsreinigung">
              <Money value={totals.cleaning.cost} size="kpi" />
            </ModuleRow>
          )}
          {totals.winterdienst && (
            <ModuleRow module="winterdienst" label="Winterdienst">
              <Money value={totals.winterdienst.revenueMonthly} size="kpi" />
              <span className="block text-xs text-muted-foreground">Ø / Monat</span>
              <span className="block text-xs text-muted-foreground">
                Saison <Money value={totals.winterdienst.revenue.total} size="sm" />
              </span>
            </ModuleRow>
          )}
          {totals.hms && (
            <ModuleRow module="hms" label="Hausmeisterservice">
              <Money value={totals.hms.revenueMonthly} size="kpi" />
              <span className="block text-xs text-muted-foreground">Ø / Monat</span>
            </ModuleRow>
          )}
        </ul>
      )}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-label text-muted-foreground">Stunden/Monat</dt>
          <dd className="font-medium tabular-nums text-foreground">{formatNumber(totals.laborHoursMonthly, 1)} h</dd>
        </div>
        {draft.modules.unterhalt && (
          <div>
            <dt className="text-label text-muted-foreground">Fläche</dt>
            <dd className="font-medium tabular-nums text-foreground">{formatNumber(totals.cleaning.area, 0)} m²</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="text-label text-muted-foreground">Marge (vom Umsatz)</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge
              size="sm"
              tone={hasPrice ? marginTone(strategy.marginPct, strategy.targetMarginPct) : "neutral"}
              label={`${formatNumber(hasPrice ? strategy.marginPct : 0, 1)} %`}
            />
            <span className="text-xs text-muted-foreground">Ziel {formatNumber(strategy.targetMarginPct, 1)} %</span>
          </dd>
        </div>
      </dl>

      {hasPrice && (
        <PriceRangeBar min={strategy.minPriceMonthly} current={strategy.currentPriceMonthly} target={strategy.targetPriceMonthly} />
      )}

      {openItems > 0 && onReviewHints && (
        <Button type="button" variant="link" size="sm" onClick={onReviewHints}>
          {openItems === 1 ? "1 Hinweis prüfen" : `${openItems} Hinweise prüfen`}
          <ArrowRight aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}
