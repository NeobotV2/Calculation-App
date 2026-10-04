/* ─────────────────────────────────────────────────────────────────────────
   Controlling: reine Portfolio-Logik (Summen, Chart-Anteile, Filter,
   Nachkalkulations-Urteil, Auswirkung eines neuen Verrechnungssatzes).
   Alle Zahlen kommen aus computeObjectEconomics/ObjectTotals — für reine
   Raum-Objekte identisch mit den bisherigen Seitenformeln (calcProjectTotals,
   calcRoom). Ohne DOM/Store, vollständig testbar.
   ───────────────────────────────────────────────────────────────────────── */
import { calcRoom } from "@/lib/calc";
import { displayModuleAmounts, displayOfferGroups, sumDisplay } from "@/lib/display-rounding";
import { buildOfferPositions } from "@/lib/offer-positions";
import { calcHourlyRate } from "@/lib/hourly-rate-calc";
import { compareNachkalkulation, type NachkalkulationResult } from "@/lib/nachkalkulation";
import { computeObjectEconomics, type EconomicsSettings, type ObjectEconomics } from "@/lib/object-economics";
import type { ObjectComponentKey } from "@/lib/object-totals";
import type { ObjectStatus, ObjectStatusKey } from "@/lib/offer-readiness";
import {
  compareHmsNachkalkulation,
  compareWinterNachkalkulation,
  type HmsNachkalkulationResult,
  type WinterNachkalkulationResult,
} from "@/lib/service-modules/nachkalkulation";
import type { HmsActual, HmsResult, WinterdienstActual, WinterdienstResult } from "@/lib/service-modules/types";
import { nachkalkulationBadge, type Tone, type Verdict } from "@/lib/status";
import { formatNumber } from "@/lib/utils";
import { latestHmsActual } from "@/components/calc/hms/hms-ui";
import { latestWinterActual } from "@/components/calc/winterdienst/winterdienst-ui";
import type { Nachkalkulation, Project } from "@/store/use-store";

/** Prozent mit einer Nachkommastelle und typografischem Minus (U+2212), z. B. „−3,2 %". */
export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "–";
  const text = formatNumber(Math.abs(value), decimals);
  const isZero = text === formatNumber(0, decimals);
  return `${value < 0 && !isZero ? "−" : ""}${text} %`;
}

