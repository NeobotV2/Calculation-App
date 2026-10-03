import { SPREAD_MATERIALS, WINTER_AREA_TYPES, WINTER_REGION_PRESETS } from "@/data/winterdienst";
import { nn, normalizeMonths, pos, rateOf, share } from "./util";
import type {
  ClearingMethod, ModuleRates, MonthIndex, SpreadMaterial, WeatherScenarioKey, WinterArea, WinterAreaResult, WinterBilling,
  WinterCost, WinterdienstConfig, WinterdienstResult, WinterPerEinsatz, WinterRegion, WinterRevenue, WinterScenario,
} from "./types";

const areaType = (a: WinterArea) => WINTER_AREA_TYPES[a.type] ?? WINTER_AREA_TYPES.sonstige;

export function effectiveMethod(a: WinterArea): ClearingMethod {
  return areaType(a).machineAllowed && a.method === "maschinell" ? "maschinell" : "manuell";
}

export function clearingPerf(a: WinterArea): number {
  return pos(a.clearingPerfM2h) || areaType(a).clearingPerfM2h[effectiveMethod(a)];
}

export function spreadingPerf(a: WinterArea): number {
  return pos(a.spreadingPerfM2h) || areaType(a).spreadingPerfM2h[effectiveMethod(a)];
}

export function materialParams(cfg: WinterdienstConfig, material: SpreadMaterial): { gramsPerM2: number; pricePerKg: number } {
  const base = SPREAD_MATERIALS[material] ?? SPREAD_MATERIALS.splitt;
  const o = cfg.materialOverrides?.[material];
  return {
    gramsPerM2: nn(o?.gramsPerM2, base.gramsPerM2),
    pricePerKg: nn(o?.pricePerKg, base.pricePerKg),
  };
}

/** Wetter-Szenarien relativ zur erwarteten Einsatzzahl: min/typ, 1, max/typ der Region. */
export function weatherFactors(region: WinterRegion): Record<WeatherScenarioKey, number> {
  const p = WINTER_REGION_PRESETS[region] ?? WINTER_REGION_PRESETS.flachland;
  return { mild: p.einsaetzeMin / p.einsaetzeTyp, normal: 1, streng: p.einsaetzeMax / p.einsaetzeTyp };
}

