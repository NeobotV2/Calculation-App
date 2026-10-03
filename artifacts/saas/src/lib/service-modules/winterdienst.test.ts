import { describe, it, expect } from "vitest";
import { calcWinterdienst, clearingPerf, effectiveMethod, materialParams, spreadingPerf, weatherFactors } from "./winterdienst";
import type { ModuleRates, WinterdienstConfig } from "./types";
import { applyWinterRegion, createDefaultWinterdienst, createWinterArea, WINTER_REGION_PRESETS } from "@/data/winterdienst";

/* Kontrakt §14: Satz 30 €/h, Vollkosten 24 €/h. */
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

const wd = calcWinterdienst(WD_REF, R);

describe("calcWinterdienst — per Einsatz (T2)", () => {
  it("computes clearing, spreading and fixed hours", () => {
    const pe = wd.perEinsatz;
    expect(pe.clearingHours).toBeCloseTo(1.533333, 6);
    expect(pe.spreadingHours).toBeCloseTo(0.32, 6);
    expect(pe.fixedHours).toBeCloseTo(0.333333, 6);
    expect(pe.laborHours).toBeCloseTo(1.42, 6);
    expect(pe.machineHours).toBeCloseTo(0.333333, 6);
  });

  it("computes material, revenue and cost per Einsatz", () => {
    const pe = wd.perEinsatz;
    expect(pe.materialKg).toBeCloseTo(34.4, 6);
    expect(pe.materialCost).toBeCloseTo(5.08, 6);
    expect(wd.laborCostPerHour).toBeCloseTo(27, 6);
    expect(pe.serviceRevenue).toBeCloseTo(62.925, 6);
    expect(pe.revenue).toBeCloseTo(75.3135, 6);
    expect(pe.cost).toBeCloseTo(61.379167, 6);
  });

  it("treats a Treppe as manual even when maschinell is requested", () => {
    const treppe = { ...WD_REF.areas[2], method: "maschinell" as const };
    expect(effectiveMethod(treppe)).toBe("manuell");
    expect(clearingPerf(treppe)).toBe(60);
    expect(spreadingPerf(treppe)).toBe(300);
    expect(clearingPerf({ ...WD_REF.areas[0], clearingPerfM2h: 300 })).toBe(300);
  });

  it("applies material overrides", () => {
    expect(materialParams(WD_REF, "salz")).toEqual({ gramsPerM2: 20, pricePerKg: 0.2 });
    expect(materialParams({ ...WD_REF, materialOverrides: { salz: { pricePerKg: 0.3 } } }, "salz")).toEqual({ gramsPerM2: 20, pricePerKg: 0.3 });
  });
});

describe("calcWinterdienst — season (T3)", () => {
  it("splits revenue into its components", () => {
    expect(wd.fixedRevenueSeason).toBeCloseTo(310, 6);
    expect(wd.revenue.labor).toBeCloseTo(2216.625, 6);
    expect(wd.revenue.machine).toBeCloseTo(675, 6);
    expect(wd.revenue.liability).toBeCloseTo(283.1625, 6);
    expect(wd.revenue.material).toBeCloseTo(274.32, 6);
    expect(wd.revenue.standby).toBeCloseTo(250, 6);
    expect(wd.revenue.total).toBeCloseTo(3699.1075, 6);
  });

  it("splits cost into its components", () => {
    expect(wd.fixedCostSeason).toBeCloseTo(173, 6);
    expect(wd.cost.labor).toBeCloseTo(1773.3, 6);
    expect(wd.cost.machine).toBeCloseTo(525, 6);
    expect(wd.cost.material).toBeCloseTo(228.6, 6);
    expect(wd.cost.standby).toBeCloseTo(125, 6);
    expect(wd.cost.riskProvision).toBeCloseTo(283.1625, 6);
    expect(wd.cost.total).toBeCloseTo(2935.0625, 6);
  });

  it("derives contribution, hours and monthly normalisation", () => {
    expect(wd.contributionSeason).toBeCloseTo(764.045, 6);
    expect(wd.marginPct).toBeCloseTo(20.654847, 6);
    expect(wd.laborHoursSeason).toBeCloseTo(65.9, 6);
    expect(wd.machineHoursSeason).toBeCloseTo(15, 6);
    expect(wd.materialKgSeason).toBeCloseTo(1548, 6);
    expect(wd.revenueMonthly).toBeCloseTo(308.258958, 6);
    expect(wd.costMonthly).toBeCloseTo(244.588542, 6);
    expect(wd.laborCostMonthly).toBeCloseTo(147.775, 6);
    expect(wd.laborHoursMonthly).toBeCloseTo(5.491667, 6);
  });

  it("spreads the hours evenly over the season months", () => {
    expect(wd.monthlyLaborHours[0]).toBeCloseTo(13.18, 6);
    expect(wd.monthlyLaborHours[3]).toBeCloseTo(0, 9);
    expect(wd.monthlyLaborHours.reduce((a, b) => a + b, 0)).toBeCloseTo(65.9, 6);
  });

  it("satisfies F_U + E·U_E = revenue and F_K + E·K_E = cost (invariant 3)", () => {
    expect(wd.fixedRevenueSeason + wd.einsaetze * wd.perEinsatz.revenue).toBeCloseTo(wd.revenue.total, 9);
    expect(wd.fixedCostSeason + wd.einsaetze * wd.perEinsatz.cost).toBeCloseTo(wd.cost.total, 9);
  });
});

