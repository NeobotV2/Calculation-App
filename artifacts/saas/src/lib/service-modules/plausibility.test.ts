import { describe, it, expect } from "vitest";
import { evaluateModuleFindings, MODULE_THRESHOLDS, type ModuleFinding } from "./plausibility";
import { calcWinterdienst } from "./winterdienst";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "./types";
import { calcObjectTotals } from "@/lib/object-totals";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import type { Project, Room } from "@/store/use-store";

const R: ModuleRates = { rate: 30, vollkosten: 24 };
const TARGET = markupToRevenueMargin(10); // 9,0909 %

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

const makeRoom = (o: Partial<Room> = {}): Room => ({
  id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro",
  area: 100, frequency: "5x_week", typePerformance: 200, ...o,
});
const makeProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z", rooms: [makeRoom()], ...o,
});

const findings = (p: Project) => evaluateModuleFindings(p, calcObjectTotals(p, R), TARGET);
const ids = (fs: ModuleFinding[]) => fs.map((f) => f.idSuffix);
const pAll = makeProject({ ruestzeit: 15, winterdienst: WD_REF, hms: HMS_REF });

describe("evaluateModuleFindings (T11)", () => {
  it("(a) pAll: harsh-winter info, Splitt pickup and HMS rate", () => {
    const f = findings(pAll);
    expect(ids(f)).toEqual(["wd_harsh", "wd_splitt", "hms_rate"]);
    expect(f.map((x) => [x.severity, x.riskPoints])).toEqual([["info", 4], ["info", 0], ["info", 0]]);
    expect(f[0].message).toBe("Bei 75 statt 45 Einsätzen entsteht ein Verlust von 1.077,33 € je Saison.");
    expect(f[0].action).toContain("(z. B. bis 57 Einsätze)");
  });

  it("(b) salt restriction flags restrictable areas only", () => {
    const f = findings(makeProject({ winterdienst: { ...WD_REF, saltRestricted: true } }));
    expect(ids(f)).toEqual(["wd_harsh", "wd_salt", "wd_splitt"]);
    expect(f[1].severity).toBe("warning");
    expect(f[1].riskPoints).toBe(10);
    expect(f[1].message).toContain("Parkplatz");
    expect(f[1].message).not.toContain("Eingangstreppe");
  });

  it("(c) pro Einsatz has no harsh-winter risk", () => {
    expect(ids(findings(makeProject({ winterdienst: { ...WD_REF, billingMode: "pro_einsatz" } })))).toEqual(["wd_splitt"]);
  });

  it("(d) Einsätze below the region minimum", () => {
    const f = findings(makeProject({ winterdienst: { ...WD_REF, expectedEinsaetze: 20 } }));
    expect(ids(f)).toEqual(["wd_harsh", "wd_einsaetze_low", "wd_splitt"]);
    expect([f[1].severity, f[1].riskPoints]).toEqual(["warning", 12]);
  });

  it("(e) Pauschale covers fewer Einsätze than a typical winter", () => {
    const f = findings(makeProject({ winterdienst: { ...WD_REF, expectedEinsaetze: 30 } }));
    expect(ids(f)).toEqual(["wd_harsh", "wd_einsaetze_low", "wd_splitt"]);
    expect(f[1].message).toContain("nur bis ca. 39 Einsätze");
    expect(calcWinterdienst({ ...WD_REF, expectedEinsaetze: 30 }, R).billing.lossAboveEinsaetze as number).toBeCloseTo(39.042645, 6);
  });

  it("(f) missing documentation time", () => {
    expect(ids(findings(makeProject({ winterdienst: { ...WD_REF, documentationMinutesPerEinsatz: 0 } })))).toEqual(["wd_harsh", "wd_doc", "wd_splitt"]);
  });

  it("(g) a large manual Gehweg needs a crew", () => {
    const g600: WinterdienstConfig = { ...WD_REF, billingMode: "pro_einsatz",
      areas: [{ id: "g", label: "Gehweg", type: "gehweg", areaM2: 600, method: "manuell", clear: true, spread: true, material: "splitt" }] };
    const f = findings(makeProject({ winterdienst: g600 }));
    expect(ids(f)).toEqual(["wd_crew", "wd_splitt"]);
    expect(f[0].message).toContain("mindestens 2 Kräfte");
    expect(calcWinterdienst(g600, R).crewAtPeak).toBeCloseTo(1.533333, 6);
  });

  it("(h) clearing without spreading", () => {
    const wd: WinterdienstConfig = { ...WD_REF, billingMode: "pro_einsatz",
      areas: WD_REF.areas.map((a) => (a.id === "a1" ? { ...a, spread: false } : a)) };
    expect(ids(findings(makeProject({ winterdienst: wd })))).toEqual(["wd_spreading"]);
  });

  it("(i) a large contingent is info when billed, warning when not", () => {
    const big: HmsConfig = { ...HMS_REF, tasks: HMS_REF.tasks.map((t) => (t.id === "t5" ? { ...t, quantity: 10 } : t)) };
    const tuple = (fs: ModuleFinding[]) => fs.map((x) => [x.idSuffix, x.severity, x.riskPoints]);
    expect(tuple(findings(makeProject({ hms: big })))).toEqual([["hms_contingent", "info", 0], ["hms_rate", "info", 0]]);
    expect(tuple(findings(makeProject({ hms: { ...big, contingentOverageBilled: false } })))).toEqual([["hms_contingent", "warning", 6], ["hms_rate", "info", 0]]);
  });

  it("(j) playground checks below weekly", () => {
    const sp: HmsConfig = { ...HMS_REF, rateOverride: 38, vollkostenOverride: 28,
      tasks: [...HMS_REF.tasks, { id: "t7", catalogId: "spielplatz_kontrolle", label: "Spielplatz", unit: "stueck", quantity: 1, minutesPerUnit: 15, frequencyPerYear: 26, enabled: true }] };
    expect(ids(findings(makeProject({ hms: sp })))).toEqual(["hms_spielplatz"]);
    expect(MODULE_THRESHOLDS.spielplatzMinPerYear).toBe(52);
  });

  it("(k) HMS without tasks is incomplete", () => {
    expect(ids(findings(makeProject({ hms: { ...HMS_REF, tasks: [] } })))).toEqual(["hms_incomplete", "hms_rate"]);
  });

  it("a Winterdienst without areas is incomplete", () => {
    expect(ids(findings(makeProject({ winterdienst: { ...WD_REF, areas: [] } })))).toContain("wd_areas");
  });

  it("a Winterdienst below cost is critical", () => {
    const f = findings(makeProject({ winterdienst: { ...WD_REF, rateOverride: 15, vollkostenOverride: 24 } }));
    const loss = f.find((x) => x.idSuffix === "below_cost_wd");
    expect(loss?.severity).toBe("critical");
    expect(loss?.riskKey).toBe("wd_module_loss");
    expect(loss?.riskPoints).toBe(12);
  });

  it("returns nothing for paused or missing modules", () => {
    expect(findings(makeProject())).toEqual([]);
    expect(findings(makeProject({ winterdienst: { ...WD_REF, enabled: false }, hms: { ...HMS_REF, enabled: false } }))).toEqual([]);
  });
});
