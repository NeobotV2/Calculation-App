import { describe, it, expect } from "vitest";
import { calcHms, hmsHoursPerEinsatz } from "./hms";
import type { HmsConfig, ModuleRates } from "./types";
import { createDefaultHms, HMS_CATALOG, HMS_CATALOG_BY_ID, HMS_PRESET_FALLBACK, HMS_PRESETS_BY_OBJECT_TYPE, hmsTaskFromCatalog } from "@/data/hausmeisterservice";

const R: ModuleRates = { rate: 30, vollkosten: 24 };

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

const h = calcHms(HMS_REF, R);

describe("calcHms (T6)", () => {
  it("computes hours per task, skipping disabled tasks", () => {
    expect(h.tasks.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    const hours = h.tasks.map((t) => t.hoursAnnual);
    [26, 14, 15.6, 4, 24].forEach((v, i) => expect(hours[i]).toBeCloseTo(v, 6));
    expect(h.taskHoursAnnual).toBeCloseTo(83.6, 6);
  });

  it("derives visit days from the highest non-contingent frequency and travel", () => {
    expect(h.visitDaysPerYear).toBe(52);
    expect(h.travelHoursAnnual).toBeCloseTo(8.666667, 6);
    expect(h.laborHoursAnnual).toBeCloseTo(92.266667, 6);
  });

  it("prices labour and material", () => {
    expect(h.materialCostAnnual).toBeCloseTo(260, 6);
    expect(h.materialRevenueAnnual).toBeCloseTo(299, 6);
    expect(h.revenueAnnual).toBeCloseTo(3067, 6);
    expect(h.costAnnual).toBeCloseTo(2474.4, 6);
    expect(h.contributionAnnual).toBeCloseTo(592.6, 6);
    expect(h.marginPct).toBeCloseTo(19.321813, 6);
  });

  it("normalises to an average month", () => {
    expect(h.revenueMonthly).toBeCloseTo(255.583333, 6);
    expect(h.costMonthly).toBeCloseTo(206.2, 6);
    expect(h.laborCostMonthly).toBeCloseTo(184.533333, 6);
    expect(h.laborHoursMonthly).toBeCloseTo(7.688889, 6);
    expect(h.contingentHoursMonthly).toBeCloseTo(2, 6);
  });

  it("task revenues plus travel add up to the total (invariant 4)", () => {
    expect(h.tasks.map((t) => t.revenueAnnual)).toEqual([780, 489, 468, 212, 858].map((v) => expect.closeTo(v, 6)));
    const sum = h.tasks.reduce((s, t) => s + t.revenueAnnual, 0) + h.travelHoursAnnual * h.rate;
    expect(sum).toBeCloseTo(h.revenueAnnual, 9);
  });

  it("uses the visit-day override and module rate overrides", () => {
    const o = calcHms({ ...HMS_REF, visitDaysPerYear: 26, rateOverride: 38, vollkostenOverride: 28 }, R);
    expect(o.visitDaysPerYear).toBe(26);
    expect(o.travelHoursAnnual).toBeCloseTo(26 * 10 / 60, 9);
    expect(o.rate).toBe(38);
    expect(o.vollkosten).toBe(28);
  });
});

describe("calcHms month profile (T7)", () => {
  it("spreads seasonal tasks over their months and the rest evenly", () => {
    const m = h.monthlyLaborHours;
    expect(m[0]).toBeCloseTo(6.188889, 6);
    expect(m[3]).toBeCloseTo(8.188889, 6);
    expect(m[5]).toBeCloseTo(10.188889, 6);
    expect(m[8]).toBeCloseTo(10.188889, 6);
    expect(m[10]).toBeCloseTo(6.188889, 6);
    expect(m.reduce((a, b) => a + b, 0)).toBeCloseTo(92.266667, 6);
    expect(h.peakMonthHours).toBeCloseTo(10.188889, 6);
  });
});

describe("calcHms degenerate inputs (T15)", () => {
  it("an m² task without performance yields 0 hours", () => {
    const z = calcHms({ ...HMS_REF, tasks: [{ id: "x", label: "x", unit: "m2", quantity: 100, perfM2h: 0, frequencyPerYear: 10, enabled: true }] }, R);
    expect(z.laborHoursAnnual).toBe(0);
    expect(z.visitDaysPerYear).toBe(0);
    expect(z.marginPct).toBe(0);
  });

  it("hours per execution by unit (H1)", () => {
    expect(hmsHoursPerEinsatz(HMS_REF.tasks[0])).toBeCloseTo(0.5, 9);
    expect(hmsHoursPerEinsatz(HMS_REF.tasks[1])).toBeCloseTo(1, 9);
    expect(hmsHoursPerEinsatz(HMS_REF.tasks[4])).toBeCloseTo(2, 9);
  });
});

describe("HMS catalogue", () => {
  it("has 20 tasks with unique ids", () => {
    expect(HMS_CATALOG).toHaveLength(20);
    expect(Object.keys(HMS_CATALOG_BY_ID)).toHaveLength(20);
  });

  it("every preset references catalogue ids", () => {
    for (const ids of [...Object.values(HMS_PRESETS_BY_OBJECT_TYPE), HMS_PRESET_FALLBACK]) {
      for (const id of ids) expect(HMS_CATALOG_BY_ID[id]).toBeDefined();
    }
  });

  it("createDefaultHms is empty without makeId and preselects with it", () => {
    expect(createDefaultHms("Wohnanlage").tasks).toEqual([]);
    let n = 0;
    const cfg = createDefaultHms("Wohnanlage", () => `id-${++n}`);
    expect(cfg.tasks.map((t) => t.catalogId)).toEqual(HMS_PRESETS_BY_OBJECT_TYPE.Wohnanlage);
    expect(cfg.tasks[0].id).toBe("id-1");
    expect(createDefaultHms("Unbekannt", () => "x").tasks.map((t) => t.catalogId)).toEqual(HMS_PRESET_FALLBACK);
  });

  it("hmsTaskFromCatalog copies season months", () => {
    const item = HMS_CATALOG_BY_ID.rasen_maehen;
    const t = hmsTaskFromCatalog(item, "a");
    expect(t.seasonMonths).toEqual(item.seasonMonths);
    expect(t.seasonMonths).not.toBe(item.seasonMonths);
  });

  it("matches the documented Wohnanlage sanity check (§4.6)", () => {
    let n = 0;
    const r = calcHms(createDefaultHms("Wohnanlage", () => `t${++n}`), R);
    expect(r.laborHoursAnnual).toBeCloseTo(139.27, 2);
    expect(r.revenueAnnual).toBeCloseTo(4488.5, 2);
  });
});
