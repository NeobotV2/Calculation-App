import { describe, it, expect } from "vitest";
import { calcPriceStrategy, calcSensitivity, markupToRevenueMargin } from "./price-strategy";
import { classifyPricePerSqm, estimateFte, BENCHMARKS } from "@/data/benchmarks";
import { activeExtras } from "./price-strategy";
import { calcObjectTotals } from "./object-totals";
import type { HmsConfig, WinterdienstConfig } from "./service-modules/types";
import type { Project } from "@/store/use-store";

const base = {
  monthlyHours: 100,
  area: 1000,
  effectiveRate: 30,
  vollkosten: 24,
  targetMarkupPct: 10,
};

describe("markupToRevenueMargin", () => {
  it("converts a cost markup into the equivalent revenue margin", () => {
    expect(markupToRevenueMargin(10)).toBeCloseTo(100 / 11, 6); // 9,0909 %
    expect(markupToRevenueMargin(0)).toBe(0);
    expect(markupToRevenueMargin(100)).toBeCloseTo(50, 6);
    expect(markupToRevenueMargin(-5)).toBe(0); // geklemmt
  });
});

describe("calcPriceStrategy", () => {
  it("derives prices transparently from hours × rate", () => {
    const s = calcPriceStrategy(base);
    expect(s.currentPriceMonthly).toBeCloseTo(3000, 6);
    expect(s.minPriceMonthly).toBeCloseTo(2400, 6); // rote Linie = Vollkosten
    expect(s.contributionMonthly).toBeCloseTo(600, 6);
    expect(s.negotiationRoomMonthly).toBeCloseTo(600, 6);
    expect(s.breakEvenRate).toBe(24);
  });

  it("target price equals vollkosten × (1 + markup) — consistent with the rate calculator", () => {
    const s = calcPriceStrategy(base);
    expect(s.targetRate).toBeCloseTo(24 * 1.1, 6); // 26,40 €/h
    expect(s.targetPriceMonthly).toBeCloseTo(24 * 1.1 * 100, 4);
    expect(s.targetMarginPct).toBeCloseTo(100 / 11, 6);
  });

  it("an object priced exactly at the configured markup is 'gesund' with zero gap", () => {
    // Genau der Bug aus der adversarialen Prüfung: 10 % Aufschlag ⇒ Satz 26,40.
    const s = calcPriceStrategy({ ...base, effectiveRate: 24 * 1.1 });
    expect(s.status).toBe("gesund");
    expect(s.marginPct).toBeCloseTo(s.targetMarginPct, 9);
    expect(s.targetPriceMonthly).toBeCloseTo(s.currentPriceMonthly, 6);
  });

  it("sets the traffic-light status correctly", () => {
    expect(calcPriceStrategy(base).status).toBe("gesund"); // 20 % > 9,09 % Ziel
    expect(calcPriceStrategy({ ...base, effectiveRate: 25 }).status).toBe("pruefen"); // 4 % < 9,09 %
    expect(calcPriceStrategy({ ...base, effectiveRate: 20 }).status).toBe("kritisch"); // < Vollkosten
  });

  it("returns no market verdict when no area is captured (instead of a false 'kritisch')", () => {
    expect(calcPriceStrategy({ ...base, area: 0 }).priceVerdict).toBeNull();
    expect(calcPriceStrategy({ ...base, monthlyHours: 0 }).priceVerdict).toBeNull();
    expect(calcPriceStrategy(base).priceVerdict).toBe("marktüblich"); // 3.000 €/1.000 m² = 3,0 €/m²
  });

  it("guards zero/degenerate inputs", () => {
    const s = calcPriceStrategy({ ...base, monthlyHours: 0, area: 0, effectiveRate: 0 });
    expect(s.currentPriceMonthly).toBe(0);
    expect(s.marginPct).toBe(0);
    expect(Number.isFinite(s.targetRate)).toBe(true);
  });
});