describe("calcWinterdienst — billing (T4)", () => {
  it("pauschale_12: 12 monthly instalments", () => {
    expect(wd.billing.installmentCount).toBe(12);
    expect(wd.billing.installmentAmount).toBeCloseTo(308.258958, 6);
    expect(wd.billing.pauschaleSeason as number).toBeCloseTo(3699.1075, 6);
  });

  it("pauschale_saison: one instalment per season month", () => {
    const s = calcWinterdienst({ ...WD_REF, billingMode: "pauschale_saison" }, R);
    expect(s.billing.installmentCount).toBe(5);
    expect(s.billing.installmentAmount).toBeCloseTo(739.8215, 6);
  });

  it("pro_einsatz: standby fee per season month plus price per Einsatz", () => {
    const p = calcWinterdienst({ ...WD_REF, billingMode: "pro_einsatz" }, R);
    expect(p.billing.pauschaleSeason).toBeNull();
    expect(p.billing.installmentAmount).toBeCloseTo(62, 6);
    expect(p.billing.installmentCount).toBe(5);
    expect(p.billing.pricePerEinsatz).toBeCloseTo(75.3135, 6);
  });

  it("expected season revenue and cost are identical in every mode (W19)", () => {
    for (const billingMode of ["pauschale_12", "pauschale_saison", "pro_einsatz"] as const) {
      const r = calcWinterdienst({ ...WD_REF, billingMode }, R);
      expect(r.revenue.total).toBeCloseTo(3699.1075, 6);
      expect(r.cost.total).toBeCloseTo(2935.0625, 6);
      expect(r.scenarios.normal.revenue).toBeCloseTo(r.revenue.total, 9);
    }
  });

  it("a cap of 30 lowers the Pauschale but not the expected revenue", () => {
    const c = calcWinterdienst({ ...WD_REF, capEinsaetze: 30 }, R);
    expect(c.billing.pauschaleSeason as number).toBeCloseTo(2569.405, 6);
    expect(c.billing.capEinsaetze).toBe(30);
    expect(c.scenarios.normal.revenue).toBeCloseTo(3699.1075, 6);
  });
});

describe("calcWinterdienst — scenarios and loss thresholds (T5)", () => {
  it("uses the region's min/typ/max band", () => {
    const f = weatherFactors("mittelgebirge");
    expect(f.mild).toBeCloseTo(25 / 45, 9);
    expect(f.streng).toBeCloseTo(75 / 45, 9);
    expect(wd.scenarios.mild.einsaetze).toBeCloseTo(25, 6);
    expect(wd.scenarios.streng.einsaetze).toBeCloseTo(75, 6);
  });

  it("Pauschale: cost grows with the weather, revenue stays fixed", () => {
    expect(wd.scenarios.mild.cost).toBeCloseTo(1707.479167, 6);
    expect(wd.scenarios.streng.cost).toBeCloseTo(4776.4375, 6);
    expect(wd.scenarios.mild.contribution).toBeCloseTo(1991.628333, 6);
    expect(wd.scenarios.normal.contribution).toBeCloseTo(764.045, 6);
    expect(wd.scenarios.streng.contribution).toBeCloseTo(-1077.33, 6);
  });

  it("pro Einsatz: revenue follows the weather", () => {
    const p = calcWinterdienst({ ...WD_REF, billingMode: "pro_einsatz" }, R);
    expect(p.scenarios.mild.revenue).toBeCloseTo(2192.8375, 6);
    expect(p.scenarios.streng.revenue).toBeCloseTo(5958.5125, 6);
    expect(p.scenarios.mild.contribution).toBeCloseTo(485.358333, 6);
    expect(p.scenarios.streng.contribution).toBeCloseTo(1182.075, 6);
    expect(p.billing.lossBelowEinsaetze).toBe(0);
  });

  it("computes the loss thresholds", () => {
    expect(wd.billing.lossAboveEinsaetze as number).toBeCloseTo(57.447953, 6);
    const cap = calcWinterdienst({ ...WD_REF, capEinsaetze: 45 }, R);
    expect(cap.scenarios.streng.contribution).toBeCloseTo(1182.075, 6);
    expect(cap.billing.lossAboveEinsaetze).toBeNull();
  });

  it("computes the crew needed in the clearing window", () => {
    expect(wd.crewAtPeak).toBeCloseTo(0.617778, 6);
  });
});

