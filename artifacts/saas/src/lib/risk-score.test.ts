import { describe, it, expect } from "vitest";
import { calcRiskScore, type RiskInput } from "./risk-score";
import type { Project, Room } from "@/store/use-store";
import { calcObjectTotals } from "./object-totals";
import { calcPriceStrategy } from "./price-strategy";
import type { HmsConfig, WinterdienstConfig } from "./service-modules/types";

const room = (overrides: Partial<Room> = {}): Room => ({
  id: "r1",
  name: "Büro",
  typeId: "t1",
  typeName: "Büro",
  groupId: "g1",
  groupName: "Büro",
  area: 100,
  frequency: "5x_week",
  typePerformance: 200,
  ...overrides,
});

const project = (overrides: Partial<Project> = {}): Project => ({
  id: "p1",
  name: "Objekt",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  rooms: [room()],
  ruestzeit: 15,
  ...overrides,
});

const baseInput = (overrides: Partial<RiskInput> = {}): RiskInput => ({
  project: project(),
  monthlyHours: 40,
  area: 100,
  monthlyCost: 1200, // 12 €/m² — weit über Benchmark-Minimum
  marginPct: 15,
  targetMarginPct: 10,
  usesDefaultRate: false,
  ...overrides,
});

describe("calcRiskScore", () => {
  it("scores a healthy calculation as low risk", () => {
    const r = calcRiskScore(baseInput());
    expect(r.level).toBe("niedrig");
    expect(r.score).toBeLessThanOrEqual(30);
  });

  it("flags below-cost calculations heavily", () => {
    const r = calcRiskScore(baseInput({ marginPct: -3 }));
    expect(r.factors.some((f) => f.key === "margin_negative")).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(35);
  });

  it("adds points for missing buffers only with 3+ rooms", () => {
    const threeRooms = project({ ruestzeit: 0, wegezeit: 0, rooms: [room({ id: "a" }), room({ id: "b" }), room({ id: "c" })] });
    const r = calcRiskScore(baseInput({ project: threeRooms }));
    expect(r.factors.some((f) => f.key === "no_buffers")).toBe(true);

    const oneRoom = project({ ruestzeit: 0, wegezeit: 0 });
    const r2 = calcRiskScore(baseInput({ project: oneRoom }));
    expect(r2.factors.some((f) => f.key === "no_buffers")).toBe(false);
  });

  it("detects dangerously low price per m²", () => {
    const r = calcRiskScore(baseInput({ monthlyCost: 50, area: 100 })); // 0,50 €/m²
    expect(r.factors.some((f) => f.key === "price_sqm_low")).toBe(true);
  });

  it("detects optimistic custom performance values", () => {
    const p = project({ rooms: [room({ customPerformance: 400, typePerformance: 200 })] });
    const r = calcRiskScore(baseInput({ project: p }));
    expect(r.factors.some((f) => f.key === "perf_optimistic")).toBe(true);
  });

  it("estimates staffing and flags multi-person objects", () => {
    const r = calcRiskScore(baseInput({ monthlyHours: 300 }));
    expect(r.fte).toBeGreaterThan(2);
    expect(r.factors.some((f) => f.key === "staffing_multi")).toBe(true);
  });

  it("feeds Nachkalkulation actuals back as an evidence-based factor", () => {
    // +12,5 % Mehrstunden → deutliches Risiko
    const heavy = calcRiskScore(baseInput({ monthlyHours: 40, actualMonthlyHours: 45 }));
    expect(heavy.factors.some((f) => f.key === "nachkalk_overrun")).toBe(true);

    // +7,5 % → Hinweis-Stufe
    const light = calcRiskScore(baseInput({ monthlyHours: 40, actualMonthlyHours: 43 }));
    expect(light.factors.some((f) => f.key === "nachkalk_drift")).toBe(true);
    expect(light.factors.some((f) => f.key === "nachkalk_overrun")).toBe(false);

    // Im Plan (+2,5 %) oder besser → kein Faktor
    const ok = calcRiskScore(baseInput({ monthlyHours: 40, actualMonthlyHours: 41 }));
    expect(ok.factors.some((f) => f.key.startsWith("nachkalk"))).toBe(false);
    const none = calcRiskScore(baseInput({ monthlyHours: 40 }));
    expect(none.factors.some((f) => f.key.startsWith("nachkalk"))).toBe(false);
  });

  it("accumulates to high risk and caps at 100", () => {
    const p = project({
      ruestzeit: 0,
      wegezeit: 0,
      rooms: [
        room({ id: "a", customPerformance: 500, typePerformance: 200 }),
        room({ id: "b", area: 0 }),
        room({ id: "c" }),
      ],
    });
    const r = calcRiskScore(
      baseInput({ project: p, marginPct: -5, monthlyCost: 30, monthlyHours: 400, usesDefaultRate: true }),
    );
    expect(r.level).toBe("hoch");
    expect(r.score).toBeLessThanOrEqual(100);
    // Wichtigster Faktor steht oben
    expect(r.factors[0].points).toBeGreaterThanOrEqual(r.factors[r.factors.length - 1].points);
    // Jede Empfehlung ist gefüllt
    expect(r.factors.every((f) => f.recommendation.length > 10)).toBe(true);
  });
});

