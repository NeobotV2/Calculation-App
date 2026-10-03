import { VERDICT_BESSER_THRESHOLD, VERDICT_IM_PLAN_THRESHOLD, type NachkalkulationVerdict } from "@/lib/nachkalkulation";
import { nn } from "./util";
import type { HmsResult, WinterdienstResult } from "./types";

export interface WinterNachkalkulationResult {
  plannedEinsaetze: number;
  actualEinsaetze: number;
  /** (Ist − Plan) / Plan × 100 — Wetterabweichung, KEIN Kalkulationsfehler. */
  einsaetzeDeviationPct: number;
  plannedHoursPerEinsatz: number;
  actualHoursPerEinsatz: number;
  /** (Ist-h/Einsatz ÷ Plan-h/Einsatz − 1) × 100 — Leistungsabweichung. */
  productivityDeviationPct: number;
  revenueActual: number;
  costActual: number;
  contributionPlanned: number;
  contributionActual: number;
  actualMarginPct: number;
  /** Überleitung: contributionPlanned + weather + productivity + material = contributionActual. */
  bridge: { weather: number; productivity: number; material: number };
  /** Urteil über die Leistung je Einsatz (Schwellen wie Raum-Nachkalkulation). */
  verdict: NachkalkulationVerdict;
}

const opt = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);

const verdictOf = (ratio: number): NachkalkulationVerdict =>
  ratio < VERDICT_BESSER_THRESHOLD ? "besser" : ratio <= VERDICT_IM_PLAN_THRESHOLD ? "im_plan" : "schlechter";

/** N1–N7: Saisonvergleich Winterdienst. actual.laborHours = Ist-Stunden der Einsätze (ohne Saisonvorbereitung). */
export function compareWinterNachkalkulation(
  plan: WinterdienstResult,
  actual: { einsaetze: number; laborHours?: number; materialKg?: number },
): WinterNachkalkulationResult {
  const pe = plan.perEinsatz;
  const Ep = plan.einsaetze;
  const Ea = nn(actual.einsaetze);
  const b = plan.billing;

  const revenueActual = b.pauschaleSeason !== null
    ? b.pauschaleSeason + (b.capEinsaetze !== null ? Math.max(0, Ea - b.capEinsaetze) * pe.revenue : 0)
    : plan.fixedRevenueSeason + Ea * pe.revenue;                                         // N1
  const costAtPlannedProductivity = plan.fixedCostSeason + Ea * pe.cost;               // N2

  const expectedHours = Ea * pe.laborHours;
  const hoursActual = opt(actual.laborHours) ?? expectedHours;
  const expectedKg = Ea * pe.materialKg;
  const kgActual = opt(actual.materialKg) ?? expectedKg;
  const avgPricePerKg = pe.materialKg > 0 ? pe.materialCost / pe.materialKg : 0;

  const weather = (revenueActual - plan.revenue.total) - (costAtPlannedProductivity - plan.cost.total); // N3
  const productivity = -(hoursActual - expectedHours) * plan.laborCostPerHour;          // N4
  const material = -(kgActual - expectedKg) * avgPricePerKg;                             // N5
  const costActual = costAtPlannedProductivity - productivity - material;
  const contributionActual = revenueActual - costActual;                                 // N6

  const actualHoursPerEinsatz = Ea > 0 ? hoursActual / Ea : 0;
  const ratio = Ea > 0 && pe.laborHours > 0 ? actualHoursPerEinsatz / pe.laborHours : 1;  // N7

  return {
    plannedEinsaetze: Ep,
    actualEinsaetze: Ea,
    einsaetzeDeviationPct: Ep > 0 ? ((Ea - Ep) / Ep) * 100 : 0,
    plannedHoursPerEinsatz: pe.laborHours,
    actualHoursPerEinsatz,
    productivityDeviationPct: (ratio - 1) * 100,
    revenueActual,
    costActual,
    contributionPlanned: plan.contributionSeason,
    contributionActual,
    actualMarginPct: revenueActual > 0 ? (contributionActual / revenueActual) * 100 : 0,
    bridge: { weather, productivity, material },
    verdict: verdictOf(ratio),
  };
}

export interface HmsNachkalkulationResult {
  hoursDeviationPct: number;
  overageHours: number;
  revenueActual: number;
  costActual: number;
  contributionActual: number;
  actualMarginPct: number;
  verdict: NachkalkulationVerdict;
}

/** Jahresvergleich HMS. actual.laborHours = Ist-Stunden inkl. Anfahrt. */
export function compareHmsNachkalkulation(
  plan: HmsResult,
  actual: { laborHours: number; contingentHoursUsed?: number },
  contingentOverageBilled: boolean,
): HmsNachkalkulationResult {
  const hoursActual = nn(actual.laborHours);
  const used = opt(actual.contingentHoursUsed) ?? plan.contingentHoursAnnual;
  const overageHours = Math.max(0, used - plan.contingentHoursAnnual);
  const revenueActual = plan.revenueAnnual + (contingentOverageBilled ? overageHours * plan.rate : 0);
  const costActual = hoursActual * plan.vollkosten + plan.materialCostAnnual;
  const planned = plan.laborHoursAnnual;
  const ratio = planned > 0 ? hoursActual / planned : 1;
  return {
    hoursDeviationPct: planned > 0 ? (ratio - 1) * 100 : 0,
    overageHours,
    revenueActual,
    costActual,
    contributionActual: revenueActual - costActual,
    actualMarginPct: revenueActual > 0 ? ((revenueActual - costActual) / revenueActual) * 100 : 0,
    verdict: verdictOf(ratio),
  };
}
