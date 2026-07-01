import { describe, it, expect } from "vitest";
import { calcTenderScenarios } from "./tender-calc";
import { FREQUENCY_FACTORS } from "./calc";
import type { Room } from "@/store/use-store";

const room = (overrides: Partial<Omit<Room, "id">> = {}): Omit<Room, "id"> => ({
  name: "Büro",
  typeId: "t1",
  typeName: "Büro",
  groupId: "g1",
  groupName: "Büro & Verwaltung",
  area: 100,
  frequency: "5x_week",
  typePerformance: 200,
  ...overrides,
});

describe("calcTenderScenarios", () => {
  it("computes the mid scenario exactly like the base engine", () => {
    const res = calcTenderScenarios([room()], 30);
    const expectedHours = (100 / 200) * FREQUENCY_FACTORS["5x_week"];
    expect(res.scenarios.mid.hours).toBeCloseTo(expectedHours, 6);
    expect(res.scenarios.mid.cost).toBeCloseTo(expectedHours * 30, 6);
    expect(res.scenarios.mid.annualCost).toBeCloseTo(expectedHours * 30 * 12, 6);
    expect(res.area).toBe(100);
    expect(res.count).toBe(1);
  });

  it("orders the range correctly: min < mid < max", () => {
    const res = calcTenderScenarios([room(), room({ area: 50, frequency: "2x_week" })], 28);
    expect(res.scenarios.min.cost).toBeLessThan(res.scenarios.mid.cost);
    expect(res.scenarios.mid.cost).toBeLessThan(res.scenarios.max.cost);
    expect(res.scenarios.min.hours).toBeLessThan(res.scenarios.max.hours);
  });

  it("applies the configured spreads (perf ±20 %, rate ±10 %)", () => {
    const res = calcTenderScenarios([room()], 30, { perfSpreadPct: 20, rateSpreadPct: 10 });
    const midHours = res.scenarios.mid.hours;
    expect(res.scenarios.min.hours).toBeCloseTo(midHours / 1.2, 6);
    expect(res.scenarios.max.hours).toBeCloseTo(midHours / 0.8, 6);
    expect(res.scenarios.min.rate).toBeCloseTo(27, 6);
    expect(res.scenarios.max.rate).toBeCloseTo(33, 6);
  });

  it("clamps unreasonable spreads and survives empty input", () => {
    const res = calcTenderScenarios([], 30, { perfSpreadPct: 999, rateSpreadPct: -5 });
    expect(res.count).toBe(0);
    expect(res.scenarios.mid.cost).toBe(0);
    expect(res.scenarios.min.pricePerSqm).toBe(0);
    // 999 % → auf 50 % begrenzt; Höchstwert-Faktor bleibt > 0
    expect(res.scenarios.max.perfFactor).toBeGreaterThan(0);
  });

  it("respects surcharges via the effective performance", () => {
    const plain = calcTenderScenarios([room()], 30);
    const soiled = calcTenderScenarios([room({ soilingLevel: "soiling_heavy" })], 30);
    // Stärkere Verschmutzung ⇒ geringere Leistung ⇒ mehr Stunden/Kosten
    expect(soiled.scenarios.mid.hours).toBeGreaterThan(plain.scenarios.mid.hours);
  });
});
