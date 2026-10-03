import { nn, normalizeMonths, pos, rateOf } from "./util";
import type { HmsConfig, HmsResult, HmsTask, HmsTaskResult, ModuleRates, MonthIndex } from "./types";

/** Stunden je Ausführung (kontingent: Stunden je Abrufperiode). H1 */
export function hmsHoursPerEinsatz(t: HmsTask): number {
  const q = nn(t.quantity);
  switch (t.unit) {
    case "pauschal":
    case "stueck":
    case "lfm":
      return (q * nn(t.minutesPerUnit)) / 60;
    case "m2":
      return pos(t.perfM2h) > 0 ? q / pos(t.perfM2h) : 0;
    case "kontingent":
      return q;
    default:
      return 0;
  }
}

export function calcHms(cfg: HmsConfig, rates: ModuleRates): HmsResult {
  const rate = pos(cfg.rateOverride) || nn(rates.rate);
  const vollkosten = pos(cfg.vollkostenOverride) || nn(rates.vollkosten);
  const k = rateOf(cfg.materialMarkupPct);

  const monthlyLaborHours = new Array<number>(12).fill(0);
  let taskHoursAnnual = 0;
  let contingentHoursAnnual = 0;
  let materialCostAnnual = 0;
  let maxFrequency = 0;

  const tasks: HmsTaskResult[] = cfg.tasks.filter((t) => t.enabled).map((t) => {
    const hoursPerEinsatz = hmsHoursPerEinsatz(t);
    const frequency = nn(t.frequencyPerYear);
    const hoursAnnual = hoursPerEinsatz * frequency;                               // H2
    const material = nn(t.materialCostPerYear);
    taskHoursAnnual += hoursAnnual;
    materialCostAnnual += material;
    if (t.unit === "kontingent") contingentHoursAnnual += hoursAnnual;
    else if (hoursAnnual > 0) maxFrequency = Math.max(maxFrequency, frequency);

    const season = normalizeMonths(t.seasonMonths);                               // H8
    for (let i = 0; i < 12; i++) {
      monthlyLaborHours[i] += season.length > 0
        ? (season.includes((i + 1) as MonthIndex) ? hoursAnnual / season.length : 0)
        : hoursAnnual / 12;
    }
    return {
      id: t.id, label: t.label, unit: t.unit, hoursPerEinsatz, hoursAnnual, materialCostAnnual: material,
      revenueAnnual: hoursAnnual * rate + material * (1 + k),
      costAnnual: hoursAnnual * vollkosten + material,
    };
  });

  const visitDaysPerYear = typeof cfg.visitDaysPerYear === "number" && Number.isFinite(cfg.visitDaysPerYear) && cfg.visitDaysPerYear >= 0
    ? cfg.visitDaysPerYear : maxFrequency;                                       // H3
  const travelHoursAnnual = (visitDaysPerYear * nn(cfg.travelMinutesPerVisitDay)) / 60; // H4
  for (let i = 0; i < 12; i++) monthlyLaborHours[i] += travelHoursAnnual / 12;

  const laborHoursAnnual = taskHoursAnnual + travelHoursAnnual;                  // H5
  const materialRevenueAnnual = materialCostAnnual * (1 + k);
  const revenueAnnual = laborHoursAnnual * rate + materialRevenueAnnual;         // H6
  const costAnnual = laborHoursAnnual * vollkosten + materialCostAnnual;
  const contributionAnnual = revenueAnnual - costAnnual;

  return {
    rate, vollkosten, tasks, taskHoursAnnual, visitDaysPerYear, travelHoursAnnual, laborHoursAnnual,
    contingentHoursAnnual, materialCostAnnual, materialRevenueAnnual, revenueAnnual, costAnnual, contributionAnnual,
    marginPct: revenueAnnual > 0 ? (contributionAnnual / revenueAnnual) * 100 : 0,
    revenueMonthly: revenueAnnual / 12,                                           // H7
    costMonthly: costAnnual / 12,
    laborCostMonthly: (laborHoursAnnual * vollkosten) / 12,
    laborHoursMonthly: laborHoursAnnual / 12,
    contingentHoursMonthly: contingentHoursAnnual / 12,
    monthlyLaborHours,
    peakMonthHours: Math.max(...monthlyLaborHours),
  };
}