describe("calcSensitivity", () => {
  it("wage +5 % scales vollkosten linearly", () => {
    const [wage] = calcSensitivity(base);
    // Marge = (30 − 24·1,05)/30 = 16 %
    expect(wage.marginPct).toBeCloseTo(16, 4);
    expect(wage.belowCost).toBe(false);
  });

  it("time +10 % lowers the effective rate per hour", () => {
    const [, time] = calcSensitivity(base);
    // effektiver Satz 30/1,1 = 27,27 → Marge (27,27−24)/27,27 = 12 %
    expect(time.marginPct).toBeCloseTo(12, 1);
  });

  it("price −5 % reduces the rate directly", () => {
    const [, , price] = calcSensitivity(base);
    // Satz 28,5 → Marge (28,5−24)/28,5 ≈ 15,79 %
    expect(price.marginPct).toBeCloseTo(15.789, 2);
  });

  it("flags scenarios that fall below cost", () => {
    const cases = calcSensitivity({ ...base, effectiveRate: 24.5 });
    const wage = cases.find((c) => c.key === "wage_up")!;
    expect(wage.belowCost).toBe(true); // 24·1,05 = 25,2 > 24,5
    expect(wage.marginPct).toBeLessThan(0);
  });
});

describe("benchmarks helpers", () => {
  it("classifies price per m² into the documented bands", () => {
    expect(classifyPricePerSqm(0.5)).toBe("kritisch");
    expect(classifyPricePerSqm(1.0)).toBe("günstig");
    expect(classifyPricePerSqm(2.5)).toBe("marktüblich");
    expect(classifyPricePerSqm(5.0)).toBe("hochwertig");
    expect(classifyPricePerSqm(10)).toBe("auffällig hoch");
  });

  it("estimates FTE from monthly hours", () => {
    expect(estimateFte(BENCHMARKS.hoursPerFteMonth)).toBeCloseTo(1, 6);
    expect(estimateFte(0)).toBe(0);
    expect(estimateFte(-5)).toBe(0);
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

describe("calcPriceStrategy with module extras (T9)", () => {
  const ot = calcObjectTotals(MOD_P_ALL, MOD_R);
  const input = { monthlyHours: ot.cleaning.hours, area: ot.cleaning.area, effectiveRate: 30, vollkosten: 24, targetMarkupPct: 10, extras: ot.extras };

  it("prices the whole package while the €/m² verdict stays about cleaning", () => {
    const s = calcPriceStrategy(input);
    expect(s.currentPriceMonthly).toBeCloseTo(1051.417292, 6);
    expect(s.minPriceMonthly).toBeCloseTo(840.848542, 6);
    expect(s.targetPriceMonthly).toBeCloseTo(924.933396, 6);
    expect(s.contributionMonthly).toBeCloseTo(210.56875, 6);
    expect(s.marginPct).toBeCloseTo(20.027134, 6);
    expect(s.targetRate).toBeCloseTo(26.4, 6);
    expect(s.status).toBe("gesund");
    expect(s.priceVerdict).toBe("hochwertig");
  });

  it("(b) adds extras to price and cost", () => {
    const s = calcPriceStrategy({ ...base, extras: { revenueMonthly: 500, costMonthly: 450, laborCostMonthly: 300 } });
    expect(s.currentPriceMonthly).toBeCloseTo(3500, 6);
    expect(s.minPriceMonthly).toBeCloseTo(2850, 6);
    expect(s.marginPct).toBeCloseTo(18.571429, 6);
    expect(s.targetPriceMonthly).toBeCloseTo(3135, 6);
    expect(s.priceVerdict).toBe("marktüblich");
  });

  it("(c) module cost alone can make the object critical", () => {
    const s = calcPriceStrategy({ ...base, extras: { revenueMonthly: 0, costMonthly: 700, laborCostMonthly: 0 } });
    expect(s.contributionMonthly).toBeCloseTo(-100, 6);
    expect(s.marginPct).toBeCloseTo(-3.333333, 6);
    expect(s.status).toBe("kritisch");
  });

  it("(d) Winterdienst only has no €/m² verdict", () => {
    const otW = calcObjectTotals(modProject({ rooms: [], winterdienst: MOD_WD_REF }), MOD_R);
    const s = calcPriceStrategy({ monthlyHours: otW.cleaning.hours, area: otW.cleaning.area, effectiveRate: 30, vollkosten: 24, targetMarkupPct: 10, extras: otW.extras });
    expect(s.currentPriceMonthly).toBeCloseTo(308.258958, 6);
    expect(s.marginPct).toBeCloseTo(20.654847, 6);
    expect(s.priceVerdict).toBeNull();
  });

  it("keeps the PriceStrategy shape unchanged", () => {
    expect(Object.keys(calcPriceStrategy(input)).sort()).toEqual(Object.keys(calcPriceStrategy(base)).sort());
  });

  it("activeExtras normalises and ignores empty extras", () => {
    expect(activeExtras(undefined)).toBeNull();
    expect(activeExtras({ revenueMonthly: 0, costMonthly: 0, laborCostMonthly: 5 })).toBeNull();
    expect(activeExtras({ revenueMonthly: Number.NaN, costMonthly: 10, laborCostMonthly: 50 })).toEqual({
      revenueMonthly: 0, costMonthly: 10, laborCostMonthly: 10, winterScenarioDelta: undefined,
    });
  });
});

describe("calcSensitivity with module extras (T10)", () => {
  const ot = calcObjectTotals(MOD_P_ALL, MOD_R);
  const input = { monthlyHours: ot.cleaning.hours, area: ot.cleaning.area, effectiveRate: 30, vollkosten: 24, targetMarkupPct: 10, extras: ot.extras };

  it("adds the harsh-winter case and scales wage-dependent module cost", () => {
    const cases = calcSensitivity(input);
    expect(cases.map((c) => c.key)).toEqual(["wage_up", "time_up", "price_down", "winter_harsh"]);
    expect(cases[0].contributionMonthly).toBeCloseTo(174.450333, 6);
    expect(cases[0].marginPct).toBeCloseTo(16.591922, 6);
    expect(cases[1].contributionMonthly).toBeCloseTo(138.331917, 6);
    expect(cases[1].marginPct).toBeCloseTo(13.156709, 6);
    expect(cases[2].contributionMonthly).toBeCloseTo(157.997885, 6);
    expect(cases[2].marginPct).toBeCloseTo(15.818036, 6);
    expect(cases[3].contributionMonthly).toBeCloseTo(57.120833, 6);
    expect(cases[3].marginPct).toBeCloseTo(5.432746, 6);
    expect(cases[3].belowCost).toBe(false);
    expect(cases[3].label).toBe("Strenger Winter (75 statt 45 Einsätze)");
  });

  it("base + extras {500, 450, 300}", () => {
    const cases = calcSensitivity({ ...base, extras: { revenueMonthly: 500, costMonthly: 450, laborCostMonthly: 300 } });
    expect(cases).toHaveLength(3);
    expect(cases[0].contributionMonthly).toBeCloseTo(515, 6);
    expect(cases[0].marginPct).toBeCloseTo(14.714286, 6);
    expect(cases[1].contributionMonthly).toBeCloseTo(380, 6);
    expect(cases[1].marginPct).toBeCloseTo(10.857143, 6);
    expect(cases[2].contributionMonthly).toBeCloseTo(475, 6);
    expect(cases[2].marginPct).toBeCloseTo(14.285714, 6);
  });

  it("is deep-equal to the legacy path without effective extras (T1)", () => {
    const zero = { revenueMonthly: 0, costMonthly: 0, laborCostMonthly: 0 };
    expect(calcSensitivity({ ...base, extras: zero })).toEqual(calcSensitivity(base));
    expect(calcSensitivity({ ...base, extras: undefined })).toEqual(calcSensitivity(base));
    expect(calcPriceStrategy({ ...base, extras: zero })).toEqual(calcPriceStrategy(base));
  });
});
