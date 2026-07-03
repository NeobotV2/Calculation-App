import { describe, it, expect } from "vitest";
import {
  compareNachkalkulation,
  VERDICT_BESSER_THRESHOLD,
  VERDICT_IM_PLAN_THRESHOLD,
  type NachkalkulationInput,
} from "./nachkalkulation";

const input = (overrides: Partial<NachkalkulationInput> = {}): NachkalkulationInput => ({
  plannedHours: 100,
  actualHours: 110,
  monthlyPrice: 3000,
  vollkosten: 24,
  area: 500,
  ...overrides,
});

describe("compareNachkalkulation", () => {
  describe("exact values", () => {
    it("computes the reference case: 100h plan, 110h actual, 3000 € price, 24 € vollkosten", () => {
      const r = compareNachkalkulation(input());
      expect(r.hoursDeviationPct).toBeCloseTo(10, 10);
      expect(r.actualCostMonthly).toBeCloseTo(2640, 10);
      expect(r.actualMarginPct).toBeCloseTo(12, 10);
      expect(r.plannedMarginPct).toBeCloseTo(20, 10);
      expect(r.actualPerfSqmPerHour).toBeCloseTo(500 / 110, 10);
      expect(r.verdict).toBe("schlechter");
    });

    it("computes savings correctly: 90h actual on 100h plan", () => {
      const r = compareNachkalkulation(input({ actualHours: 90 }));
      expect(r.hoursDeviationPct).toBeCloseTo(-10, 10);
      expect(r.actualCostMonthly).toBeCloseTo(2160, 10);
      expect(r.actualMarginPct).toBeCloseTo(28, 10);
      expect(r.plannedMarginPct).toBeCloseTo(20, 10);
      expect(r.verdict).toBe("besser");
    });

    it("reports a negative actual margin when actual costs exceed the fixed price", () => {
      const r = compareNachkalkulation(input({ actualHours: 150 }));
      expect(r.actualCostMonthly).toBeCloseTo(3600, 10);
      expect(r.actualMarginPct).toBeCloseTo(-20, 10);
      expect(r.verdict).toBe("schlechter");
    });

    it("exposes the effective performance as a monthly aggregate (area / actual hours)", () => {
      const r = compareNachkalkulation(input({ actualHours: 100, area: 500 }));
      expect(r.actualPerfSqmPerHour).toBeCloseTo(5, 10);
    });
  });

  describe("verdict thresholds (documented constants)", () => {
    it("uses the documented threshold constants", () => {
      expect(VERDICT_BESSER_THRESHOLD).toBe(0.98);
      expect(VERDICT_IM_PLAN_THRESHOLD).toBe(1.05);
    });

    it("is 'besser' strictly below plan × 0.98", () => {
      expect(compareNachkalkulation(input({ actualHours: 97.9 })).verdict).toBe("besser");
    });

    it("is 'im_plan' exactly at plan × 0.98 (boundary is exclusive for 'besser')", () => {
      expect(compareNachkalkulation(input({ actualHours: 100 * VERDICT_BESSER_THRESHOLD })).verdict).toBe("im_plan");
    });

    it("is 'im_plan' at exactly plan hours", () => {
      const r = compareNachkalkulation(input({ actualHours: 100 }));
      expect(r.hoursDeviationPct).toBe(0);
      expect(r.verdict).toBe("im_plan");
    });

    it("is 'im_plan' exactly at plan × 1.05 (boundary is inclusive)", () => {
      expect(compareNachkalkulation(input({ actualHours: 100 * VERDICT_IM_PLAN_THRESHOLD })).verdict).toBe("im_plan");
    });

    it("is 'schlechter' just above plan × 1.05", () => {
      expect(compareNachkalkulation(input({ actualHours: 105.1 })).verdict).toBe("schlechter");
    });
  });

  describe("zero and degenerate inputs", () => {
    it("returns 0 deviation and 'im_plan' when planned hours are 0 (no baseline)", () => {
      const r = compareNachkalkulation(input({ plannedHours: 0 }));
      expect(r.hoursDeviationPct).toBe(0);
      expect(r.verdict).toBe("im_plan");
    });

    it("returns 0 for both margins when the monthly price is 0", () => {
      const r = compareNachkalkulation(input({ monthlyPrice: 0 }));
      expect(r.actualMarginPct).toBe(0);
      expect(r.plannedMarginPct).toBe(0);
    });

    it("handles 0 actual hours: no cost, full margin, no performance value", () => {
      const r = compareNachkalkulation(input({ actualHours: 0 }));
      expect(r.actualCostMonthly).toBe(0);
      expect(r.actualMarginPct).toBeCloseTo(100, 10);
      expect(r.actualPerfSqmPerHour).toBe(0);
      expect(r.hoursDeviationPct).toBeCloseTo(-100, 10);
      expect(r.verdict).toBe("besser");
    });

    it("returns 0 performance when the area is 0", () => {
      expect(compareNachkalkulation(input({ area: 0 })).actualPerfSqmPerHour).toBe(0);
    });

    it("never returns NaN or Infinity, even for fully non-finite input", () => {
      const r = compareNachkalkulation({
        plannedHours: NaN,
        actualHours: Infinity,
        monthlyPrice: NaN,
        vollkosten: -Infinity,
        area: NaN,
      });
      expect(r.hoursDeviationPct).toBe(0);
      expect(r.actualCostMonthly).toBe(0);
      expect(r.actualMarginPct).toBe(0);
      expect(r.plannedMarginPct).toBe(0);
      expect(r.actualPerfSqmPerHour).toBe(0);
      expect(r.verdict).toBe("im_plan");
      Object.values(r).forEach((v) => {
        if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
      });
    });

    it("treats negative inputs as 0", () => {
      const r = compareNachkalkulation(input({ plannedHours: -10, actualHours: -5, monthlyPrice: -100, area: -50 }));
      expect(r.hoursDeviationPct).toBe(0);
      expect(r.actualCostMonthly).toBe(0);
      expect(r.actualMarginPct).toBe(0);
      expect(r.plannedMarginPct).toBe(0);
      expect(r.actualPerfSqmPerHour).toBe(0);
      expect(r.verdict).toBe("im_plan");
    });
  });
});
