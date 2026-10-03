import { describe, it, expect } from "vitest";
import { sanitizeHms, sanitizeServiceActuals, sanitizeWinterdienst } from "./sanitize";
import type { HmsConfig, WinterdienstConfig } from "./types";
import { createDefaultWinterdienst } from "@/data/winterdienst";

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

const HMS_REF: HmsConfig = {
  schemaVersion: 1, enabled: true, travelMinutesPerVisitDay: 10, materialMarkupPct: 15, contingentOverageBilled: true,
  tasks: [
    { id: "t1", catalogId: "kontrollgang", label: "Kontrollgang", unit: "pauschal", quantity: 1, minutesPerUnit: 30, frequencyPerYear: 52, enabled: true },
    { id: "t2", catalogId: "rasen_maehen", label: "Rasen mähen", unit: "m2", quantity: 600, perfM2h: 600, frequencyPerYear: 14, seasonMonths: [4, 5, 6, 7, 8, 9, 10], materialCostPerYear: 60, enabled: true },
    { id: "t5", catalogId: "kleinreparaturen", label: "Kleinreparaturen", unit: "kontingent", quantity: 2, frequencyPerYear: 12, materialCostPerYear: 120, enabled: true },
    { id: "t6", catalogId: "laub_entfernen", label: "Laub", unit: "m2", quantity: 400, perfM2h: 400, frequencyPerYear: 6, seasonMonths: [10, 11], materialCostPerYear: 50, enabled: false },
  ],
};

const json = <T,>(v: T): unknown => JSON.parse(JSON.stringify(v));

describe("sanitizeWinterdienst (T16)", () => {
  it("rejects non-objects", () => {
    expect(sanitizeWinterdienst(null)).toBeUndefined();
    expect(sanitizeWinterdienst([1])).toBeUndefined();
    expect(sanitizeWinterdienst("abc")).toBeUndefined();
  });

  it("clamps values and maps unknown types instead of dropping data", () => {
    const s = sanitizeWinterdienst({
      region: "mars", seasonMonths: [13, 2, 2, "x"], clearingSharePct: 250, expectedEinsaetze: -3,
      areas: [{ type: "dach" }, { type: "treppe", areaM2: 20, method: "maschinell" }, "x"], billingMode: "flat",
    })!;
    expect(s.region).toBe("flachland");
    expect(s.seasonMonths).toEqual([2]);
    expect(s.clearingSharePct).toBe(100);
    expect(s.expectedEinsaetze).toBe(0);
    expect(s.areas).toHaveLength(2);
    expect(s.areas[0].type).toBe("sonstige");
    expect(s.areas[0].label).toBe("Sonstige Fläche (Innenhof, Müllplatz)");
    expect(s.areas[0].areaM2).toBe(0);
    expect(s.areas[1].label).toBe("Treppe / Eingang");
    expect(s.areas[1].method).toBe("maschinell");
    expect(s.billingMode).toBe("pauschale_12");
    expect(s.material).toBe("splitt");
    expect(s.enabled).toBe(false);
  });

  it("a missing or non-boolean enabled flag becomes false and defaults fill the rest", () => {
    const y = sanitizeWinterdienst({ enabled: "yes" })!;
    expect(y.enabled).toBe(false);
    expect(y.seasonMonths).toEqual([1, 2, 3, 11, 12]);
    expect(y.expectedEinsaetze).toBe(25);
    expect(y.liabilitySurchargePct).toBe(5);
  });

  it("round-trips a valid config unchanged", () => {
    expect(json(sanitizeWinterdienst(json(WD_REF)))).toEqual(json(WD_REF));
    expect(json(sanitizeWinterdienst(json(createDefaultWinterdienst())))).toEqual(json(createDefaultWinterdienst()));
  });
});

describe("sanitizeHms (T16)", () => {
  it("round-trips a valid config unchanged", () => {
    expect(json(sanitizeHms(json(HMS_REF)))).toEqual(json(HMS_REF));
  });

  it("drops tasks with an unknown unit unless the catalogue knows the unit", () => {
    const hs = sanitizeHms({ enabled: true, tasks: [
      { unit: "foo", label: "a" },
      { unit: "foo", catalogId: "rasen_maehen", quantity: 500, perfM2h: 500, frequencyPerYear: 14 },
      { unit: "m2", seasonMonths: [] },
    ] })!;
    expect(hs.tasks).toHaveLength(2);
    expect(hs.tasks[0].unit).toBe("m2");
    expect(hs.tasks[0].label).toBe("Rasen mähen inkl. Schnittgutentsorgung");
    expect(hs.tasks[1].seasonMonths).toBeUndefined();
    expect(hs.tasks[1].enabled).toBe(true);
    expect(hs.contingentOverageBilled).toBe(true);
    expect(hs.travelMinutesPerVisitDay).toBe(15);
    expect(hs.enabled).toBe(true);
  });

  it("rejects non-objects and defaults enabled to false", () => {
    expect(sanitizeHms(undefined)).toBeUndefined();
    expect(sanitizeHms({})?.enabled).toBe(false);
  });
});

describe("sanitizeServiceActuals (T16)", () => {
  it("drops invalid entries and returns undefined when nothing is left", () => {
    expect(sanitizeServiceActuals({ winterdienst: [{ season: "2025/26", einsaetze: -1 }] })).toBeUndefined();
    expect(sanitizeServiceActuals(null)).toBeUndefined();
  });

  it("keeps valid entries", () => {
    const a = sanitizeServiceActuals({
      winterdienst: [{ season: "2025/26", einsaetze: 31, laborHours: 40 }],
      hms: [{ year: 2025, laborHours: 120, contingentHoursUsed: 20 }, { year: "2025", laborHours: 1 }],
    })!;
    expect(a.winterdienst?.[0].einsaetze).toBe(31);
    expect(a.winterdienst?.[0].laborHours).toBe(40);
    expect(a.hms).toHaveLength(1);
    expect(a.hms?.[0].contingentHoursUsed).toBe(20);
  });
});
