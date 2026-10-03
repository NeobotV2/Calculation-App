import { describe, it, expect, vi } from "vitest";

// Der Store persistiert über Capacitor/localStorage — im Node-Test durch einen In-Memory-Speicher ersetzt.
vi.mock("@/lib/capacitor-storage", () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: (name: string) => mem.get(name) ?? null,
      setItem: (name: string, value: string) => { mem.set(name, value); },
      removeItem: (name: string) => { mem.delete(name); },
    },
  };
});

import { computeObjectEconomics, isDefaultRateSetting, type EconomicsSettings } from "./object-economics";
import { calcProjectTotals } from "./calc";
import { calcHourlyRate, getDefaultConfig } from "./hourly-rate-calc";
import { calcPriceStrategy, calcSensitivity } from "./price-strategy";
import { calcRiskScore } from "./risk-score";
import { getProjectWarnings, getWarningTypeKey } from "./warnings";
import { evaluateModuleFindings } from "./service-modules/plausibility";
import type { HmsConfig, WinterdienstConfig } from "./service-modules/types";
import { DEMO_PROJECTS, type Project, type Room } from "@/store/use-store";

const makeRoom = (o: Partial<Room> = {}): Room => ({
  id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro",
  area: 100, frequency: "5x_week", typePerformance: 200, ...o,
});
const makeProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z", rooms: [makeRoom()], ...o,
});

