import * as React from "react";
import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import type { Project } from "@/store/use-store";
import type { ObjectEconomics } from "@/lib/object-economics";
import { buildOfferPositions, type OfferPosition } from "@/lib/offer-positions";
import { allocateRounded, displayComponents, displayOfferGroups, sumDisplay, type DisplayComponentRow } from "@/lib/display-rounding";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import { monthShort } from "@/lib/service-modules/util";
import type { MonthIndex, WinterBillingMode, WinterdienstConfig, WinterdienstResult, HmsConfig, HmsResult } from "@/lib/service-modules/types";
import { WINTER_REGION_DISCLAIMER, WINTER_REGION_PRESETS } from "@/data/winterdienst";
import { marginTone, riskLabel, strategyLabel, strategyTone, TONE_CLASSES } from "@/lib/status";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import {
  DOC_FOOT_ROW,
  DOC_HEAD_ROW,
  DOC_NUM,
  DOC_ROW,
  DOC_TABLE,
  DOC_TD,
  DOC_TH,
  DocHeading,
  PaperDocument,
  PaperSheet,
  type DocHeadingTag,
} from "./OfferDocument";
import { formatOfferDate, formatOfferQuantity, seasonText, WINTER_BILLING_MODE_LABELS } from "./offer-meta";

/* ─────────────────────────────────────────────────────────────────────────
   Interne Kalkulation: Entscheidungs- und Controlling-Dokument mit Kosten,
   Marge und Risiko. NIEMALS an Kunden weitergeben — dafür gibt es das
   Angebot unter /print/:id. Strategie und Risiko kommen 1:1 aus
   `economics` (inkl. Module und Nachkalkulations-Ist-Stunden), also
   identisch mit dem Arbeitsbereich.
   ───────────────────────────────────────────────────────────────────────── */

export interface InternalCalcDocumentProps {
  project: Project;
  economics: ObjectEconomics;
  /** „Erstellt von“ (Firmenname aus den Einstellungen). */
  companyName?: string;
  /** Überschriften-Ebene des Titels (Standard h1). */
  titleAs?: "h1" | "h2";
  now?: Date;
  className?: string;
}

const BILLING_MODES: readonly WinterBillingMode[] = ["pauschale_12", "pauschale_saison", "pro_einsatz"];
const SCENARIO_LABELS = { mild: "Mild", normal: "Normal", streng: "Streng" } as const;

const pct = (v: number) => (v < 0 ? `−${formatNumber(-v, 1)} %` : `${formatNumber(v, 1)} %`);
const hours = (v: number) => formatNumber(v, 1);
const signedCurrency = (v: number) => (v < 0 ? `−${formatCurrency(-v)}` : formatCurrency(v));

/** Zweispaltige Schlüssel/Wert-Tabelle. */
function KeyValueTable({
  caption,
  rows,
  className,
}: {
  caption: string;
  rows: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; tone?: string; key?: string }[];
  className?: string;
}) {
  return (
    <table className={cn(DOC_TABLE, className)}>
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.key ?? i} className={cn(DOC_ROW, r.strong && "font-semibold")}>
            <th scope="row" className={cn(DOC_TD, "w-[55%] text-left font-normal", r.strong && "font-semibold")}>{r.label}</th>
            <td className={cn(DOC_TD, DOC_NUM, r.tone)}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-[0.5em] text-[0.8em] text-muted-foreground", className)}>{children}</p>;
}

function DocSection({
  id,
  title,
  as,
  children,
}: {
  id: string;
  title: string;
  as: DocHeadingTag;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-[1.8em]">
      <DocHeading as={as} id={id}>{title}</DocHeading>
      {children}
    </section>
  );
}

function lossThresholdText(r: WinterdienstResult): string {
  const b = r.billing;
  if (b.lossBelowEinsaetze !== null && b.lossBelowEinsaetze > 0) {
    return `Verlust unter ${formatNumber(b.lossBelowEinsaetze, 1)} Einsätzen`;
  }
  if (b.lossAboveEinsaetze !== null) {
    return b.lossAboveEinsaetze <= 0 ? "Verlust bei jeder Einsatzzahl" : `Verlust ab ${formatNumber(b.lossAboveEinsaetze, 1)} Einsätzen`;
  }
  return "keine Verlustschwelle";
}

/**
 * Erlös-/Kostenaufriss je Saison. Anzeige-Rundung: Zeilen auf Cent mit
 * Restverteilung, so dass Σ Zeilen = „Summe Saison“ und DB = Erlös − Kosten.
 */
