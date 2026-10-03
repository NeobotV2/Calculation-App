import { describe, it, expect } from "vitest";
import { calcObjectTotals, calcOfferPresentation, hasActiveModules } from "./object-totals";
import { calcProjectTotals } from "./calc";
import { calcPriceStrategy, calcSensitivity } from "./price-strategy";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "./service-modules/types";
import type { Project, Room } from "@/store/use-store";

const R: ModuleRates = { rate: 30, vollkosten: 24 };

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
    { id: "t2", catalogId: "rasen_maehen", label: "Rasen mähen", unit: "m2", quantity: 600, perfM2h: 600, frequencyPerYear: 14, seasonMonths: [4, 5, 6, 7, 8, 9, 10], materialCostPerYear: 60, enabled: true },
    { id: "t3", catalogId: "muelltonnen", label: "Mülltonnen", unit: "stueck", quantity: 6, minutesPerUnit: 3, frequencyPerYear: 52, enabled: true },
    { id: "t4", catalogId: "hecke_schneiden", label: "Hecke", unit: "lfm", quantity: 40, minutesPerUnit: 3, frequencyPerYear: 2, seasonMonths: [6, 9], materialCostPerYear: 80, enabled: true },
    { id: "t5", catalogId: "kleinreparaturen", label: "Kleinreparaturen", unit: "kontingent", quantity: 2, frequencyPerYear: 12, materialCostPerYear: 120, enabled: true },
    { id: "t6", catalogId: "laub_entfernen", label: "Laub", unit: "m2", quantity: 400, perfM2h: 400, frequencyPerYear: 6, seasonMonths: [10, 11], materialCostPerYear: 50, enabled: false },
  ],
};

const makeRoom = (o: Partial<Room> = {}): Room => ({
  id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro",
  area: 100, frequency: "5x_week", typePerformance: 200, ...o,
});
const makeProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z", rooms: [makeRoom()], ...o,
});

const base = { monthlyHours: 100, area: 1000, effectiveRate: 30, vollkosten: 24, targetMarkupPct: 10 };
const zeroExtras = { revenueMonthly: 0, costMonthly: 0, laborCostMonthly: 0 };

describe("calcObjectTotals — room-only invariance (T1)", () => {
  const p = makeProject({ ruestzeit: 15 });
  const ot = calcObjectTotals(p, R);
  const legacy = calcProjectTotals(p, 30);

  it("is the identity of calcProjectTotals", () => {
    expect(ot.priceMonthly).toBe(legacy.cost);
    expect(ot.laborHoursMonthly).toBe(legacy.hours);
    expect(ot.priceAnnual).toBe(legacy.annualCost);
    expect(ot.cleaning).toEqual(legacy);
    expect(ot.extras).toBeUndefined();
    expect(ot.hasModules).toBe(false);
    expect(ot.winterdienst).toBeNull();
    expect(ot.hms).toBeNull();
  });

  it("has the hand-computed values", () => {
    expect(ot.priceMonthly).toBeCloseTo(487.575, 6);
    expect(ot.costMonthly).toBeCloseTo(390.06, 6);
    expect(ot.contributionMonthly).toBeCloseTo(97.515, 6);
    expect(ot.marginPct).toBeCloseTo(20, 6);
    expect(ot.priceAnnual).toBeCloseTo(5850.9, 6);
  });

  it("splits rooms and Rüst/Wege into components", () => {
    expect(ot.components.map((c) => c.key)).toEqual(["reinigung", "ruest_wege"]);
    expect(ot.components[0].hoursMonthly).toBeCloseTo(10.835, 6);
    expect(ot.components[0].priceMonthly).toBeCloseTo(325.05, 6);
    expect(ot.components[0].costMonthly).toBeCloseTo(260.04, 6);
    expect(ot.components[1].hoursMonthly).toBeCloseTo(5.4175, 6);
    expect(ot.components[1].priceMonthly).toBeCloseTo(162.525, 6);
    expect(ot.components[1].costMonthly).toBeCloseTo(130.02, 6);
  });

  it("paused modules change nothing", () => {
    const off = calcObjectTotals(makeProject({ ruestzeit: 15, winterdienst: { ...WD_REF, enabled: false }, hms: { ...HMS_REF, enabled: false } }), R);
    expect(off).toEqual(ot);
    expect(hasActiveModules(makeProject({ winterdienst: { ...WD_REF, enabled: false } }))).toBe(false);
    expect(hasActiveModules(makeProject({ hms: HMS_REF }))).toBe(true);
    expect(hasActiveModules(undefined)).toBe(false);
  });

  it("an empty project has no components", () => {
    expect(calcObjectTotals(makeProject({ rooms: [] }), R).components).toEqual([]);
    expect(calcObjectTotals(undefined, R).priceMonthly).toBe(0);
  });

  it("strategy and sensitivity are unchanged without effective extras", () => {
    expect(calcPriceStrategy({ ...base, extras: undefined })).toEqual(calcPriceStrategy(base));
    expect(calcPriceStrategy({ ...base, extras: zeroExtras })).toEqual(calcPriceStrategy(base));
    expect(calcSensitivity({ ...base, extras: zeroExtras })).toEqual(calcSensitivity(base));
    expect(calcPriceStrategy({ ...base, monthlyHours: 0, extras: zeroExtras })).toEqual(calcPriceStrategy({ ...base, monthlyHours: 0 }));
    expect(calcSensitivity({ ...base, monthlyHours: 0, extras: zeroExtras })).toEqual(calcSensitivity({ ...base, monthlyHours: 0 }));
  });
});