const WD_REF: WinterdienstConfig = {
  schemaVersion: 1, enabled: true, region: "mittelgebirge", seasonMonths: [1, 2, 3, 11, 12],
  expectedEinsaetze: 45, clearingSharePct: 50,
  areas: [
    { id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" },
    { id: "a2", label: "Parkplatz", type: "parkplatz", areaM2: 800, method: "maschinell", clear: true, spread: true },
    { id: "a3", label: "Eingangstreppe", type: "treppe", areaM2: 20, method: "manuell", clear: true, spread: true },
  ],
  material: "salz", materialMarkupPct: 20, saltRestricted: false,
  travelMinutesPerEinsatz: 15, documentationMinutesPerEinsatz: 5, seasonSetupHours: 2,
  standbyFeeMonthly: 50, standbyCostMonthly: 25,
  offHoursSharePct: 50, offHoursSurchargePct: 25,
  liabilitySurchargePct: 10, riskProvisionPct: 100,
  machineRatePerHour: 45, machineCostPerHour: 35,
  billingMode: "pauschale_12", clearingWindowHours: 3,
};
const HMS_REF: HmsConfig = {
  schemaVersion: 1, enabled: true, travelMinutesPerVisitDay: 10, materialMarkupPct: 15, contingentOverageBilled: true,
  tasks: [
    { id: "t1", catalogId: "kontrollgang", label: "Kontrollgang", unit: "pauschal", quantity: 1, minutesPerUnit: 30, frequencyPerYear: 52, enabled: true },
    { id: "t5", catalogId: "kleinreparaturen", label: "Kleinreparaturen", unit: "kontingent", quantity: 2, frequencyPerYear: 12, materialCostPerYear: 120, enabled: true },
  ],
};

/** Exakt die bisherigen Einzelaufrufe aus pages/objekte/[id].tsx. */
function legacyEconomics(project: Project, s: EconomicsSettings, actualMonthlyHours?: number) {
  const effectiveRate = project.hourlyRate ?? s.hourlyRate;
  const totals = calcProjectTotals(project, effectiveRate);
  const breakdown = calcHourlyRate(s.hourlyRateConfig);
  const isDefaultRate = s.hourlyRate === 22.50 && JSON.stringify(s.hourlyRateConfig) === JSON.stringify(getDefaultConfig());
  const disabled = new Set(s.disabledWarnings);
  const warnings = getProjectWarnings(project, s.hourlyRate, s.hourlyRateConfig, breakdown, isDefaultRate, s.targetMargin)
    .filter((w) => !disabled.has(getWarningTypeKey(w.id)));
  const strategyInput = {
    monthlyHours: totals.hours,
    area: totals.area,
    effectiveRate,
    vollkosten: breakdown.vollkosten,
    targetMarkupPct: s.targetMargin,
  };
  const strategy = calcPriceStrategy(strategyInput);
  return {
    totals,
    warnings,
    strategy,
    sensitivity: calcSensitivity(strategyInput),
    risk: calcRiskScore({
      project,
      monthlyHours: totals.hours,
      area: totals.area,
      monthlyCost: totals.cost,
      marginPct: strategy.marginPct,
      targetMarginPct: strategy.targetMarginPct,
      usesDefaultRate: isDefaultRate && !project.hourlyRate,
      actualMonthlyHours,
    }),
  };
}

const defaultSettings: EconomicsSettings = {
  hourlyRate: 22.5, hourlyRateConfig: getDefaultConfig(), targetMargin: getDefaultConfig().gewinnmarge, disabledWarnings: [],
};
const customSettings: EconomicsSettings = {
  hourlyRate: 30, hourlyRateConfig: { ...getDefaultConfig(), baseLohn: 14 }, targetMargin: 25, disabledWarnings: ["sanitaer"],
};

const roomOnlyProjects: Project[] = [
  ...DEMO_PROJECTS,
  makeProject(),
  makeProject({ ruestzeit: 15 }),
  makeProject({ ruestzeit: 10, wegezeit: 20, hourlyRate: 18 }),
  makeProject({ hourlyRate: 40, rooms: [makeRoom(), makeRoom({ id: "r2", groupId: "g2", area: 30, typePerformance: 60, soilingLevel: "soiling_heavy" })] }),
  makeProject({ rooms: [makeRoom({ customPerformance: 400 })] }),
  makeProject({ rooms: [] }),
  makeProject({ winterdienst: { ...WD_REF, enabled: false }, hms: { ...HMS_REF, enabled: false } }),
];

describe("computeObjectEconomics — rooms-only objects equal the legacy calls", () => {
  for (const settings of [defaultSettings, customSettings]) {
    for (const p of roomOnlyProjects) {
      it(`${p.id} · ${p.name} · Satz ${settings.hourlyRate}`, () => {
        const legacy = legacyEconomics(p, settings, 42);
        const econ = computeObjectEconomics(p, settings, { actualMonthlyHours: 42 });
        expect(econ.strategy).toEqual(legacy.strategy);
        expect(econ.sensitivity).toEqual(legacy.sensitivity);
        expect(econ.risk).toEqual(legacy.risk);
        expect(econ.warnings).toEqual(legacy.warnings);
        expect(econ.totals.priceMonthly).toBe(legacy.totals.cost);
        expect(econ.totals.cleaning).toEqual(legacy.totals);
        expect(econ.totals.extras).toBeUndefined();
        expect(econ.moduleFindings).toEqual([]);
      });
    }
  }

  it("without actual hours the risk equals the legacy risk too", () => {
    for (const p of DEMO_PROJECTS) {
      expect(computeObjectEconomics(p, defaultSettings).risk).toEqual(legacyEconomics(p, defaultSettings).risk);
    }
  });
});

describe("computeObjectEconomics — rate and settings", () => {
  it("detects the default rate and whether the object uses it", () => {
    const e = computeObjectEconomics(makeProject(), defaultSettings);
    expect(e.isDefaultRate).toBe(true);
    expect(e.usesDefaultRate).toBe(true);
    expect(e.effectiveRate).toBe(22.5);
    const own = computeObjectEconomics(makeProject({ hourlyRate: 31 }), defaultSettings);
    expect(own.usesDefaultRate).toBe(false);
    expect(own.effectiveRate).toBe(31);
    expect(own.rates).toEqual({ rate: 31, vollkosten: own.breakdown.vollkosten });
    expect(isDefaultRateSetting(30, getDefaultConfig())).toBe(false);
  });

  it("accepts a precomputed breakdown", () => {
    const breakdown = { ...calcHourlyRate(getDefaultConfig()), vollkosten: 24 };
    const e = computeObjectEconomics(makeProject(), { ...defaultSettings, hourlyRate: 30 }, { breakdown });
    expect(e.breakdown).toBe(breakdown);
    expect(e.strategyInput.vollkosten).toBe(24);
  });

  it("filters disabled warning types", () => {
    const p = makeProject({ hourlyRate: 10 });
    expect(computeObjectEconomics(p, defaultSettings).warnings.some((w) => w.id === "p1_below_cost")).toBe(true);
    expect(computeObjectEconomics(p, { ...defaultSettings, disabledWarnings: ["below_cost"] }).warnings.some((w) => w.id === "p1_below_cost")).toBe(false);
  });
});

describe("computeObjectEconomics — with modules", () => {
  const settings: EconomicsSettings = { ...defaultSettings, hourlyRate: 30 };
  const breakdown = { ...calcHourlyRate(getDefaultConfig()), vollkosten: 24 };
  const p = makeProject({ ruestzeit: 15, winterdienst: WD_REF, hms: HMS_REF });
  const econ = computeObjectEconomics(p, settings, { breakdown });

  it("passes extras into the strategy and cleaning values into the risk score", () => {
    expect(econ.totals.hasModules).toBe(true);
    expect(econ.strategyInput.extras).toBe(econ.totals.extras);
    expect(econ.strategyInput.monthlyHours).toBe(econ.totals.cleaning.hours);
    expect(econ.strategy.currentPriceMonthly).toBeCloseTo(econ.totals.priceMonthly, 9);
    expect(econ.sensitivity.map((c) => c.key)).toContain("winter_harsh");
    expect(econ.risk.factors.map((f) => f.key)).toContain("wd_harsh_loss");
  });

  it("exposes the unfiltered module findings", () => {
    expect(econ.moduleFindings).toEqual(evaluateModuleFindings(p, econ.totals, econ.strategy.targetMarginPct));
    const filtered = computeObjectEconomics(p, { ...settings, disabledWarnings: ["winterdienst"] }, { breakdown });
    expect(filtered.warnings.some((w) => w.id.startsWith("p1_wd_"))).toBe(false);
    expect(filtered.moduleFindings.some((f) => f.idSuffix.startsWith("wd_"))).toBe(true);
  });
});
