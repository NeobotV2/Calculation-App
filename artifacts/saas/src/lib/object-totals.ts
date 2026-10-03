import { calcProjectTotals } from "@/lib/calc";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import { calcHms } from "@/lib/service-modules/hms";
import type { StrategyExtras } from "@/lib/price-strategy";
import type { HmsResult, ModuleRates, MonthIndex, WinterdienstResult } from "@/lib/service-modules/types";
import type { Project } from "@/store/use-store";

/** Rückgabetyp von calcProjectTotals (Räume + Rüst-/Wegezeit). calc.ts bleibt unverändert. */
export type CleaningTotals = ReturnType<typeof calcProjectTotals>;

export type ObjectComponentKey = "reinigung" | "ruest_wege" | "winterdienst" | "hms";

export interface ObjectComponent {
  key: ObjectComponentKey;
  label: string;
  hoursMonthly: number;
  priceMonthly: number;
  costMonthly: number;
}

export interface ObjectTotals {
  /** Unverändert calcProjectTotals(project, rate). cleaning.cost = Reinigungspreis/Monat. */
  cleaning: CleaningTotals;
  /** null = nicht angelegt oder enabled = false. */
  winterdienst: WinterdienstResult | null;
  hms: HmsResult | null;
  /** Mindestens ein Modul aktiv (enabled). */
  hasModules: boolean;
  /** cleaning.hours × vollkosten. */
  cleaningCostMonthly: number;
  /** Ø-Monatspreis netto (Jahreswert / 12). Ohne Module === cleaning.cost (Identität). */
  priceMonthly: number;
  /** Ohne Module === cleaning.annualCost. */
  priceAnnual: number;
  costMonthly: number;
  contributionMonthly: number;
  /** Marge auf den Umsatz in %: contribution / price (0 ohne Preis). */
  marginPct: number;
  /** Ø-Monatsstunden aller Komponenten. Ohne Module === cleaning.hours. */
  laborHoursMonthly: number;
  /** Aufschlüsselung für Tabellen/Charts; Σ priceMonthly = priceMonthly (± Rundung 1e-9). */
  components: ObjectComponent[];
  /** Eingabe für calcPriceStrategy/calcSensitivity; undefined ohne aktive Module. */
  extras: StrategyExtras | undefined;
}

export function hasActiveModules(project: Project | undefined): boolean {
  return !!project?.winterdienst?.enabled || !!project?.hms?.enabled;
}

export function calcObjectTotals(project: Project | undefined, rates: ModuleRates): ObjectTotals {
  const cleaning = calcProjectTotals(project, rates.rate);
  const winterdienst = project?.winterdienst?.enabled ? calcWinterdienst(project.winterdienst, rates) : null;
  const hms = project?.hms?.enabled ? calcHms(project.hms, rates) : null;
  const hasModules = winterdienst !== null || hms !== null;

  const cleaningCostMonthly = cleaning.hours * rates.vollkosten;
  const setupH = cleaning.ruestzeitHours + cleaning.wegezeitHours;
  const roomsH = cleaning.hours - setupH;
  const components: ObjectComponent[] = [];
  if (cleaning.count > 0) {
    components.push({ key: "reinigung", label: "Unterhaltsreinigung", hoursMonthly: roomsH, priceMonthly: roomsH * rates.rate, costMonthly: roomsH * rates.vollkosten });
  }
  if (setupH > 0) {
    components.push({ key: "ruest_wege", label: "Rüst- und Wegezeit", hoursMonthly: setupH, priceMonthly: setupH * rates.rate, costMonthly: setupH * rates.vollkosten });
  }

  if (!hasModules) {
    // Identitätszweig: room-only Ergebnisse sind per Konstruktion bit-identisch mit calcProjectTotals.
    const contributionMonthly = cleaning.cost - cleaningCostMonthly;
    return {
      cleaning, winterdienst, hms, hasModules, cleaningCostMonthly,
      priceMonthly: cleaning.cost,
      priceAnnual: cleaning.annualCost,
      costMonthly: cleaningCostMonthly,
      contributionMonthly,
      marginPct: cleaning.cost > 0 ? (contributionMonthly / cleaning.cost) * 100 : 0,
      laborHoursMonthly: cleaning.hours,
      components,
      extras: undefined,
    };
  }

  if (winterdienst) {
    components.push({ key: "winterdienst", label: "Winterdienst (Ø Monat)", hoursMonthly: winterdienst.laborHoursMonthly, priceMonthly: winterdienst.revenueMonthly, costMonthly: winterdienst.costMonthly });
  }
  if (hms) {
    components.push({ key: "hms", label: "Hausmeisterservice", hoursMonthly: hms.laborHoursMonthly, priceMonthly: hms.revenueMonthly, costMonthly: hms.costMonthly });
  }

  const exRevenue = (winterdienst?.revenueMonthly ?? 0) + (hms?.revenueMonthly ?? 0);
  const exCost = (winterdienst?.costMonthly ?? 0) + (hms?.costMonthly ?? 0);
  const exLaborCost = (winterdienst?.laborCostMonthly ?? 0) + (hms?.laborCostMonthly ?? 0);
  const priceMonthly = cleaning.cost + exRevenue;
  const costMonthly = cleaningCostMonthly + exCost;
  const contributionMonthly = priceMonthly - costMonthly;

  let winterScenarioDelta: StrategyExtras["winterScenarioDelta"];
  if (winterdienst) {
    const { normal, streng } = winterdienst.scenarios;
    winterScenarioDelta = {
      revenueMonthly: (streng.revenue - normal.revenue) / 12,
      costMonthly: (streng.cost - normal.cost) / 12,
      label: `Strenger Winter (${Math.round(streng.einsaetze)} statt ${Math.round(normal.einsaetze)} Einsätze)`,
    };
  }

  return {
    cleaning, winterdienst, hms, hasModules, cleaningCostMonthly,
    priceMonthly,
    priceAnnual: priceMonthly * 12,
    costMonthly,
    contributionMonthly,
    marginPct: priceMonthly > 0 ? (contributionMonthly / priceMonthly) * 100 : 0,
    laborHoursMonthly: cleaning.hours + (winterdienst?.laborHoursMonthly ?? 0) + (hms?.laborHoursMonthly ?? 0),
    components,
    extras: { revenueMonthly: exRevenue, costMonthly: exCost, laborCostMonthly: exLaborCost, winterScenarioDelta },
  };
}