describe("calcObjectTotals — aggregate with modules (T8)", () => {
  const pAll = makeProject({ ruestzeit: 15, winterdienst: WD_REF, hms: HMS_REF });
  const ot = calcObjectTotals(pAll, R);

  it("adds module revenue and cost on an average-month basis", () => {
    expect(ot.hasModules).toBe(true);
    expect(ot.priceMonthly).toBeCloseTo(1051.417292, 6);
    expect(ot.costMonthly).toBeCloseTo(840.848542, 6);
    expect(ot.contributionMonthly).toBeCloseTo(210.56875, 6);
    expect(ot.marginPct).toBeCloseTo(20.027134, 6);
    expect(ot.laborHoursMonthly).toBeCloseTo(29.433056, 6);
    expect(ot.priceAnnual).toBeCloseTo(12617.0075, 6);
    expect(ot.priceAnnual).toBe(ot.priceMonthly * 12);
  });

  it("exposes the strategy extras", () => {
    const ex = ot.extras!;
    expect(ex.revenueMonthly).toBeCloseTo(563.842292, 6);
    expect(ex.costMonthly).toBeCloseTo(450.788542, 6);
    expect(ex.laborCostMonthly).toBeCloseTo(332.308333, 6);
    expect(ex.winterScenarioDelta!.revenueMonthly).toBeCloseTo(0, 6);
    expect(ex.winterScenarioDelta!.costMonthly).toBeCloseTo(153.447917, 6);
    expect(ex.winterScenarioDelta!.label).toBe("Strenger Winter (75 statt 45 Einsätze)");
  });

  it("components sum to the monthly price (invariant 5)", () => {
    expect(ot.components.map((c) => c.key)).toEqual(["reinigung", "ruest_wege", "winterdienst", "hms"]);
    expect(Math.abs(ot.components.reduce((s, c) => s + c.priceMonthly, 0) - ot.priceMonthly)).toBeLessThan(1e-9);
  });

  it("offer presentation: pauschale_12 is part of the fixed monthly amount", () => {
    const op = calcOfferPresentation(ot, pAll);
    expect(op.fixedMonthly).toBeCloseTo(1051.417292, 6);
    expect(op.hmsOverageRate).toBe(30);
    expect(op.winterSeasonInstallment).toBeNull();
    expect(op.winterPerEinsatz).toBeNull();
    expect(op.winterOverage).toBeNull();
    expect(op.expectedAnnual).toBeCloseTo(12617.0075, 6);
  });

  it("offer presentation: pauschale_saison is billed in season instalments", () => {
    const pS = makeProject({ ruestzeit: 15, winterdienst: { ...WD_REF, billingMode: "pauschale_saison" }, hms: HMS_REF });
    const op = calcOfferPresentation(calcObjectTotals(pS, R), pS);
    expect(op.fixedMonthly).toBeCloseTo(743.158333, 6);
    expect(op.winterSeasonInstallment!.amount).toBeCloseTo(739.8215, 6);
    expect(op.winterSeasonInstallment!.count).toBe(5);
    expect(op.fixedMonthly * 12 + op.winterSeasonInstallment!.amount * 5).toBeCloseTo(12617.0075, 6);
  });

  it("offer presentation: pro Einsatz and cap", () => {
    const pP = makeProject({ winterdienst: { ...WD_REF, billingMode: "pro_einsatz" } });
    const opP = calcOfferPresentation(calcObjectTotals(pP, R), pP);
    expect(opP.winterPerEinsatz!.pricePerEinsatz).toBeCloseTo(75.3135, 6);
    expect(opP.winterPerEinsatz!.fixedFeeMonthly).toBeCloseTo(62, 6);
    const pC = makeProject({ winterdienst: { ...WD_REF, capEinsaetze: 30 } });
    const opC = calcOfferPresentation(calcObjectTotals(pC, R), pC);
    expect(opC.winterOverage).toEqual({ capEinsaetze: 30, pricePerEinsatz: expect.closeTo(75.3135, 6) });
  });

  it("room-only presentation equals the cleaning price", () => {
    const p = makeProject({ ruestzeit: 15 });
    const op = calcOfferPresentation(calcObjectTotals(p, R), p);
    expect(op.fixedMonthly).toBe(calcProjectTotals(p, 30).cost);
    expect(op.hmsOverageRate).toBeNull();
  });
});

describe("calcObjectTotals — degenerate modules (T15)", () => {
  it("an enabled HMS without tasks yields zero extras and the legacy strategy", () => {
    const p = makeProject({ hms: { ...HMS_REF, tasks: [] } });
    const ot = calcObjectTotals(p, R);
    expect(ot.extras).toEqual({ revenueMonthly: 0, costMonthly: 0, laborCostMonthly: 0, winterScenarioDelta: undefined });
    const input = { monthlyHours: ot.cleaning.hours, area: 100, effectiveRate: 30, vollkosten: 24, targetMarkupPct: 10 };
    expect(calcPriceStrategy({ ...input, extras: ot.extras })).toEqual(calcPriceStrategy(input));
  });

  it("a Winterdienst-only object has no cleaning component", () => {
    const ot = calcObjectTotals(makeProject({ rooms: [], winterdienst: WD_REF }), R);
    expect(ot.components.map((c) => c.key)).toEqual(["winterdienst"]);
    expect(ot.priceMonthly).toBeCloseTo(308.258958, 6);
  });
});
