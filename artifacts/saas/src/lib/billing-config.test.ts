import { describe, it, expect } from "vitest";
import {
  getPlanLimits,
  getPlanMeta,
  isPaidPlan,
  isFoundingPlan,
  formatCents,
  PRICING,
} from "./billing-config";

describe("plan helpers", () => {
  it("treats free as unpaid and pro/founding/business as paid", () => {
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("pro_monthly")).toBe(true);
    expect(isPaidPlan("pro_annual")).toBe(true);
    expect(isPaidPlan("founding_annual")).toBe(true);
    expect(isPaidPlan("business")).toBe(true);
  });

  it("identifies the founding plan", () => {
    expect(isFoundingPlan("founding_annual")).toBe(true);
    expect(isFoundingPlan("pro_annual")).toBe(false);
  });

  it("limits free to a single object but pro to unlimited", () => {
    expect(getPlanLimits("free").maxObjects).toBe(1);
    expect(getPlanLimits("free").pdfExport).toBe(false);
    expect(getPlanLimits("pro_monthly").maxObjects).toBe(Infinity);
    expect(getPlanLimits("pro_monthly").pdfExport).toBe(true);
  });

  it("falls back to free limits/meta for an unknown plan id", () => {
    // @ts-expect-error intentional invalid plan id
    expect(getPlanLimits("nonsense").maxObjects).toBe(1);
    // @ts-expect-error intentional invalid plan id
    expect(getPlanMeta("nonsense").id).toBe("free");
  });
});

describe("formatCents", () => {
  it("formats whole-euro amounts without decimals", () => {
    const s = formatCents(7900);
    expect(s).toContain("79");
    expect(s).toContain("€");
    expect(s).not.toContain(",00");
  });
});

describe("PRICING sanity", () => {
  it("annual pro is cheaper per month than monthly pro", () => {
    expect(PRICING.proAnnual.effectiveMonthlyFromAnnualCents).toBeLessThan(
      PRICING.proMonthly.monthlyPriceCents
    );
  });
  it("founding is the cheapest effective monthly price", () => {
    expect(PRICING.foundingAnnual.effectiveMonthlyFromAnnualCents).toBeLessThan(
      PRICING.proAnnual.effectiveMonthlyFromAnnualCents
    );
  });
});