/* ── Fixtures Leistungsmodule (Kontrakt §14) ── */
const MOD_R = { rate: 30, vollkosten: 24 };
const MOD_WD_REF: WinterdienstConfig = {
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
const MOD_HMS_REF: HmsConfig = {
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
const modProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  rooms: [{ id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro", area: 100, frequency: "5x_week", typePerformance: 200 }],
  ...o,
});
const MOD_P_ALL = modProject({ ruestzeit: 15, winterdienst: MOD_WD_REF, hms: MOD_HMS_REF });

describe("calcRiskScore with service modules (T12)", () => {
  const ot = calcObjectTotals(MOD_P_ALL, MOD_R);
  const strategy = calcPriceStrategy({ monthlyHours: ot.cleaning.hours, area: 100, effectiveRate: 30, vollkosten: 24, targetMarkupPct: 10, extras: ot.extras });
  const modBase: RiskInput = {
    project: MOD_P_ALL, monthlyHours: ot.cleaning.hours, area: 100, monthlyCost: ot.cleaning.cost,
    marginPct: strategy.marginPct, targetMarginPct: strategy.targetMarginPct, usesDefaultRate: false,
  };

  it("(a) module findings with points become factors", () => {
    const r = calcRiskScore({ ...modBase, objectTotals: ot });
    expect([r.score, r.level, r.factors.map((f) => f.key)]).toEqual([4, "niedrig", ["wd_harsh_loss"]]);
  });

  it("(b) without objectTotals the result is the previous one", () => {
    const r = calcRiskScore(modBase);
    expect([r.score, r.factors.length]).toEqual([0, 0]);
  });

  it("(c) Winterdienst risks add up", () => {
    const wdBad: WinterdienstConfig = { ...MOD_WD_REF, billingMode: "pro_einsatz", saltRestricted: true,
      documentationMinutesPerEinsatz: 0, standbyFeeMonthly: 0, liabilitySurchargePct: 0 };
    const pB = modProject({ ruestzeit: 15, winterdienst: wdBad });
    const otB = calcObjectTotals(pB, MOD_R);
    const sB = calcPriceStrategy({ monthlyHours: otB.cleaning.hours, area: 100, effectiveRate: 30, vollkosten: 24, targetMarkupPct: 10, extras: otB.extras });
    const r = calcRiskScore({ ...modBase, project: pB, marginPct: sB.marginPct, objectTotals: otB });
    expect([r.score, r.level, r.factors.map((f) => [f.key, f.points])]).toEqual([36, "mittel",
      [["wd_no_doc", 10], ["wd_salt", 10], ["wd_no_standby", 8], ["wd_liability", 8]]]);
    expect(otB.winterdienst!.revenue.total).toBeCloseTo(3039.3825, 6);
    expect(otB.winterdienst!.cost.total).toBeCloseTo(2550.65, 6);
  });

  it("(d) HMS hours count towards the FTE estimate, Winterdienst hours do not", () => {
    const heavy: HmsConfig = { ...MOD_HMS_REF, tasks: MOD_HMS_REF.tasks.map((t) => (t.id === "t5" ? { ...t, quantity: 30 } : t)) };
    const pH = modProject({ ruestzeit: 15, hms: heavy });
    const otH = calcObjectTotals(pH, MOD_R);
    expect(otH.cleaning.hours + otH.hms!.laborHoursMonthly).toBeCloseTo(51.941389, 6);
    const r = calcRiskScore({ ...modBase, project: pH, objectTotals: otH });
    expect(r.factors.map((f) => f.key).sort()).toEqual(["staffing_parttime"]);
  });

  it("(e) the Nachkalkulation factor keeps cleaning semantics", () => {
    const r = calcRiskScore({ ...modBase, monthlyHours: 60, actualMonthlyHours: 66 });
    expect(r.factors.map((f) => f.key).sort()).toEqual(["nachkalk_drift", "staffing_parttime"]);
  });

  it("paused modules give the legacy result", () => {
    const p = modProject({ ruestzeit: 15, winterdienst: { ...MOD_WD_REF, enabled: false } });
    const otP = calcObjectTotals(p, MOD_R);
    const input = { ...modBase, project: p };
    expect(calcRiskScore({ ...input, objectTotals: otP })).toEqual(calcRiskScore(input));
  });
});
