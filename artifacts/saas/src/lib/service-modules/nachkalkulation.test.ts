import { describe, it, expect } from "vitest";
import { compareHmsNachkalkulation, compareWinterNachkalkulation } from "./nachkalkulation";
import { calcWinterdienst } from "./winterdienst";
import { calcHms } from "./hms";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "./types";

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

describe("compareWinterNachkalkulation (T13)", () => {
  it("Pauschale, 70 Einsätze, 105 h, 2.500 kg: bridge from plan to actual", () => {
    const n = compareWinterNachkalkulation(calcWinterdienst(WD_REF, R), { einsaetze: 70, laborHours: 105, materialKg: 2500 });
    expect(n.revenueActual).toBeCloseTo(3699.1075, 6);
    expect(n.bridge.weather).toBeCloseTo(-1534.479167, 6);
    expect(n.bridge.productivity).toBeCloseTo(-151.2, 6);
    expect(n.bridge.material).toBeCloseTo(-13.586047, 6);
    expect(n.costActual).toBeCloseTo(4634.327713, 6);
    expect(n.contributionActual).toBeCloseTo(-935.220213, 6);
    expect(n.contributionPlanned + n.bridge.weather + n.bridge.productivity + n.bridge.material).toBeCloseTo(n.contributionActual, 9);
    expect(n.actualMarginPct).toBeCloseTo(-25.28232, 6);
    expect(n.einsaetzeDeviationPct).toBeCloseTo(55.555556, 6);
    expect(n.productivityDeviationPct).toBeCloseTo(5.633803, 6);
    expect(n.verdict).toBe("schlechter");
  });

  it("pro Einsatz, 70 Einsätze, hours at plan", () => {
    const n = compareWinterNachkalkulation(calcWinterdienst({ ...WD_REF, billingMode: "pro_einsatz" }, R), { einsaetze: 70 });
    expect(n.revenueActual).toBeCloseTo(5581.945, 6);
    expect(n.costActual).toBeCloseTo(4469.541667, 6);
    expect(n.contributionActual).toBeCloseTo(1112.403333, 6);
    expect(n.bridge.weather).toBeCloseTo(348.358333, 6);
    expect(n.verdict).toBe("im_plan");
  });
});

describe("compareHmsNachkalkulation (T14)", () => {
  const plan = calcHms(HMS_REF, R);

  it("bills contingent overage when agreed", () => {
    const n = compareHmsNachkalkulation(plan, { laborHours: 100, contingentHoursUsed: 30 }, true);
    expect(n.overageHours).toBe(6);
    expect(n.revenueActual).toBeCloseTo(3247, 6);
    expect(n.costActual).toBeCloseTo(2660, 6);
    expect(n.contributionActual).toBeCloseTo(587, 6);
    expect(n.actualMarginPct).toBeCloseTo(18.078226, 6);
    expect(n.hoursDeviationPct).toBeCloseTo(8.381503, 6);
    expect(n.verdict).toBe("schlechter");
  });

  it("does not bill overage otherwise", () => {
    const n = compareHmsNachkalkulation(plan, { laborHours: 100, contingentHoursUsed: 30 }, false);
    expect(n.revenueActual).toBeCloseTo(3067, 6);
    expect(n.contributionActual).toBeCloseTo(407, 6);
    expect(n.actualMarginPct).toBeCloseTo(13.270297, 6);
  });
});