export function calcWinterdienst(cfg: WinterdienstConfig, rates: ModuleRates): WinterdienstResult {
  const rate = pos(cfg.rateOverride) || nn(rates.rate);
  const vollkosten = pos(cfg.vollkostenOverride) || nn(rates.vollkosten);
  const E = nn(cfg.expectedEinsaetze);
  const c = share(cfg.clearingSharePct);
  const seasonMonths = normalizeMonths(cfg.seasonMonths);
  const n = seasonMonths.length;

  /* ── je Fläche ── */
  let clearingHours = 0, spreadingHours = 0, machineClear = 0, machineSpread = 0, materialKg = 0, materialCost = 0;
  const areas: WinterAreaResult[] = cfg.areas.map((a) => {
    const m2 = nn(a.areaM2);
    const method = effectiveMethod(a);
    const pc = clearingPerf(a);
    const ps = spreadingPerf(a);
    const ch = a.clear && pc > 0 ? m2 / pc : 0;
    const sh = a.spread && ps > 0 ? m2 / ps : 0;
    const mp = materialParams(cfg, a.material ?? cfg.material);
    const kg = a.spread ? (m2 * mp.gramsPerM2) / 1000 : 0;
    const cost = kg * mp.pricePerKg;
    clearingHours += ch;
    spreadingHours += sh;
    if (method === "maschinell") { machineClear += ch; machineSpread += sh; }
    materialKg += kg;
    materialCost += cost;
    return { areaId: a.id, effectiveMethod: method, clearingPerfM2h: pc, spreadingPerfM2h: ps,
      clearingHours: ch, spreadingHours: sh, materialKg: kg, materialCost: cost };
  });

  /* ── je Einsatz (Erwartungswert) ── */
  const fixedHours = (nn(cfg.travelMinutesPerEinsatz) + nn(cfg.documentationMinutesPerEinsatz)) / 60;
  const laborHours = c * clearingHours + spreadingHours + fixedHours;            // W4
  const machineHours = c * machineClear + machineSpread;                         // W5
  const s = share(cfg.offHoursSharePct);
  const fRev = 1 + s * rateOf(cfg.offHoursSurchargePct);                         // W7
  const fCost = 1 + s * rateOf(cfg.offHoursWageSurchargePct ?? cfg.offHoursSurchargePct);
  const L = rateOf(cfg.liabilitySurchargePct);
  const rho = share(cfg.riskProvisionPct);
  const k = rateOf(cfg.materialMarkupPct);
  const MR = nn(cfg.machineRatePerHour);
  const MK = nn(cfg.machineCostPerHour);
  const laborCostPerHour = vollkosten * fCost;

  const serviceRevenue = laborHours * rate * fRev + machineHours * MR;           // W8
  const perEinsatz: WinterPerEinsatz = {
    clearingHours, spreadingHours, fixedHours, laborHours, machineHours, materialKg, materialCost,
    serviceRevenue,
    revenue: serviceRevenue * (1 + L) + materialCost * (1 + k),                   // W9  U_E
    cost: laborHours * laborCostPerHour + machineHours * MK + materialCost + rho * L * serviceRevenue, // W10 K_E
  };

  /* ── Saison ── */
  const S = nn(cfg.seasonSetupHours);
  const standbyRevenue = nn(cfg.standbyFeeMonthly) * n;
  const standbyCost = nn(cfg.standbyCostMonthly) * n;
  const fixedRevenueSeason = standbyRevenue + S * rate;                          // W11
  const fixedCostSeason = standbyCost + S * vollkosten;                          // W12

  const revLabor = E * laborHours * rate * fRev + S * rate;
  const revMachine = E * machineHours * MR;
  const revLiability = E * serviceRevenue * L;
  const revMaterial = E * materialCost * (1 + k);
  const revenue: WinterRevenue = {
    labor: revLabor, machine: revMachine, liability: revLiability, material: revMaterial, standby: standbyRevenue,
    total: revLabor + revMachine + revLiability + revMaterial + standbyRevenue,
  };
  const costLabor = E * laborHours * laborCostPerHour + S * vollkosten;
  const costMachine = E * machineHours * MK;
  const costMaterial = E * materialCost;
  const riskProvision = revLiability * rho;
  const cost: WinterCost = {
    labor: costLabor, machine: costMachine, material: costMaterial, standby: standbyCost, riskProvision,
    total: costLabor + costMachine + costMaterial + standbyCost + riskProvision,
  };
  const contributionSeason = revenue.total - cost.total;
  const laborHoursSeason = E * laborHours + S;

  /* ── Abrechnung ── */
  const vr = perEinsatz.revenue;
  const vc = perEinsatz.cost;
  const isPauschale = cfg.billingMode !== "pro_einsatz";
  const cap = isPauschale && typeof cfg.capEinsaetze === "number" && Number.isFinite(cfg.capEinsaetze) && cfg.capEinsaetze >= 0
    ? cfg.capEinsaetze : null;
  const pauschaleSeason = isPauschale ? (cap !== null ? Math.min(cap, E) : E) * vr + fixedRevenueSeason : null; // W16
  const seasonRates = n > 0 ? n : 12;
  const installmentCount = cfg.billingMode === "pauschale_12" ? 12 : seasonRates;
  const installmentAmount = pauschaleSeason !== null ? pauschaleSeason / installmentCount : fixedRevenueSeason / installmentCount;

  const revenueAt = (e: number) => (pauschaleSeason !== null
    ? pauschaleSeason + (cap !== null ? Math.max(0, e - cap) * vr : 0)
    : fixedRevenueSeason + e * vr);                                               // W18
  const costAt = (e: number) => fixedCostSeason + e * vc;

  let lossAboveEinsaetze: number | null = null;
  let lossBelowEinsaetze: number | null = null;
  if (pauschaleSeason !== null) {                                                // W21
    const k0 = vc > 0 ? (pauschaleSeason - fixedCostSeason) / vc : Infinity;
    if (cap === null || k0 <= cap) lossAboveEinsaetze = Number.isFinite(k0) ? Math.max(0, k0) : null;
    else if (vr < vc) lossAboveEinsaetze = cap + (pauschaleSeason - fixedCostSeason - cap * vc) / (vc - vr);
  } else {
    const d = vr - vc;
    const f = fixedRevenueSeason - fixedCostSeason;
    if (d > 0) lossBelowEinsaetze = f >= 0 ? 0 : -f / d;
    else if (d < 0) lossAboveEinsaetze = Math.max(0, f / -d);
    else lossAboveEinsaetze = f < 0 ? 0 : null;
  }

  const billing: WinterBilling = {
    mode: cfg.billingMode, pauschaleSeason, installmentAmount, installmentCount,
    pricePerEinsatz: vr, capEinsaetze: cap, lossAboveEinsaetze, lossBelowEinsaetze,
    expectedSeasonTotal: revenue.total,
  };

  /* ── Wetter-Szenarien ── */
  const factors = weatherFactors(cfg.region);
  const scenario = (key: WeatherScenarioKey): WinterScenario => {
    const e = E * factors[key];
    const r = revenueAt(e);
    const kk = costAt(e);
    return { key, einsaetze: e, revenue: r, cost: kk, contribution: r - kk, marginPct: r > 0 ? ((r - kk) / r) * 100 : 0 };
  };

  const window = nn(cfg.clearingWindowHours);
  const monthlyLaborHours = Array.from({ length: 12 }, (_, i) =>
    n > 0 ? (seasonMonths.includes((i + 1) as MonthIndex) ? laborHoursSeason / n : 0) : laborHoursSeason / 12);

  return {
    rate, vollkosten, laborCostPerHour, seasonMonths, seasonMonthsCount: n, einsaetze: E,
    areas, areaM2Total: cfg.areas.reduce((sum, a) => sum + nn(a.areaM2), 0),
    perEinsatz, fixedRevenueSeason, fixedCostSeason,
    laborHoursSeason, machineHoursSeason: E * machineHours, materialKgSeason: E * materialKg,
    revenue, cost, contributionSeason,
    marginPct: revenue.total > 0 ? (contributionSeason / revenue.total) * 100 : 0,
    revenueMonthly: revenue.total / 12,
    costMonthly: cost.total / 12,
    laborCostMonthly: costLabor / 12,
    laborHoursMonthly: laborHoursSeason / 12,
    billing,
    scenarios: { mild: scenario("mild"), normal: scenario("normal"), streng: scenario("streng") },
    crewAtPeak: window > 0 ? (clearingHours + spreadingHours) / window : 0,
    monthlyLaborHours,
  };
}