function SeasonBreakdownTable({ wd }: { wd: WinterdienstResult }) {
  const rows = [
    { label: "Lohn (inkl. Zeitzuschlag, Vorbereitung)", rev: wd.revenue.labor, cost: wd.cost.labor },
    { label: "Maschine (ohne Fahrer)", rev: wd.revenue.machine, cost: wd.cost.machine },
    { label: "Haftungszuschlag", rev: wd.revenue.liability, cost: null },
    { label: "Streugut", rev: wd.revenue.material, cost: wd.cost.material },
    { label: "Bereitschaft", rev: wd.revenue.standby, cost: wd.cost.standby },
    { label: "Risikovorsorge", rev: null, cost: wd.cost.riskProvision },
  ] as const;
  const revShown = allocateRounded(rows.map((r) => r.rev ?? 0), wd.revenue.total);
  const costShown = allocateRounded(rows.map((r) => r.cost ?? 0), wd.cost.total);
  const revTotal = sumDisplay(revShown);
  const costTotal = sumDisplay(costShown);
  return (
    <table className={DOC_TABLE}>
      <caption className="sr-only">Winterdienst Erlös- und Kostenaufriss je Saison</caption>
      <thead>
        <tr className={DOC_HEAD_ROW}>
          <th scope="col" className={DOC_TH}>Bestandteil</th>
          <th scope="col" className={cn(DOC_TH, "text-right")}>Erlös €</th>
          <th scope="col" className={cn(DOC_TH, "text-right")}>Kosten €</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label} className={DOC_ROW}>
            <th scope="row" className={cn(DOC_TD, "text-left font-normal")}>{r.label}</th>
            <td className={cn(DOC_TD, DOC_NUM)}>{r.rev === null ? "–" : formatCurrency(revShown[i])}</td>
            <td className={cn(DOC_TD, DOC_NUM)}>{r.cost === null ? "–" : formatCurrency(costShown[i])}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className={DOC_FOOT_ROW}>
          <th scope="row" className={cn(DOC_TD, "text-left")}>Summe Saison</th>
          <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(revTotal)}</td>
          <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(costTotal)}</td>
        </tr>
        <tr className="font-semibold">
          <th scope="row" className={cn(DOC_TD, "text-left")}>Deckungsbeitrag Saison</th>
          <td className={cn(DOC_TD, DOC_NUM)} colSpan={2}>{signedCurrency(sumDisplay([revTotal, -costTotal]))}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function WinterdienstBlock({
  cfg,
  wd,
  shown,
  economics,
  headingTag,
  idPrefix,
}: {
  cfg: WinterdienstConfig;
  wd: WinterdienstResult;
  /** Angezeigte Komponentenzeile, damit Kennzahlen und Komponenten denselben Betrag zeigen. */
  shown: DisplayComponentRow | undefined;
  economics: ObjectEconomics;
  headingTag: DocHeadingTag;
  idPrefix: string;
}) {
  const sub: DocHeadingTag = headingTag === "h2" ? "h3" : "h4";
  const matrix = useMemo(
    () => BILLING_MODES.map((mode) => ({
      mode,
      result: mode === cfg.billingMode ? wd : calcWinterdienst({ ...cfg, billingMode: mode }, economics.rates),
    })),
    [cfg, wd, economics.rates],
  );
  const pe = wd.perEinsatz;
  const region = WINTER_REGION_PRESETS[cfg.region]?.label ?? cfg.region;
  const crew = Math.max(1, Math.ceil(wd.crewAtPeak - 1e-9));
  const marginClass = TONE_CLASSES[marginTone(wd.marginPct, economics.strategy.targetMarginPct)].text;

  return (
    <DocSection id={`${idPrefix}-wd`} title="Winterdienst" as={headingTag}>
      <p className="mb-[0.8em] text-muted-foreground">
        {region} · Saison {seasonText(wd.seasonMonths)} · {formatNumber(wd.einsaetze, 0)} Einsätze erwartet
        ({formatNumber(cfg.clearingSharePct, 0)} % mit Räumen) · {WINTER_BILLING_MODE_LABELS[cfg.billingMode]}
        {wd.billing.capEinsaetze !== null ? ` · Deckelung ${formatNumber(wd.billing.capEinsaetze, 0)} Einsätze` : ""}
        {wd.rate !== economics.effectiveRate ? ` · eigener Satz ${formatCurrency(wd.rate)}/h` : ""}
      </p>

      <div className="grid grid-cols-2 gap-[2em]">
        <div>
          <DocHeading as={sub} className="text-[1em]">Je Einsatz</DocHeading>
          <KeyValueTable
            caption="Winterdienst je Einsatz"
            rows={[
              { label: "Arbeitsstunden (Erwartungswert)", value: `${hours(pe.laborHours)} h` },
              { label: "davon Maschinenstunden", value: `${hours(pe.machineHours)} h` },
              { label: "Streugut", value: `${formatNumber(pe.materialKg, 1)} kg` },
              { label: "Streugut-Einkauf", value: formatCurrency(pe.materialCost) },
              { label: "Preis je Einsatz (U_E)", value: formatCurrency(pe.revenue), strong: true },
              { label: "Kosten je Einsatz (K_E)", value: formatCurrency(pe.cost), strong: true },
              { label: "Deckungsbeitrag je Einsatz", value: signedCurrency(pe.revenue - pe.cost) },
            ]}
          />
        </div>
        <div>
          <DocHeading as={sub} className="text-[1em]">Saison</DocHeading>
          <KeyValueTable
            caption="Winterdienst Saisonwerte"
            rows={[
              { label: "Fixer Erlös (Bereitschaft, Vorbereitung)", value: formatCurrency(wd.fixedRevenueSeason) },
              { label: "Fixe Kosten (Bereitschaft, Vorbereitung)", value: formatCurrency(wd.fixedCostSeason) },
              { label: "Arbeitsstunden je Saison", value: `${hours(wd.laborHoursSeason)} h` },
              { label: "Streugut je Saison", value: `${formatNumber(wd.materialKgSeason, 0)} kg` },
              { label: "Ø Erlös pro Monat", value: formatCurrency(shown?.priceMonthly ?? wd.revenueMonthly) },
              { label: "Ø Kosten pro Monat", value: formatCurrency(shown?.costMonthly ?? wd.costMonthly) },
              { label: "Marge (vom Umsatz)", value: pct(wd.marginPct), tone: marginClass, strong: true },
            ]}
          />
        </div>
      </div>

      <DocHeading as={sub} className="mt-[1.2em] text-[1em]">Erlös und Kosten je Saison</DocHeading>
      <SeasonBreakdownTable wd={wd} />
      <DocHeading as={sub} className="mt-[1.2em] text-[1em]">Deckungsbeitrag je Saison: Wetter × Abrechnungsmodus</DocHeading>
      <table className={DOC_TABLE}>
        <caption className="sr-only">Deckungsbeitrag je Wetterszenario und Abrechnungsmodus</caption>
        <thead>
          <tr className={DOC_HEAD_ROW}>
            <th scope="col" className={DOC_TH}>Abrechnung</th>
            {(["mild", "normal", "streng"] as const).map((k) => (
              <th key={k} scope="col" className={cn(DOC_TH, "text-right")}>
                {SCENARIO_LABELS[k]} ({formatNumber(wd.scenarios[k].einsaetze, 0)})
              </th>
            ))}
            <th scope="col" className={DOC_TH}>Verlustschwelle</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map(({ mode, result }) => (
            <tr key={mode} className={cn(DOC_ROW, mode === cfg.billingMode && "font-semibold")}>
              <th scope="row" className={cn(DOC_TD, "text-left", mode !== cfg.billingMode && "font-normal")}>
                {WINTER_BILLING_MODE_LABELS[mode]}
                {mode === cfg.billingMode && <span className="font-normal text-muted-foreground"> (gewählt)</span>}
              </th>
              {(["mild", "normal", "streng"] as const).map((k) => {
                const c = result.scenarios[k].contribution;
                return (
                  <td key={k} className={cn(DOC_TD, DOC_NUM, c < 0 && "text-destructive")}>
                    {signedCurrency(c)}
                    {c < 0 && <span className="sr-only"> (Verlust)</span>}
                  </td>
                );
              })}
              <td className={DOC_TD}>{lossThresholdText(result)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Note>
        Einsätze in Klammern: mild, erwartet und streng laut Region. Bei Pauschalen trägt der Auftragnehmer das Wetterrisiko,
        bei Abrechnung je Einsatz der Auftraggeber.
      </Note>

      <KeyValueTable
        className="mt-[1em]"
        caption="Kolonnenbedarf"
        rows={[
          {
            label: `Kräfte gleichzeitig im Räumfenster (${formatNumber(cfg.clearingWindowHours, 1)} h) bei Schneefall`,
            value: `${formatNumber(wd.crewAtPeak, 2)} → ${crew} ${crew === 1 ? "Kraft" : "Kräfte"}`,
          },
        ]}
      />
    </DocSection>
  );
}

function HmsBlock({
  cfg,
  hms,
  positions,
  shown,
  economics,
  headingTag,
  idPrefix,
}: {
  cfg: HmsConfig;
  hms: HmsResult;
  positions: OfferPosition[];
  /** Angezeigte Komponentenzeile, damit Kennzahlen und Komponenten denselben Betrag zeigen. */
  shown: DisplayComponentRow | undefined;
  economics: ObjectEconomics;
  headingTag: DocHeadingTag;
  idPrefix: string;
}) {
  const sub: DocHeadingTag = headingTag === "h2" ? "h3" : "h4";
  const byId = new Map(positions.map((p) => [p.id, p]));
  const showTravel = hms.travelHoursAnnual > 0;
  const travelRevenue = hms.travelHoursAnnual * hms.rate;
  const travelCost = hms.travelHoursAnnual * hms.vollkosten;
  // Anzeige-Rundung: Leistungen + Anfahrten gehen exakt auf die Summenzeile auf.
  const withTravel = (taskValues: number[], travel: number) => (showTravel ? [...taskValues, travel] : taskValues);
  const revShown = allocateRounded(withTravel(hms.tasks.map((t) => t.revenueAnnual), travelRevenue), hms.revenueAnnual);
  const costShown = allocateRounded(withTravel(hms.tasks.map((t) => t.costAnnual), travelCost), hms.costAnnual);
  const hoursShown = allocateRounded(withTravel(hms.tasks.map((t) => t.hoursAnnual), hms.travelHoursAnnual), hms.laborHoursAnnual, 1);
  const travelIdx = hms.tasks.length;
  const peak = Math.max(0, ...hms.monthlyLaborHours);
  const marginClass = TONE_CLASSES[marginTone(hms.marginPct, economics.strategy.targetMarginPct)].text;

  return (
    <DocSection id={`${idPrefix}-hms`} title="Hausmeisterservice" as={headingTag}>
      <table className={DOC_TABLE}>
        <caption className="sr-only">Hausmeisterservice Leistungen je Jahr</caption>
        <thead>
          <tr className={DOC_HEAD_ROW}>
            <th scope="col" className={DOC_TH}>Leistung</th>
            <th scope="col" className={DOC_TH}>Menge</th>
            <th scope="col" className={DOC_TH}>Turnus</th>
            <th scope="col" className={cn(DOC_TH, "text-right")}>h/Jahr</th>
            <th scope="col" className={cn(DOC_TH, "text-right")}>Erlös/Jahr</th>
            <th scope="col" className={cn(DOC_TH, "text-right")}>Kosten/Jahr</th>
          </tr>
        </thead>
        <tbody>
          {hms.tasks.map((t, i) => {
            const p = byId.get(t.id);
            return (
              <tr key={t.id} className={DOC_ROW}>
                <th scope="row" className={cn(DOC_TD, "text-left font-normal")}>{t.label}</th>
                <td className={cn(DOC_TD, "whitespace-nowrap tabular-nums")}>{p ? formatOfferQuantity(p) : ""}</td>
                <td className={DOC_TD}>{p?.frequencyLabel ?? ""}</td>
                <td className={cn(DOC_TD, DOC_NUM)}>{hours(hoursShown[i])}</td>
                <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(revShown[i])}</td>
                <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(costShown[i])}</td>
              </tr>
            );
          })}
          {showTravel && (
            <tr className={DOC_ROW}>
              <th scope="row" className={cn(DOC_TD, "text-left font-normal")}>
                Anfahrten ({formatNumber(hms.visitDaysPerYear, 0)} Einsatztage à {formatNumber(cfg.travelMinutesPerVisitDay, 0)} Min.)
              </th>
              <td className={DOC_TD} />
              <td className={DOC_TD} />
              <td className={cn(DOC_TD, DOC_NUM)}>{hours(hoursShown[travelIdx])}</td>
              <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(revShown[travelIdx])}</td>
              <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(costShown[travelIdx])}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className={DOC_FOOT_ROW}>
            <th scope="row" className={cn(DOC_TD, "text-left")} colSpan={3}>Summe Hausmeisterservice</th>
            <td className={cn(DOC_TD, DOC_NUM)}>{hours(sumDisplay(hoursShown, 1))}</td>
            <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(sumDisplay(revShown))}</td>
            <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(sumDisplay(costShown))}</td>
          </tr>
        </tfoot>
      </table>

      <KeyValueTable
        className="mt-[1em]"
        caption="Hausmeisterservice Kennzahlen"
        rows={[
          { label: "Deckungsbeitrag je Jahr", value: signedCurrency(hms.contributionAnnual) },
          { label: "Marge (vom Umsatz)", value: pct(hms.marginPct), tone: marginClass, strong: true },
          { label: "Ø Erlös / Kosten pro Monat", value: `${formatCurrency(shown?.priceMonthly ?? hms.revenueMonthly)} / ${formatCurrency(shown?.costMonthly ?? hms.costMonthly)}` },
          { label: "Ø Stunden pro Monat", value: `${hours(shown?.hoursMonthly ?? hms.laborHoursMonthly)} h` },
          ...(hms.contingentHoursAnnual > 0
            ? [{ label: "Kontingent je Jahr", value: `${hours(hms.contingentHoursAnnual)} h` }]
            : []),
          { label: "Material und Entsorgung (Einkauf / Erlös)", value: `${formatCurrency(hms.materialCostAnnual)} / ${formatCurrency(hms.materialRevenueAnnual)}` },
        ]}
      />

      <DocHeading as={sub} className="mt-[1.2em] text-[1em]">Stunden je Monat</DocHeading>
      <table className={cn(DOC_TABLE, "table-fixed")}>
        <caption className="sr-only">Hausmeisterservice Stunden je Kalendermonat (Spitzenmonat fett)</caption>
        <thead>
          <tr className={DOC_HEAD_ROW}>
            {hms.monthlyLaborHours.map((_, i) => (
              <th key={i} scope="col" className={cn(DOC_TH, "pr-[0.3em] text-right")}>{monthShort((i + 1) as MonthIndex)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className={DOC_ROW}>
            {hms.monthlyLaborHours.map((h, i) => {
              const isPeak = peak > 0 && Math.abs(h - peak) < 1e-9;
              return (
                <td key={i} className={cn(DOC_TD, DOC_NUM, "pr-[0.3em]", isPeak && "font-bold")}>
                  {hours(h)}
                  {isPeak && <span className="sr-only"> (Spitze)</span>}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      <Note>
        Spitzenmonat {hours(hms.peakMonthHours)} h. Saisonmonate verteilen nur die Stunden; der Preis bleibt Jahreswert / 12.
      </Note>
    </DocSection>
  );
}

export function InternalCalcDocument({
  project,
  economics,
  companyName,
  titleAs = "h1",
  now,
  className,
}: InternalCalcDocumentProps) {
  const uid = React.useId();
  const { totals, strategy, risk, breakdown, effectiveRate, sensitivity } = economics;
  const groups = useMemo(
    () => buildOfferPositions(project, totals, effectiveRate),
    [project, totals, effectiveRate],
  );
  // Anzeige: gerundete Positionen (Σ Zeilen = Summe) und daraus abgeleitete Komponentenzeilen.
  const shownGroups = useMemo(() => displayOfferGroups(groups, totals.priceMonthly), [groups, totals.priceMonthly]);
  const shownComponents = useMemo(() => displayComponents(totals.components, shownGroups, totals.costMonthly), [totals, shownGroups]);
  const unterhalt = shownGroups.find((g) => g.module === "unterhalt");
  const hmsPositions = groups.find((g) => g.module === "hms")?.positions ?? [];
  const issued = now ?? new Date();
  const dateLabel = formatOfferDate(issued);

  const TitleTag = titleAs;
  const sectionTag: DocHeadingTag = titleAs === "h1" ? "h2" : "h3";
  const hasModules = totals.hasModules;
  const reinigungSuffix = hasModules ? " Reinigung" : "";

  const rateSource = project.hourlyRate
    ? "individuell (im Objekt hinterlegt)"
    : economics.isDefaultRate
      ? "Standardwert (nicht angepasst)"
      : "eigene Kalkulation (Verrechnungssatz)";
  const hasIndividualRate = !!project.hourlyRate;
  const ausfallDelta = breakdown.lohnkostenMitAusfall - breakdown.lohnkostenProStunde;
  const strategyClass = TONE_CLASSES[strategyTone(strategy.status)].text;
  const marginClass = TONE_CLASSES[marginTone(strategy.marginPct, strategy.targetMarginPct)].text;
  const sid = (name: string) => `${uid}-${name}`;

  return (
    <PaperDocument label={`Interne Kalkulation ${project.name}`} className={className}>
      <PaperSheet>
        {/* Warnbanner: auch im Druck deutlich erkennbar */}
        <div
          role="note"
          className="flex items-center gap-[0.8em] rounded-xs border-2 border-destructive bg-destructive-soft px-[1em] py-[0.7em] print:bg-card"
        >
          <ShieldAlert aria-hidden="true" className="size-[1.6em] shrink-0 text-destructive" />
          <div>
            <p className="text-[0.85em] font-bold uppercase tracking-[0.08em] text-destructive">INTERN – nicht zur Weitergabe</p>
            <p className="text-[0.85em] text-foreground">Enthält Kosten, Marge und Risikobewertung. Für Kunden ist das Angebot bestimmt.</p>
          </div>
        </div>

        <div className="mt-[1.5em]">
          <p className="text-[1.1em] font-medium text-muted-foreground">Interne Kalkulation · Entscheidungsgrundlage</p>
          <TitleTag className="text-[1.6em] font-bold leading-tight tracking-tight">{project.name || "Objekt ohne Namen"}</TitleTag>
        </div>

        {/* Objektdaten */}
        <DocSection id={sid("objekt")} title="Objektdaten" as={sectionTag}>
          <KeyValueTable
            caption="Objektdaten"
            rows={[
              { label: "Kunde", value: project.customer || "–" },
              { label: "Standort", value: project.location || "–" },
              ...(project.objectType ? [{ label: "Objektart", value: project.objectType }] : []),
              ...(project.rpiContactName ? [{ label: "Ansprechpartner", value: project.rpiContactName }] : []),
              { label: "Datum", value: dateLabel },
              {
                label: "Verrechnungssatz",
                value: (
                  <>
                    {formatCurrency(effectiveRate)}/h
                    <span className="block text-[0.9em] font-normal text-muted-foreground">Quelle: {rateSource}</span>
                  </>
                ),
              },
              ...(companyName ? [{ label: "Erstellt von", value: companyName }] : []),
            ]}
          />
        </DocSection>

        {/* Komponenten */}
        <DocSection id={sid("komponenten")} title="Komponenten" as={sectionTag}>
          <table className={DOC_TABLE}>
            <caption className="sr-only">Komponenten mit Stunden, Erlös, Kosten, Deckungsbeitrag und Marge je Monat</caption>
            <thead>
              <tr className={DOC_HEAD_ROW}>
                <th scope="col" className={DOC_TH}>Leistung</th>
                <th scope="col" className={cn(DOC_TH, "text-right")}>Std./Mo</th>
                <th scope="col" className={cn(DOC_TH, "text-right")}>Erlös/Mo</th>
                <th scope="col" className={cn(DOC_TH, "text-right")}>Kosten/Mo</th>
                <th scope="col" className={cn(DOC_TH, "text-right")}>DB/Mo</th>
                <th scope="col" className={cn(DOC_TH, "text-right")}>Marge</th>
              </tr>
            </thead>
            <tbody>
              {shownComponents.rows.length === 0 && (
                <tr className={DOC_ROW}>
                  <td className={cn(DOC_TD, "text-muted-foreground")} colSpan={6}>Keine Leistungen erfasst.</td>
                </tr>
              )}
              {shownComponents.rows.map((c) => {
                // Marge aus den exakten Werten; Beträge wie angezeigt (DB = Erlös − Kosten).
                const m = c.exact.priceMonthly > 0 ? ((c.exact.priceMonthly - c.exact.costMonthly) / c.exact.priceMonthly) * 100 : 0;
                return (
                  <tr key={c.key} className={DOC_ROW}>
                    <th scope="row" className={cn(DOC_TD, "text-left font-normal")}>{c.label}</th>
                    <td className={cn(DOC_TD, DOC_NUM)}>{hours(c.hoursMonthly)}</td>
                    <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(c.priceMonthly)}</td>
                    <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(c.costMonthly)}</td>
                    <td className={cn(DOC_TD, DOC_NUM)}>{signedCurrency(c.contributionMonthly)}</td>
                    <td className={cn(DOC_TD, DOC_NUM)}>{pct(m)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={DOC_FOOT_ROW}>
                <th scope="row" className={cn(DOC_TD, "text-left")}>Gesamt</th>
                <td className={cn(DOC_TD, DOC_NUM)}>{hours(shownComponents.total.hoursMonthly)}</td>
                <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(shownComponents.total.priceMonthly)}</td>
                <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(shownComponents.total.costMonthly)}</td>
                <td className={cn(DOC_TD, DOC_NUM)}>
                  {signedCurrency(shownComponents.total.contributionMonthly)}
                </td>
                <td className={cn(DOC_TD, DOC_NUM, marginClass)}>{pct(totals.marginPct)}</td>
              </tr>
            </tfoot>
          </table>
          {hasModules && (
            <Note>Winterdienst als Ø pro Monat (Saisonwert / 12). Kosten = Stunden × Vollkosten zzgl. Material, Maschinen, Bereitschaft und Risikovorsorge.</Note>
          )}
        </DocSection>

        {/* Leistungsverzeichnis Unterhaltsreinigung */}
        {unterhalt && (
          <DocSection id={sid("lv")} title="Leistungsverzeichnis Unterhaltsreinigung" as={sectionTag}>
            <table className={DOC_TABLE}>
              <caption className="sr-only">Räume mit Fläche, Turnus, Leistungswert, Stunden und Preis je Monat</caption>
              <thead>
                <tr className={DOC_HEAD_ROW}>
                  <th scope="col" className={DOC_TH}>Bezeichnung</th>
                  <th scope="col" className={DOC_TH}>Gruppe</th>
                  <th scope="col" className={cn(DOC_TH, "text-right")}>Fläche m²</th>
                  <th scope="col" className={DOC_TH}>Turnus</th>
                  <th scope="col" className={cn(DOC_TH, "text-right")}>LW m²/h</th>
                  <th scope="col" className={cn(DOC_TH, "text-right")}>Std./Mo</th>
                  <th scope="col" className={cn(DOC_TH, "text-right")}>€/Mo</th>
                </tr>
              </thead>
              <tbody>
                {unterhalt.positions.map((p) =>
                  p.kind === "room" ? (
                    <tr key={p.id} className={DOC_ROW}>
                      <th scope="row" className={cn(DOC_TD, "text-left font-normal")}>{p.label}</th>
                      <td className={cn(DOC_TD, "text-muted-foreground")}>{p.groupName ?? ""}</td>
                      <td className={cn(DOC_TD, DOC_NUM)}>{formatNumber(p.quantity?.value ?? 0, 1)}</td>
                      <td className={DOC_TD}>{p.frequencyLabel ?? ""}</td>
                      <td className={cn(DOC_TD, DOC_NUM)}>{p.performanceM2h ? formatNumber(p.performanceM2h, 0) : "–"}</td>
                      <td className={cn(DOC_TD, DOC_NUM)}>{hours(p.hoursMonthly)}</td>
                      <td className={cn(DOC_TD, DOC_NUM, "font-medium")}>{formatCurrency(p.priceMonthly)}</td>
                    </tr>
                  ) : (
                    <tr key={p.id} className={DOC_ROW}>
                      <th scope="row" className={cn(DOC_TD, "text-left font-normal")} colSpan={5}>
                        {p.label} ({formatOfferQuantity(p)}{p.frequencyLabel ? `, ${p.frequencyLabel}` : ""})
                      </th>
                      <td className={cn(DOC_TD, DOC_NUM)}>{hours(p.hoursMonthly)}</td>
                      <td className={cn(DOC_TD, DOC_NUM, "font-medium")}>{formatCurrency(p.priceMonthly)}</td>
                    </tr>
                  ),
                )}
              </tbody>
              <tfoot>
                <tr className={DOC_FOOT_ROW}>
                  <th scope="row" className={cn(DOC_TD, "text-left")} colSpan={2}>Summe Unterhaltsreinigung</th>
                  <td className={cn(DOC_TD, DOC_NUM)}>{formatNumber(totals.cleaning.area, 1)}</td>
                  <td className={DOC_TD} colSpan={2} />
                  <td className={cn(DOC_TD, DOC_NUM)}>{hours(unterhalt.hoursMonthly)}</td>
                  <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(unterhalt.subtotalMonthly)}</td>
                </tr>
              </tfoot>
            </table>
            <Note>LW = effektiver Leistungswert inkl. Zu- und Abschlägen für Verschmutzung, Möblierung und Bodenart.</Note>
          </DocSection>
        )}

        {/* Kostenaufriss je Stunde */}
        <DocSection id={sid("kosten")} title="Kostenaufriss je Stunde" as={sectionTag}>
          <KeyValueTable
            caption="Kostenaufriss je Stunde"
            rows={[
              { label: "Basislohn", value: formatCurrency(breakdown.baseLohn) },
              { label: "+ Schichtzuschläge (Nacht/Sonntag/Feiertag)", value: formatCurrency(breakdown.schichtzuschlag.totalZuschlag) },
              { label: `+ Sozialversicherung (${formatNumber(breakdown.svTotalRate, 1)} %)`, value: formatCurrency(breakdown.svBetrag) },
              { label: "= Lohnkosten je Stunde", value: formatCurrency(breakdown.lohnkostenProStunde), strong: true },
              {
                label: `+ Ausfallzeiten (Faktor ${formatNumber(breakdown.ausfallzuschlag, 2)}: Urlaub, Krankheit, Feiertage, Fortbildung)`,
                value: formatCurrency(ausfallDelta),
              },
              { label: `+ Gemeinkosten (${formatNumber(breakdown.overheadTotalRate, 1)} %)`, value: formatCurrency(breakdown.overheadBetrag) },
              { label: "= Vollkosten (Selbstkosten je Stunde)", value: formatCurrency(breakdown.vollkosten), strong: true },
              { label: `+ Gewinn (${formatNumber(breakdown.gewinnmarge, 0)} % Aufschlag)`, value: formatCurrency(breakdown.gewinnBetrag) },
              { label: "= Stundenverrechnungssatz (kalkuliert)", value: formatCurrency(breakdown.stundenverrechnungssatz), strong: true },
              ...(hasIndividualRate
                ? [{ label: "Verrechnungssatz dieses Objekts (individuell)", value: formatCurrency(effectiveRate), strong: true }]
                : []),
            ]}
          />
        </DocSection>

        {/* Wirtschaftlichkeit */}
        <DocSection id={sid("wirtschaftlichkeit")} title="Wirtschaftlichkeit" as={sectionTag}>
          <KeyValueTable
            caption="Wirtschaftlichkeit"
            rows={[
              { label: "Status", value: strategyLabel(strategy.status), tone: strategyClass, strong: true },
              { label: hasModules ? "Monatspreis netto (Ø inkl. Zusatzleistungen)" : "Monatspreis netto", value: formatCurrency(strategy.currentPriceMonthly), strong: true },
              { label: "Mindestpreis (rote Linie: Vollkosten)", value: formatCurrency(strategy.minPriceMonthly), tone: strategy.currentPriceMonthly < strategy.minPriceMonthly ? "text-destructive" : undefined },
              { label: "Zielpreis (bei Zielmarge)", value: formatCurrency(strategy.targetPriceMonthly) },
              { label: "Deckungsbeitrag pro Monat", value: signedCurrency(strategy.contributionMonthly) },
              { label: "Marge (vom Umsatz)", value: pct(strategy.marginPct), tone: marginClass },
              {
                label: "Zielmarge (vom Umsatz)",
                value: (
                  <>
                    {pct(strategy.targetMarginPct)}
                    <span className="text-muted-foreground"> (= {formatNumber(economics.strategyInput.targetMarkupPct, 0)} % Gewinnaufschlag)</span>
                  </>
                ),
              },
              { label: "Verhandlungsspielraum bis zur roten Linie", value: formatCurrency(strategy.negotiationRoomMonthly) },
              { label: `Zielsatz${reinigungSuffix}`, value: `${formatCurrency(strategy.targetRate)}/h` },
              { label: `Break-even-Satz${reinigungSuffix}`, value: `${formatCurrency(strategy.breakEvenRate)}/h` },
              { label: "Preis pro m² (Reinigung, monatlich)", value: formatCurrency(totals.cleaning.pricePerSqm) },
              { label: "Verrechnungssatz", value: `${formatCurrency(effectiveRate)}/h` },
            ]}
          />
          <Note>
            Unter dem Mindestpreis arbeitet das Objekt unter Vollkosten (Verlust). Marge und Zielmarge beziehen sich beide auf den Umsatz.
          </Note>

          {sensitivity.length > 0 && (
            <table className={cn(DOC_TABLE, "mt-[1em]")}>
              <caption className="sr-only">Was-wäre-wenn-Szenarien</caption>
              <thead>
                <tr className={DOC_HEAD_ROW}>
                  <th scope="col" className={DOC_TH}>Was wäre, wenn …</th>
                  <th scope="col" className={cn(DOC_TH, "text-right")}>DB/Mo</th>
                  <th scope="col" className={cn(DOC_TH, "text-right")}>Marge</th>
                  <th scope="col" className={DOC_TH}>Bewertung</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((s) => (
                  <tr key={s.key} className={DOC_ROW}>
                    <th scope="row" className={cn(DOC_TD, "text-left font-normal")}>{s.label}</th>
                    <td className={cn(DOC_TD, DOC_NUM)}>{signedCurrency(s.contributionMonthly)}</td>
                    <td className={cn(DOC_TD, DOC_NUM)}>{pct(s.marginPct)}</td>
                    <td className={cn(DOC_TD, s.belowCost ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {s.belowCost ? "unter Vollkosten" : "kostendeckend"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DocSection>

        {totals.winterdienst && project.winterdienst && (
          <WinterdienstBlock
            cfg={project.winterdienst}
            wd={totals.winterdienst}
            shown={shownComponents.rows.find((c) => c.key === "winterdienst")}
            economics={economics}
            headingTag={sectionTag}
            idPrefix={uid}
          />
        )}

        {totals.hms && project.hms && (
          <HmsBlock
            cfg={project.hms}
            hms={totals.hms}
            positions={hmsPositions}
            shown={shownComponents.rows.find((c) => c.key === "hms")}
            economics={economics}
            headingTag={sectionTag}
            idPrefix={uid}
          />
        )}

        {/* Risiko */}
        <DocSection id={sid("risiko")} title="Risikobewertung" as={sectionTag}>
          <p className="mb-[0.6em] font-semibold">
            Risiko-Score: {risk.score}/100 – {riskLabel(risk.level)}
            <span className="font-normal text-muted-foreground"> · Personalbedarf ≈ {formatNumber(risk.fte, 1)} Vollzeit-Äquivalente</span>
          </p>
          {risk.factors.length === 0 ? (
            <p className="text-muted-foreground">Keine Risikofaktoren erkannt.</p>
          ) : (
            <table className={DOC_TABLE}>
              <caption className="sr-only">Risikofaktoren mit Empfehlung und Punkten</caption>
              <thead>
                <tr className={DOC_HEAD_ROW}>
                  <th scope="col" className={DOC_TH}>Faktor</th>
                  <th scope="col" className={DOC_TH}>Empfehlung</th>
                  <th scope="col" className={cn(DOC_TH, "text-right")}>Punkte</th>
                </tr>
              </thead>
              <tbody>
                {risk.factors.map((f) => (
                  <tr key={f.key} className={DOC_ROW}>
                    <td className={DOC_TD}>
                      <p className="font-medium">{f.title}</p>
                      <p className="text-[0.9em] text-muted-foreground">{f.detail}</p>
                    </td>
                    <td className={DOC_TD}>{f.recommendation}</td>
                    <td className={cn(DOC_TD, DOC_NUM)}>+{f.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DocSection>

        {/* Annahmen & Hinweise */}
        <DocSection id={sid("annahmen")} title="Annahmen und Hinweise" as={sectionTag}>
          <ul className="list-disc space-y-[0.3em] pl-[1.2em]">
            <li>
              Rüstzeit: {(project.ruestzeit ?? 0) > 0 ? `${formatNumber(project.ruestzeit ?? 0, 0)} Min. je Einsatz` : "nicht kalkuliert"} ·
              Wegezeit: {(project.wegezeit ?? 0) > 0 ? `${formatNumber(project.wegezeit ?? 0, 0)} Min. je Einsatz` : "nicht kalkuliert"}
            </li>
            <li>Leistungswerte verstehen sich effektiv, inkl. Zu- und Abschlägen für Verschmutzungsgrad, Möblierung und Bodenart.</li>
            <li>Benchmark- und Marktwerte sind Branchen-Richtwerte zur Orientierung – sie ersetzen keine eigene Nachkalkulation.</li>
            <li>Der Kostenaufriss basiert auf der hinterlegten Verrechnungssatz-Konfiguration (Lohn, SV, Ausfallzeiten, Gemeinkosten).</li>
            {totals.winterdienst && <li>Winterdienst: {WINTER_REGION_DISCLAIMER}</li>}
            {economics.usesDefaultRate && (
              <li>Achtung: Es wird der unveränderte Standard-Verrechnungssatz verwendet – bitte mit der eigenen Kostenstruktur nachkalkulieren.</li>
            )}
            {hasIndividualRate && (
              <li>Für dieses Objekt ist ein individueller Verrechnungssatz hinterlegt; der Kostenaufriss zeigt die allgemeine Kalkulationsbasis.</li>
            )}
          </ul>
        </DocSection>

        <div className="mt-auto pt-[2em]">
          <p className="border-t border-border pt-[0.8em] text-[0.8em] text-muted-foreground">
            Internes Dokument – nicht zur Weitergabe an Kunden · Erstellt mit CleanCalc Pro · {dateLabel}
          </p>
        </div>
      </PaperSheet>
    </PaperDocument>
  );
}