/* ── Angebotsdarstellung: was ist fest monatlich, was saisonal, was variabel ── */

export interface OfferPresentation {
  /** In jedem Kalendermonat fällig (netto): Reinigung + HMS + Winterdienst bei pauschale_12. */
  fixedMonthly: number;
  winterSeasonInstallment: { amount: number; count: number; months: MonthIndex[] } | null;
  /** pro_einsatz: Bereitschafts-/Vorhaltepauschale je Saisonmonat + Preis je Einsatz. */
  winterPerEinsatz: { pricePerEinsatz: number; fixedFeeMonthly: number; feeCount: number; months: MonthIndex[] } | null;
  /** Nur Pauschale mit Deckelung: Preis je Einsatz über der Deckelung. */
  winterOverage: { capEinsaetze: number; pricePerEinsatz: number } | null;
  /** Nur HMS mit Mehrstunden-Abrechnung und Kontingent: Stundensatz für Mehrstunden. */
  hmsOverageRate: number | null;
  /** Erwarteter Jahreswert netto (= priceAnnual). */
  expectedAnnual: number;
}

export function calcOfferPresentation(t: ObjectTotals, project: Project): OfferPresentation {
  const wd = t.winterdienst;
  const b = wd?.billing;
  const wdFixedMonthly = b && b.mode === "pauschale_12" && b.pauschaleSeason !== null ? b.pauschaleSeason / 12 : 0;
  return {
    fixedMonthly: t.cleaning.cost + (t.hms?.revenueMonthly ?? 0) + wdFixedMonthly,
    winterSeasonInstallment: wd && b && b.mode === "pauschale_saison"
      ? { amount: b.installmentAmount, count: b.installmentCount, months: wd.seasonMonths } : null,
    winterPerEinsatz: wd && b && b.mode === "pro_einsatz"
      ? { pricePerEinsatz: b.pricePerEinsatz, fixedFeeMonthly: b.installmentAmount, feeCount: b.installmentCount, months: wd.seasonMonths } : null,
    winterOverage: b && b.mode !== "pro_einsatz" && b.capEinsaetze !== null
      ? { capEinsaetze: b.capEinsaetze, pricePerEinsatz: b.pricePerEinsatz } : null,
    hmsOverageRate: t.hms && project.hms?.contingentOverageBilled && t.hms.contingentHoursAnnual > 0 ? t.hms.rate : null,
    expectedAnnual: t.priceAnnual,
  };
}