describe("calcWinterdienst — degenerate inputs (T15)", () => {
  it("E = 0 leaves only the fixed season values", () => {
    const z = calcWinterdienst({ ...WD_REF, expectedEinsaetze: 0 }, R);
    expect(z.revenue.total).toBeCloseTo(310, 6);
    expect(z.cost.total).toBeCloseTo(173, 6);
    expect(z.billing.pauschaleSeason as number).toBeCloseTo(310, 6);
  });

  it("NaN Einsätze and negative m² stay finite", () => {
    const r = calcWinterdienst({ ...WD_REF, expectedEinsaetze: Number.NaN, areas: [{ ...WD_REF.areas[0], areaM2: -5 }] }, R);
    expect(Number.isFinite(r.revenue.total)).toBe(true);
    expect(Number.isFinite(r.marginPct)).toBe(true);
    expect(r.revenue.total).toBeCloseTo(310, 6);
  });

  it("an empty season has no standby, 12 instalments and an even profile", () => {
    const n0 = calcWinterdienst({ ...WD_REF, seasonMonths: [] }, R);
    expect(n0.revenue.standby).toBe(0);
    expect(n0.billing.installmentCount).toBe(12);
    expect(n0.monthlyLaborHours[5]).toBeCloseTo(65.9 / 12, 6);
  });

  it("falls back to sonstige for an unknown area type", () => {
    const bad = { ...WD_REF, areas: [{ ...WD_REF.areas[0], type: "dach" as unknown as "sonstige" }] };
    expect(() => calcWinterdienst(bad, R)).not.toThrow();
  });
});

describe("Winterdienst catalogue factories", () => {
  it("createDefaultWinterdienst uses the region preset", () => {
    const d = createDefaultWinterdienst();
    expect(d.region).toBe("flachland");
    expect(d.expectedEinsaetze).toBe(25);
    expect(d.clearingSharePct).toBe(35);
    expect(d.seasonMonths).toEqual([1, 2, 3, 11, 12]);
    expect(d.enabled).toBe(true);
    expect(d.areas).toEqual([]);
  });

  it("applyWinterRegion re-applies Einsätze, share and season only", () => {
    const d = { ...createDefaultWinterdienst(), liabilitySurchargePct: 8 };
    const h = applyWinterRegion(d, "hochlage");
    expect(h.expectedEinsaetze).toBe(WINTER_REGION_PRESETS.hochlage.einsaetzeTyp);
    expect(h.seasonMonths).toEqual([1, 2, 3, 4, 10, 11, 12]);
    expect(h.liabilitySurchargePct).toBe(8);
  });

  it("createWinterArea uses the type defaults", () => {
    expect(createWinterArea("x", "parkplatz", 500)).toEqual({
      id: "x", label: "Parkplatz", type: "parkplatz", areaM2: 500, method: "maschinell", clear: true, spread: true,
    });
  });

  it("matches the documented default sanity check (§4.6)", () => {
    const cfg: WinterdienstConfig = {
      ...createDefaultWinterdienst(),
      areas: [
        { ...createWinterArea("g", "gehweg", 60) },
        { ...createWinterArea("t", "treppe", 10), material: "salz" },
      ],
    };
    const r = calcWinterdienst(cfg, R);
    expect(r.revenue.total).toBeCloseTo(841.91, 2);
    expect(r.revenueMonthly).toBeCloseTo(70.16, 2);
  });
});
