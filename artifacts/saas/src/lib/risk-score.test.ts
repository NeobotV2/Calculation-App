import { describe, it, expect } from "vitest";
import { calcRiskScore, type RiskInput } from "./risk-score";
import type { Project, Room } from "@/store/use-store";

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
