import { describe, it, expect } from "vitest";
import {
  FREQUENCY_FACTORS,
  getEffectivePerformance,
  calcRoom,
  calcProjectTotals,
} from "./calc";
import type { Room, Project } from "@/store/use-store";

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
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
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Objekt",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    rooms: [],
    ...overrides,
  };
}

describe("getEffectivePerformance", () => {
  it("returns the type performance when no surcharges are set", () => {
    expect(getEffectivePerformance(makeRoom())).toBe(200);
  });

  it("prefers a custom performance over the type performance", () => {
    expect(getEffectivePerformance(makeRoom({ customPerformance: 150 }))).toBe(150);
  });

  it("applies a positive surcharge modifier (light soiling speeds cleaning up)", () => {
    // soiling_light => +0.2 => 200 * 1.2
    expect(getEffectivePerformance(makeRoom({ soilingLevel: "soiling_light" }))).toBeCloseTo(240, 6);
  });

  it("applies a negative surcharge modifier (heavy soiling slows cleaning down)", () => {
    // soiling_heavy => -0.25 => 200 * 0.75
    expect(getEffectivePerformance(makeRoom({ soilingLevel: "soiling_heavy" }))).toBeCloseTo(150, 6);
  });
});

describe("calcRoom", () => {
  it("computes monthly hours and cost from area, performance and frequency", () => {
    const r = calcRoom(makeRoom({ area: 100, typePerformance: 200, frequency: "5x_week" }), 30);
    // 100/200 = 0.5h per cleaning; 0.5 * 21.67 = 10.835 h/month
    expect(r.timePerCleaning).toBeCloseTo(0.5, 6);
    expect(r.monthlyHours).toBeCloseTo(0.5 * FREQUENCY_FACTORS["5x_week"], 6);
    expect(r.monthlyCost).toBeCloseTo(r.monthlyHours * 30, 6);
    expect(r.annualCost).toBeCloseTo(r.monthlyCost * 12, 6);
    expect(r.effectivePerformance).toBe(200);
  });

  it("never divides by zero when performance is zero", () => {
    const r = calcRoom(makeRoom({ typePerformance: 0, customPerformance: undefined }), 30);
    expect(r.timePerCleaning).toBe(0);
    expect(r.monthlyHours).toBe(0);
    expect(r.monthlyCost).toBe(0);
  });
});

describe("calcProjectTotals", () => {
  it("returns zeroed totals for an undefined project", () => {
    const t = calcProjectTotals(undefined, 30);
    expect(t).toMatchObject({ area: 0, hours: 0, cost: 0, count: 0, pricePerSqm: 0 });
  });

  it("returns zeroed totals (no NaN) for a project with no rooms", () => {
    const t = calcProjectTotals(makeProject({ ruestzeit: 15, wegezeit: 10 }), 30);
    expect(t.hours).toBe(0);
    expect(t.cost).toBe(0);
    expect(t.pricePerSqm).toBe(0);
    expect(Number.isNaN(t.cost)).toBe(false);
  });

  it("adds Rüstzeit/Wegezeit based on the most frequent interval and recomputes cost", () => {
    const project = makeProject({
      ruestzeit: 15,
      wegezeit: 0,
      rooms: [makeRoom({ area: 100, typePerformance: 200, frequency: "5x_week" })],
    });
    const t = calcProjectTotals(project, 30);

    const roomHours = 0.5 * FREQUENCY_FACTORS["5x_week"];
    const visits = FREQUENCY_FACTORS["5x_week"];
    const ruestHours = (15 / 60) * visits;
    const expectedHours = roomHours + ruestHours;

    expect(t.area).toBe(100);
    expect(t.count).toBe(1);
    expect(t.ruestzeitHours).toBeCloseTo(ruestHours, 6);
    expect(t.wegezeitHours).toBe(0);
    expect(t.hours).toBeCloseTo(expectedHours, 6);
    expect(t.cost).toBeCloseTo(expectedHours * 30, 6);
    expect(t.pricePerSqm).toBeCloseTo((expectedHours * 30) / 100, 6);
  });

  it("uses the highest frequency factor across rooms for setup-time visits", () => {
    const project = makeProject({
      ruestzeit: 60,
      rooms: [
        makeRoom({ id: "a", frequency: "1x_week", area: 50 }),
        makeRoom({ id: "b", frequency: "5x_week", area: 50 }),
      ],
    });
    const t = calcProjectTotals(project, 25);
    // 60 min = 1h per visit * highest factor (5x_week = 21.67)
    expect(t.ruestzeitHours).toBeCloseTo(FREQUENCY_FACTORS["5x_week"], 6);
  });
});
