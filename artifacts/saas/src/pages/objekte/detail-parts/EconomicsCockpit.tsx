import { useId, useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { ClipboardCheck, ShieldAlert, TrendingDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { PriceRangeBar } from "@/components/ui/price-range-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { displayComponents, displayOfferGroups } from "@/lib/display-rounding";
import type { ObjectEconomics } from "@/lib/object-economics";
import { buildOfferPositions } from "@/lib/offer-positions";
import type { NextStep } from "@/lib/offer-readiness";
import type { RiskLevel } from "@/lib/risk-score";
import { TONE_CLASSES, marginStatusLabel, marginTone, riskLabel, riskTone, strategyLabel, strategyTone } from "@/lib/status";
import { cn, formatDate, formatNumber, softHyphenate } from "@/lib/utils";
import type { Project } from "@/store/use-store";
import { NextStepCard } from "./NextStepCard";
import { useNachkalkulationSummary } from "./NachkalkulationSheet";

export interface EconomicsCockpitProps {
  project: Project;
  economics: ObjectEconomics;
  /** `getNextStep(…)`; nur in der Rail-Variante sichtbar. */
  nextStep?: NextStep | null;
  onOffer?: () => void;
  /** Öffnet das Nachkalkulations-Sheet (fehlt bei archivierten Objekten). */
  onOpenNachkalkulation?: () => void;
  /**
   * `rail` (ab lg, rechte Spalte): alles sichtbar, Was-wäre-wenn/Risiko als Akkordeon.
   * `compact` (unter lg, nach dem KpiStrip): Status + Preisband + „Details“-Akkordeon.
   */
  variant?: "rail" | "compact";
  className?: string;
}

const RISK_SEGMENTS: readonly RiskLevel[] = ["niedrig", "mittel", "hoch"];

const pct = (v: number) => `${formatNumber(v, 1)} %`;

/** Risiko-Badge mit 3-Segment-Balken (0–30 · 31–60 · > 60). */
function RiskIndicator({ score, level }: { score: number; level: RiskLevel }) {
  const tone = riskTone(level);
  const active = RISK_SEGMENTS.indexOf(level);
  return (
    <div className="flex items-center gap-2">
      <StatusBadge tone={tone} label={`Risiko ${score}/100 · ${riskLabel(level)}`} size="sm" />
      <div className="flex gap-0.5" aria-hidden="true">
        {RISK_SEGMENTS.map((s, i) => (
          <span key={s} className={cn("h-1.5 w-4 rounded-full", i <= active ? TONE_CLASSES[tone].dot : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}

function Fact({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
      {hint != null && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

function FactGrid({ economics }: { economics: ObjectEconomics }) {
  const { strategy, totals, risk } = economics;
  const suffix = totals.hasModules ? " Reinigung" : "";
  const belowMin = strategy.currentPriceMonthly < strategy.minPriceMonthly - 1e-9;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Fact label="Mindestpreis" hint={belowMin ? <span className="text-destructive">unterschritten</span> : "Vollkosten"}>
        <Money value={strategy.minPriceMonthly} tone={belowMin ? "critical" : undefined} />
      </Fact>
      <Fact label="Zielpreis" hint={`bei Zielmarge ${pct(strategy.targetMarginPct)}`}>
        <Money value={strategy.targetPriceMonthly} />
      </Fact>
      <Fact label="Ihr Preis" hint="je Monat netto">
        <Money value={strategy.currentPriceMonthly} />
      </Fact>
      <Fact label="Spielraum" hint="bis zum Mindestpreis">
        <Money value={strategy.negotiationRoomMonthly} />
      </Fact>
      <Fact label={`Zielsatz${suffix}`}>
        <Money value={strategy.targetRate} period="hour" />
      </Fact>
      <Fact label={`Break-even-Satz${suffix}`}>
        <Money value={strategy.breakEvenRate} period="hour" />
      </Fact>
      <Fact
        label="Marge (vom Umsatz)"
        hint={`Ziel ${pct(strategy.targetMarginPct)} (Gewinnaufschlag ${formatNumber(economics.strategyInput.targetMarkupPct, 0)} %)`}
      >
        <span className="tabular-nums">{pct(strategy.marginPct)}</span>
      </Fact>
      <Fact label="Personalbedarf" hint="Vollzeit-Äquivalente">
        <span className="tabular-nums">{formatNumber(risk.fte, 1)}</span>
      </Fact>
    </dl>
  );
}

function ComponentTable({ project, economics }: { project: Project; economics: ObjectEconomics }) {
  const { totals, strategy } = economics;
  // Preise als Anzeigewerte — dieselbe Rundung wie Modulkarten, Prüfschritt und Angebot.
  const shown = useMemo(
    () =>
      displayComponents(
        totals.components,
        displayOfferGroups(buildOfferPositions(project, totals, economics.effectiveRate), totals.priceMonthly),
        totals.costMonthly,
      ),
    [project, totals, economics.effectiveRate],
  );
  if (totals.components.length < 2) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-label text-muted-foreground">je Leistung</h3>
      <table className="w-full text-sm">
        <caption className="sr-only">Preis und Marge je Leistung</caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="py-1.5 pr-2 text-overline uppercase text-muted-foreground">Leistung</th>
            <th scope="col" className="py-1.5 pr-2 text-right text-overline uppercase text-muted-foreground">Preis/Mo</th>
            <th scope="col" className="py-1.5 text-right text-overline uppercase text-muted-foreground">Marge</th>
          </tr>
        </thead>
        <tbody>
          {shown.rows.map((row) => {
            const c = row.exact;
            const margin = c.priceMonthly > 0 ? ((c.priceMonthly - c.costMonthly) / c.priceMonthly) * 100 : 0;
            return (
              <tr key={c.key} className="border-b border-border last:border-0">
                {/* Weiche Trennstellen: „Unterhalts-reinigung“ bricht, die Tabelle passt in die Rail (20rem). */}
                <th scope="row" className="hyphens-manual break-words py-1.5 pr-2 text-left font-normal text-foreground">
                  {softHyphenate(c.label)}
                </th>
                <td className="whitespace-nowrap py-1.5 pr-2 text-right">
                  <Money value={row.priceMonthly} />
                </td>
                <td className="py-1.5 text-right">
                  {/* Status nie nur über Farbe: Icon (Form) + Statuswort für Screenreader. */}
                  <StatusBadge tone={marginTone(margin, strategy.targetMarginPct)} label={pct(margin)} size="sm" />
                  <span className="sr-only"> {marginStatusLabel(margin, strategy.targetMarginPct)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SensitivityList({ economics }: { economics: ObjectEconomics }) {
  const target = economics.strategy.targetMarginPct;
  return (
    <ul className="space-y-1.5">
      {economics.sensitivity.map((s) => (
        <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-sunken px-3 py-2">
          <span className="text-sm text-foreground">{s.label}</span>
          <span className="flex items-center gap-2">
            <Money value={s.contributionMonthly} size="sm" signed className="text-muted-foreground" />
            <StatusBadge
              tone={s.belowCost ? "critical" : marginTone(s.marginPct, target)}
              label={s.belowCost ? `${pct(s.marginPct)} · unter Vollkosten` : `${pct(s.marginPct)} Marge`}
              size="sm"
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function RiskFactorList({ economics }: { economics: ObjectEconomics }) {
  const factors = economics.risk.factors;
  if (factors.length === 0) {
    return <p className="text-sm text-muted-foreground">Keine Risikofaktoren erkannt.</p>;
  }
  return (
    <ul className="space-y-2">
      {factors.map((f) => (
        <li key={f.key} className="rounded-md border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{f.title}</p>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
              +{f.points}
              <span className="sr-only"> Punkte</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
          <p className="mt-1 text-xs text-foreground">Empfehlung: {f.recommendation}</p>
        </li>
      ))}
    </ul>
  );
}

function NachkalkulationRow({ project, onOpen }: { project: Project; onOpen?: () => void }) {
  const summary = useNachkalkulationSummary(project);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <ClipboardCheck aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-foreground">Nachkalkulation</span>
        <span className="text-muted-foreground">
          {summary.latestRecordedAt ? `erfasst am ${formatDate(summary.latestRecordedAt)}` : "noch nicht erfasst"}
        </span>
      </div>
      {onOpen ? (
        <Button type="button" variant="ghost" size="sm" onClick={onOpen}>
          {summary.hasAny ? "Bearbeiten" : "Erfassen"}
          <span className="sr-only"> (Nachkalkulation)</span>
        </Button>
      ) : (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/auswertung/${project.id}`}>Controlling</Link>
        </Button>
      )}
    </div>
  );
}

/**
 * Wirtschaftlichkeits-Cockpit (§8.4, ersetzt `WirtschaftlichkeitPanel`):
 * Ampel, Risiko, Preisband, Mindest-/Zielpreis, Sätze, Anteile je Leistung,
 * Was-wäre-wenn (inkl. strengem Winter) und Risikofaktoren. Beträge neutral;
 * Farbe nur über StatusBadges.
 */
export function EconomicsCockpit({
  project,
  economics,
  nextStep,
  onOffer,
  onOpenNachkalkulation,
  variant = "rail",
  className,
}: EconomicsCockpitProps) {
  const titleId = useId();
  const { strategy, risk } = economics;
  const header = (
    <div className="space-y-2">
      <h2 id={titleId} className="text-h3 text-foreground">
        Wirtschaftlichkeit
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={strategyTone(strategy.status)} label={strategyLabel(strategy.status)} />
        <RiskIndicator score={risk.score} level={risk.level} />
      </div>
    </div>
  );
  const priceBar = (
    <PriceRangeBar min={strategy.minPriceMonthly} current={strategy.currentPriceMonthly} target={strategy.targetPriceMonthly} />
  );
  const verdict = strategy.priceVerdict ? (
    <p className="text-xs text-muted-foreground">
      Markt-Orientierung: Der m²-Preis der Reinigung wirkt <span className="font-medium text-foreground">{strategy.priceVerdict}</span>{" "}
      (Richtwert, unabhängig vom Turnus).
    </p>
  ) : null;

  if (variant === "compact") {
    return (
      <Card as="section" aria-labelledby={titleId} padding="sm" className={cn("space-y-4", className)}>
        {header}
        {priceBar}
        <Accordion type="single" collapsible>
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="min-h-10 py-2 pointer-coarse:min-h-11">Details</AccordionTrigger>
            <AccordionContent className="space-y-5">
              <FactGrid economics={economics} />
              {verdict}
              <ComponentTable project={project} economics={economics} />
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <TrendingDown aria-hidden="true" className="size-4 text-muted-foreground" />
                  Was-wäre-wenn
                </h3>
                <SensitivityList economics={economics} />
              </div>
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldAlert aria-hidden="true" className="size-4 text-muted-foreground" />
                  Risikofaktoren ({risk.factors.length})
                </h3>
                <RiskFactorList economics={economics} />
              </div>
              <NachkalkulationRow project={project} onOpen={onOpenNachkalkulation} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card as="section" aria-labelledby={titleId} padding="sm" className="space-y-4">
        {header}
        {priceBar}
        <FactGrid economics={economics} />
        {verdict}
        <ComponentTable project={project} economics={economics} />
        <Accordion type="multiple">
          <AccordionItem value="sensitivity">
            <AccordionTrigger className="py-3">
              <span className="flex items-center gap-2">
                <TrendingDown aria-hidden="true" className="size-4 text-muted-foreground" />
                Was-wäre-wenn
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <SensitivityList economics={economics} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="risk" className="border-b-0">
            <AccordionTrigger className="py-3">
              <span className="flex items-center gap-2">
                <ShieldAlert aria-hidden="true" className="size-4 text-muted-foreground" />
                Risikofaktoren ({risk.factors.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <RiskFactorList economics={economics} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <NachkalkulationRow project={project} onOpen={onOpenNachkalkulation} />
      </Card>
      {nextStep && onOffer && <NextStepCard step={nextStep} onOffer={onOffer} />}
    </div>
  );
}
