import { describe, it, expect } from "vitest";
import { calcPriceStrategy, calcSensitivity, markupToRevenueMargin } from "./price-strategy";
import { classifyPricePerSqm, estimateFte, BENCHMARKS } from "@/data/benchmarks";

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