/** Anteil an einer Summe in % (0 ohne Summe). */
export function shareOf(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

/* ── Summen ─────────────────────────────────────────────────────────────── */

export interface PortfolioTotals {
  objectCount: number;
  roomCount: number;
  /** Σ priceMonthly (alle Leistungen, Ø Monat netto). */
  priceMonthly: number;
  priceAnnual: number;
  /** Σ costMonthly (Vollkosten). */
  costMonthly: number;
  /** Σ contributionMonthly (Deckungsbeitrag). */
  contributionMonthly: number;
  /** Ø Marge vom Umsatz in % = Σ DB / Σ Umsatz × 100 (0 ohne Umsatz). */
  marginPct: number;
  /** Σ laborHoursMonthly (alle Leistungen). */
  laborHoursMonthly: number;
  /** Σ cleaning.cost (Unterhaltsreinigung inkl. Rüst-/Wegezeit). */
  cleaningCost: number;
  /** Σ cleaning.area. */
  cleaningArea: number;
  /** Σ cleaning.hours. */
  cleaningHours: number;
  /** Ø €/m² Reinigung = Σ cleaning.cost / Σ cleaning.area (0 ohne Fläche). */
  cleaningPricePerSqm: number;
}

export function aggregatePortfolio(econs: readonly ObjectEconomics[]): PortfolioTotals {
  let roomCount = 0;
  let priceMonthly = 0;
  let priceAnnual = 0;
  let costMonthly = 0;
  let contributionMonthly = 0;
  let laborHoursMonthly = 0;
  let cleaningCost = 0;
  let cleaningArea = 0;
  let cleaningHours = 0;
  for (const e of econs) {
    const t = e.totals;
    roomCount += t.cleaning.count;
    priceMonthly += t.priceMonthly;
    priceAnnual += t.priceAnnual;
    costMonthly += t.costMonthly;
    contributionMonthly += t.contributionMonthly;
    laborHoursMonthly += t.laborHoursMonthly;
    cleaningCost += t.cleaning.cost;
    cleaningArea += t.cleaning.area;
    cleaningHours += t.cleaning.hours;
  }
  return {
    objectCount: econs.length,
    roomCount,
    priceMonthly,
    priceAnnual,
    costMonthly,
    contributionMonthly,
    marginPct: priceMonthly > 0 ? (contributionMonthly / priceMonthly) * 100 : 0,
    laborHoursMonthly,
    cleaningCost,
    cleaningArea,
    cleaningHours,
    cleaningPricePerSqm: cleaningArea > 0 ? cleaningCost / cleaningArea : 0,
  };
}

/* ── Chart-Anteile ──────────────────────────────────────────────────────── */

export interface ChartSlice {
  key: string;
  label: string;
  value: number;
  /** CSS-Farbe aus den Chart-Tokens (§4.4). */
  color: string;
}

/** Leistungs-Komponenten mit festen Chart-Farben: 1 Unterhalt, 2 Winterdienst, 3 HMS, 4 Rüst-/Wegezeit. */
export const COMPONENT_SLICE_META: Record<ObjectComponentKey, { label: string; color: string }> = {
  reinigung: { label: "Reinigung", color: "hsl(var(--chart-1))" },
  ruest_wege: { label: "Rüst-/Wegezeit", color: "hsl(var(--chart-4))" },
  winterdienst: { label: "Winterdienst (Ø)", color: "hsl(var(--chart-2))" },
  hms: { label: "Hausmeisterservice", color: "hsl(var(--chart-3))" },
};

export const COMPONENT_SLICE_ORDER: readonly ObjectComponentKey[] = ["reinigung", "ruest_wege", "winterdienst", "hms"];

/** Schlüssel des Rüst-/Wegezeit-Anteils im Raumgruppen-Chart. */
export const SETUP_SLICE_KEY = "ruest_wege";

/**
 * Abgestufte Unterhalts-Farbe (chart-1) für Raumgruppen: Gruppen sind alle
 * Unterhaltsreinigung, die Unterscheidung trägt die Legende (Text + Wert).
 */
export function groupSliceColor(index: number, count: number): string {
  if (count <= 1) return COMPONENT_SLICE_META.reinigung.color;
  const alpha = 1 - (Math.min(index, count - 1) / (count - 1)) * 0.6;
  return `hsl(var(--chart-1) / ${Math.round(alpha * 100) / 100})`;
}

/**
 * Umsatz nach Leistung über alle Objekte (Reinigung, Rüst-/Wegezeit,
 * Winterdienst Ø, HMS) aus `totals.components`. Σ value = Σ priceMonthly.
 * Anteile ohne Umsatz entfallen.
 */
export function revenueByModule(econs: readonly ObjectEconomics[]): ChartSlice[] {
  const sums = new Map<ObjectComponentKey, number>();
  for (const e of econs) {
    for (const c of e.totals.components) sums.set(c.key, (sums.get(c.key) ?? 0) + c.priceMonthly);
  }
  return COMPONENT_SLICE_ORDER.flatMap((key) => {
    const value = sums.get(key) ?? 0;
    return value > 0 ? [{ key, label: COMPONENT_SLICE_META[key].label, value, color: COMPONENT_SLICE_META[key].color }] : [];
  });
}

/**
 * Angezeigte Beträge von „Umsatz nach Leistung“: je Objekt dieselbe Rundung
 * wie Prüfschritt, Arbeitsbereich und Angebot (`displayModuleAmounts`), dann
 * über die Objekte summiert. Σ Zeilen = Σ gerundeter Objektpreise = KPI
 * „Umsatz/Monat“ und Σ der Portfolio-Tabelle. Reihenfolge wie `slices`.
 */
export function moduleSliceDisplayValues(
  objects: readonly { project: Project; econ: ObjectEconomics }[],
  slices: readonly ChartSlice[],
): number[] {
  const byKey = new Map<string, number[]>();
  const push = (key: ObjectComponentKey, v: number) => byKey.set(key, [...(byKey.get(key) ?? []), v]);
  for (const { project, econ } of objects) {
    const m = displayModuleAmounts(
      displayOfferGroups(buildOfferPositions(project, econ.totals, econ.effectiveRate), econ.totals.priceMonthly),
    );
    for (const c of econ.totals.components) {
      push(c.key, c.key === "reinigung" ? m.rooms : c.key === "ruest_wege" ? m.setup : c.key === "winterdienst" ? m.winterdienst : m.hms);
    }
  }
  return slices.map((s) => (byKey.has(s.key) ? sumDisplay(byKey.get(s.key)!) : s.value));
}

interface GroupSum {
  name: string;
  hours: number;
  cost: number;
}

/** Raumgruppen eines Objekts (wie bisher: calcRoom je Raum, summiert nach groupName). */
export function roomGroupBreakdown(project: Project, rate: number): GroupSum[] {
  const map = new Map<string, GroupSum>();
  for (const r of project.rooms) {
    const rc = calcRoom(r, rate);
    const g = map.get(r.groupName) ?? { name: r.groupName, hours: 0, cost: 0 };
    g.hours += rc.monthlyHours;
    g.cost += rc.monthlyCost;
    map.set(r.groupName, g);
  }
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
}

function setupRevenue(econ: ObjectEconomics): number {
  const c = econ.totals.cleaning;
  return (c.ruestzeitHours + c.wegezeitHours) * econ.effectiveRate;
}

function groupSlices(sums: Map<string, number>): ChartSlice[] {
  const sorted = Array.from(sums.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  return sorted.map(([name, value], i) => ({
    key: `group:${name}`,
    label: name || "Ohne Gruppe",
    value,
    color: groupSliceColor(i, sorted.length),
  }));
}

/**
 * Umsatz nach Raumgruppe über alle Objekte plus Anteil „Rüst-/Wegezeit".
 * Σ value = Σ cleaning.cost (Projekte ohne Wirtschaftlichkeit entfallen).
 */
export function revenueByGroup(
  projects: readonly Project[],
  econs: ReadonlyMap<string, ObjectEconomics>,
): ChartSlice[] {
  const sums = new Map<string, number>();
  let setup = 0;
  for (const p of projects) {
    const econ = econs.get(p.id);
    if (!econ) continue;
    for (const g of roomGroupBreakdown(p, econ.effectiveRate)) sums.set(g.name, (sums.get(g.name) ?? 0) + g.cost);
    setup += setupRevenue(econ);
  }
  const slices = groupSlices(sums);
  if (setup > 0) {
    slices.push({ key: SETUP_SLICE_KEY, label: COMPONENT_SLICE_META.ruest_wege.label, value: setup, color: COMPONENT_SLICE_META.ruest_wege.color });
  }
  return slices;
}

/**
 * Umsatzanteile eines Objekts: Raumgruppen, Rüst-/Wegezeit, Winterdienst und
 * HMS (aus `totals.components`). Σ value = totals.priceMonthly.
 */
export function objectRevenueSlices(project: Project, econ: ObjectEconomics): ChartSlice[] {
  const sums = new Map<string, number>();
  for (const g of roomGroupBreakdown(project, econ.effectiveRate)) sums.set(g.name, g.cost);
  const slices = groupSlices(sums);
  for (const c of econ.totals.components) {
    if (c.key === "reinigung" || c.priceMonthly <= 0) continue;
    const meta = COMPONENT_SLICE_META[c.key];
    slices.push({ key: c.key, label: meta.label, value: c.priceMonthly, color: meta.color });
  }
  return slices;
}

/**
 * Angezeigte Beträge der Objekt-Anteile — dieselbe Rundung wie Prüfschritt,
 * Arbeitsbereich und Angebot (Raumgruppe = Σ gerundeter Räume, Rüst-/Wegezeit,
 * Winterdienst und HMS = gerundete Zwischensummen). Reihenfolge wie `slices`.
 */
export function objectSliceDisplayValues(project: Project, econ: ObjectEconomics, slices: readonly ChartSlice[]): number[] {
  const shown = displayOfferGroups(buildOfferPositions(project, econ.totals, econ.effectiveRate), econ.totals.priceMonthly);
  const m = displayModuleAmounts(shown);
  const roomPositions = shown.find((g) => g.module === "unterhalt")?.positions.filter((p) => p.kind === "room") ?? [];
  const byGroup = new Map<string, number[]>();
  for (const r of project.rooms) {
    const pos = roomPositions.find((x) => x.id === r.id);
    if (!pos) continue;
    byGroup.set(r.groupName, [...(byGroup.get(r.groupName) ?? []), pos.priceMonthly]);
  }
  return slices.map((s) => {
    if (s.key.startsWith("group:")) return sumDisplay(byGroup.get(s.key.slice("group:".length)) ?? []);
    if (s.key === SETUP_SLICE_KEY) return m.setup;
    if (s.key === "winterdienst") return m.winterdienst;
    if (s.key === "hms") return m.hms;
    return s.value;
  });
}

export function sumSlices(slices: readonly ChartSlice[]): number {
  return slices.reduce((s, x) => s + x.value, 0);
}

/* ── Stunden pro Objekt (gestapelt nach Leistung) ───────────────────────── */

export type HoursByComponent = Record<ObjectComponentKey, number>;

export interface ObjectHoursRow extends HoursByComponent {
  id: string;
  name: string;
  total: number;
}

/** Ø-Monatsstunden je Objekt, aufgeteilt nach Leistung; absteigend sortiert. */
export function hoursByObject(projects: readonly Project[], econs: ReadonlyMap<string, ObjectEconomics>): ObjectHoursRow[] {
  const rows: ObjectHoursRow[] = [];
  for (const p of projects) {
    const econ = econs.get(p.id);
    if (!econ) continue;
    const row: ObjectHoursRow = { id: p.id, name: p.name || "Ohne Namen", total: econ.totals.laborHoursMonthly, reinigung: 0, ruest_wege: 0, winterdienst: 0, hms: 0 };
    for (const c of econ.totals.components) row[c.key] += c.hoursMonthly;
    rows.push(row);
  }
  return rows.sort((a, b) => b.total - a.total);
}

/* ── Leistungen & Filter ────────────────────────────────────────────────── */

export type PortfolioModuleKey = "unterhalt" | "winterdienst" | "hms";

/** Aktive Leistungen (Unterhalt zählt bei Räumen ODER wenn kein anderes Modul aktiv ist). */
export function portfolioModules(project: Project): PortfolioModuleKey[] {
  const wd = !!project.winterdienst?.enabled;
  const hms = !!project.hms?.enabled;
  const out: PortfolioModuleKey[] = [];
  if (project.rooms.length > 0 || (!wd && !hms)) out.push("unterhalt");
  if (wd) out.push("winterdienst");
  if (hms) out.push("hms");
  return out;
}

export type PortfolioModuleFilter = "all" | PortfolioModuleKey;
export type PortfolioStatusFilter = "all" | Exclude<ObjectStatusKey, "archiviert">;

export const PORTFOLIO_MODULE_FILTER_LABELS: Record<PortfolioModuleFilter, string> = {
  all: "Alle Leistungen",
  unterhalt: "Mit Unterhaltsreinigung",
  winterdienst: "Mit Winterdienst",
  hms: "Mit Hausmeisterservice",
};

export const PORTFOLIO_STATUS_FILTER_LABELS: Record<PortfolioStatusFilter, string> = {
  all: "Alle Status",
  entwurf: "Entwurf",
  pruefung_offen: "Prüfung offen",
  angebotsbereit: "Angebotsbereit",
};

export interface PortfolioVerdict {
  verdict: Verdict;
  tone: Tone;
  label: string;
  /** Leistung, aus deren Nachkalkulation das Urteil stammt. */
  source: PortfolioModuleKey;
  /** 0 Besser als geplant · 1 Im Plan · 2 Über Plan · 3 Kritisch – Verlust (Sortierung, „schlechtestes“ Urteil). */
  severity: number;
  result: NachkalkulationResult | WinterNachkalkulationResult | HmsNachkalkulationResult;
}

export interface PortfolioRow {
  project: Project;
  econ: ObjectEconomics;
  status: ObjectStatus;
  modules: PortfolioModuleKey[];
  verdict: PortfolioVerdict | null;
}

export interface PortfolioFilter {
  module: PortfolioModuleFilter;
  status: PortfolioStatusFilter;
}

export const DEFAULT_PORTFOLIO_FILTER: PortfolioFilter = { module: "all", status: "all" };

export function filterPortfolioRows(rows: readonly PortfolioRow[], filter: PortfolioFilter): PortfolioRow[] {
  return rows.filter(
    (r) =>
      (filter.module === "all" || r.modules.includes(filter.module)) &&
      (filter.status === "all" || r.status.key === filter.status),
  );
}

export function hasActivePortfolioFilter(filter: PortfolioFilter): boolean {
  return filter.module !== "all" || filter.status !== "all";
}

const VERDICT_SEVERITY: Record<Verdict, number> = { besser: 0, im_plan: 1, schlechter: 2 };
const LOSS_SEVERITY = 3;

/** Wie die Nachkalkulations-Karten: „Über Plan“ mit negativer Ist-Marge ist „Kritisch – Verlust“. */
function toPortfolioVerdict(source: PortfolioModuleKey, result: PortfolioVerdict["result"]): PortfolioVerdict {
  const { tone, label, loss } = nachkalkulationBadge(result);
  return { verdict: result.verdict, tone, label, source, severity: loss ? LOSS_SEVERITY : VERDICT_SEVERITY[result.verdict], result };
}

/**
 * Urteil der Raum-Nachkalkulation (gleiche Eingaben wie RoomNachkalkulationCard:
 * Reinigungsstunden, -preis und -fläche, Vollkostensatz). null ohne Eintrag.
 */
export function roomNachkalkulationVerdict(
  econ: ObjectEconomics,
  entry: Nachkalkulation | undefined,
): PortfolioVerdict | null {
  if (!entry) return null;
  const c = econ.totals.cleaning;
  const result = compareNachkalkulation({
    plannedHours: c.hours,
    actualHours: entry.actualMonthlyHours,
    monthlyPrice: c.cost,
    vollkosten: econ.breakdown.vollkosten,
    area: c.area,
  });
  return toPortfolioVerdict("unterhalt", result);
}

/** Jüngste Winterdienst-Saison gegen den Plan (wie WinterNachkalkulationCard). null ohne Plan oder Saison. */
export function winterNachkalkulationVerdict(
  plan: WinterdienstResult | null,
  actuals: readonly WinterdienstActual[] | undefined,
): PortfolioVerdict | null {
  const latest = latestWinterActual(actuals);
  if (!plan || !latest) return null;
  return toPortfolioVerdict("winterdienst", compareWinterNachkalkulation(plan, latest));
}

/** Jüngstes HMS-Jahr gegen den Plan (wie HmsNachkalkulationCard). null ohne Plan oder Jahr. */
export function hmsNachkalkulationVerdict(
  plan: HmsResult | null,
  actuals: readonly HmsActual[] | undefined,
  contingentOverageBilled: boolean,
): PortfolioVerdict | null {
  const latest = latestHmsActual(actuals);
  if (!plan || !latest) return null;
  return toPortfolioVerdict("hms", compareHmsNachkalkulation(plan, latest, contingentOverageBilled));
}

/**
 * Nachkalkulations-Urteil eines Objekts im Portfolio: das schlechteste Urteil
 * über die Leistungen, die das Controlling-Detail vergleicht (Unterhalt bei
 * Räumen oder ohne Module, aktive Module Winterdienst/HMS). null ohne Ist-Werte.
 */
export function portfolioNachkalkulationVerdict(
  project: Project,
  econ: ObjectEconomics,
  roomEntry: Nachkalkulation | undefined,
): PortfolioVerdict | null {
  const t = econ.totals;
  const candidates = [
    t.cleaning.count > 0 || !t.hasModules ? roomNachkalkulationVerdict(econ, roomEntry) : null,
    winterNachkalkulationVerdict(t.winterdienst, project.serviceActuals?.winterdienst),
    hmsNachkalkulationVerdict(t.hms, project.serviceActuals?.hms, project.hms?.contingentOverageBilled ?? false),
  ];
  let worst: PortfolioVerdict | null = null;
  for (const v of candidates) {
    if (v && (!worst || v.severity > worst.severity)) worst = v;
  }
  return worst;
}

/* ── Auswirkung eines geänderten Verrechnungssatzes ─────────────────────── */

export interface RateImpact {
  /** Aktive Objekte ohne eigenen Satz (sie folgen dem globalen Satz). */
  affectedCount: number;
  /** Σ priceMonthly aller aktiven Objekte vorher. */
  oldMonthly: number;
  /** Σ priceMonthly aller aktiven Objekte nachher. */
  newMonthly: number;
  /** newMonthly − oldMonthly. */
  deltaMonthly: number;
}

export function hasOwnRate(project: Project): boolean {
  return typeof project.hourlyRate === "number" && Number.isFinite(project.hourlyRate);
}

/**
 * Vergleicht den Monatsumsatz aller aktiven Objekte mit alten und neuen
 * Einstellungen (computeObjectEconomics alt vs. neu).
 */
export function calcRateImpact(
  projects: readonly Project[],
  oldSettings: EconomicsSettings,
  newSettings: EconomicsSettings,
): RateImpact {
  const active = projects.filter((p) => p.status !== "archived");
  const oldBreakdown = calcHourlyRate(oldSettings.hourlyRateConfig);
  const newBreakdown =
    newSettings.hourlyRateConfig === oldSettings.hourlyRateConfig ? oldBreakdown : calcHourlyRate(newSettings.hourlyRateConfig);
  let oldMonthly = 0;
  let newMonthly = 0;
  for (const p of active) {
    oldMonthly += computeObjectEconomics(p, oldSettings, { breakdown: oldBreakdown }).totals.priceMonthly;
    newMonthly += computeObjectEconomics(p, newSettings, { breakdown: newBreakdown }).totals.priceMonthly;
  }
  return {
    affectedCount: active.filter((p) => !hasOwnRate(p)).length,
    oldMonthly,
    newMonthly,
    deltaMonthly: newMonthly - oldMonthly,
  };
}
