import { describe, it, expect } from "vitest";
import { evaluateModuleFindings, MODULE_THRESHOLDS, type ModuleFinding } from "./plausibility";
import { calcWinterdienst } from "./winterdienst";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "./types";
import { calcObjectTotals } from "@/lib/object-totals";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import { getWarningTypeKey } from "@/lib/warnings";
import { fixForWarningSuffix } from "@/lib/offer-readiness";
import { isHmsFinding } from "@/components/calc/hms/hms-ui";
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
    expect([f[1].title, f[1].severity, f[1].riskPoints]).toEqual(["Einsatzannahme zu niedrig", "warning", 12]);
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

describe("evaluateModuleFindings — Pauschale below a typical winter", () => {
  const byId = (fs: ModuleFinding[], id: string) => fs.find((x) => x.idSuffix === id);

  it("blames the price, not the assumption, when the Einsätze are typical", () => {
    const loss: WinterdienstConfig = { ...WD_REF, rateOverride: 15, vollkostenOverride: 24 };
    expect(calcWinterdienst(loss, R).billing.lossAboveEinsaetze as number).toBeCloseTo(2309.96375 / 58.982917, 5);
    const f = findings(makeProject({ winterdienst: loss }));
    expect(byId(f, "below_cost_wd")?.riskPoints).toBe(12);
    // Normalwinter (45) schon im Verlust: keine Deckelung bei 39 vorschlagen, die wd_cap auslösen würde.
    expect(byId(f, "wd_harsh")?.action).toBe("Deckelung vereinbaren und darüber je Einsatz abrechnen – oder Abrechnung pro Einsatz anbieten.");
    const low = byId(f, "wd_einsaetze_low");
    expect(low).toMatchObject({ title: "Pauschale deckt typischen Winter nicht", severity: "warning", riskPoints: 0,
      message: "Die Pauschale ist nur bis ca. 39 Einsätze kostendeckend; ein typischer Winter in der Region Hügelland / Mittelgebirge hat 45." });
    expect(low?.action).toContain("Einsatzpreis, Bereitschaftspauschale oder Zuschläge anheben");
  });

  it("still flags a very high assumption when the price is the problem", () => {
    const cheap: WinterdienstConfig = { ...WD_REF, rateOverride: 5, vollkostenOverride: 24, machineRatePerHour: 0, expectedEinsaetze: 80 };
    expect(calcWinterdienst(cheap, R).billing.lossAboveEinsaetze as number).toBeLessThan(45);
    const f = findings(makeProject({ winterdienst: cheap }));
    expect(byId(f, "wd_einsaetze_low")?.title).toBe("Pauschale deckt typischen Winter nicht");
    expect(byId(f, "wd_einsaetze_high")).toBeDefined();
  });

  it("does not quote a cap or threshold of 0 Einsätze", () => {
    const noVar: WinterdienstConfig = { ...WD_REF, areas: [], travelMinutesPerEinsatz: 0, documentationMinutesPerEinsatz: 0,
      seasonSetupHours: 0, standbyFeeMonthly: 0, standbyCostMonthly: 20 };
    const f = findings(makeProject({ winterdienst: noVar }));
    expect(byId(f, "wd_harsh")?.action).toBe("Deckelung vereinbaren und darüber je Einsatz abrechnen – oder Abrechnung pro Einsatz anbieten.");
    expect(byId(f, "wd_einsaetze_low")?.message).toBe("Die Pauschale ist bei keiner Einsatzzahl kostendeckend; ein typischer Winter in der Region Hügelland / Mittelgebirge hat 45.");
  });
});

describe("evaluateModuleFindings — capped Pauschale that recovers above the cap", () => {
  const byId = (fs: ModuleFinding[], id: string) => fs.find((x) => x.idSuffix === id);
  const R2: ModuleRates = { rate: 22.5, vollkosten: 18 };
  const capped: WinterdienstConfig = {
    ...WD_REF, region: "flachland", expectedEinsaetze: 30, clearingSharePct: 35, capEinsaetze: 8,
    areas: [{ id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" }],
    material: "splitt", standbyFeeMonthly: 0, standbyCostMonthly: 20,
  };
  const evalWith = (cfg: WinterdienstConfig) => {
    const p = makeProject({ rooms: [], winterdienst: cfg });
    return evaluateModuleFindings(p, calcObjectTotals(p, R2), TARGET);
  };
  /** Saisonergebnis bei e Einsätzen (W18). */
  const resultAt = (cfg: WinterdienstConfig, e: number) => {
    const wd = calcWinterdienst(cfg, R2);
    const b = wd.billing;
    return b.pauschaleSeason! + Math.max(0, e - b.capEinsaetze!) * b.pricePerEinsatz - (wd.fixedCostSeason + e * wd.perEinsatz.cost);
  };

  it("no 'Pauschale deckt typischen Winter nicht' when a typical winter is profitable", () => {
    const wd = calcWinterdienst(capped, R2);
    // Verlustschwelle unter dem Deckel, aber über dem Deckel holt die Abrechnung je Einsatz auf.
    expect(wd.billing.lossAboveEinsaetze as number).toBeLessThan(8);
    expect(wd.billing.pricePerEinsatz).toBeGreaterThan(wd.perEinsatz.cost);
    expect(resultAt(capped, 25)).toBeGreaterThan(0);
    expect(byId(evalWith(capped), "wd_einsaetze_low")).toBeUndefined();
  });

  it("names the loss window instead of 'nur bis ca. X' when the typical winter falls inside it", () => {
    // Höhere Bereitschaftskosten: der typische Winter (25) liegt im Verlustfenster unter der Aufholschwelle.
    const window: WinterdienstConfig = { ...capped, standbyCostMonthly: 30 };
    expect(calcWinterdienst(window, R2).billing.lossAboveEinsaetze as number).toBeGreaterThan(1);
    expect(resultAt(window, 25)).toBeLessThan(0);
    const low = byId(evalWith(window), "wd_einsaetze_low");
    expect(low?.title).toBe("Pauschale deckt typischen Winter nicht");
    const m = /^Die Pauschale ist zwischen ca\. (\d+) und (\d+) Einsätzen nicht kostendeckend; ein typischer Winter in der Region .+ hat 25\.$/.exec(low?.message ?? "");
    expect(m).not.toBeNull();
    const [lo, hi] = [Number(m![1]), Number(m![2])];
    expect(resultAt(window, lo + 1)).toBeLessThan(0);
    expect(resultAt(window, hi)).toBeGreaterThanOrEqual(0);
    expect(resultAt(window, hi - 1)).toBeLessThan(0);
  });

  it("says from which Einsatzzahl it pays when the loss starts at 0", () => {
    const late: WinterdienstConfig = { ...capped, standbyCostMonthly: 40 };
    expect(calcWinterdienst(late, R2).billing.lossAboveEinsaetze).toBe(0);
    const low = byId(evalWith(late), "wd_einsaetze_low");
    expect(low?.message).toMatch(/^Die Pauschale ist erst ab ca\. \d+ Einsätzen kostendeckend; ein typischer Winter/);
  });
});

describe("evaluateModuleFindings — HMS travel for contingents", () => {
  const contingentOnly: HmsConfig = { ...HMS_REF, rateOverride: 38, vollkostenOverride: 28, travelMinutesPerVisitDay: 20,
    tasks: HMS_REF.tasks.filter((t) => t.unit === "kontingent") };

  it("hints that contingent call-outs carry no travel", () => {
    const f = findings(makeProject({ wegezeit: 10, hms: contingentOnly }));
    expect(ids(f)).toEqual(["hms_contingent", "hms_travel_contingent"]);
    expect(f[1]).toMatchObject({ severity: "info", riskPoints: 0, title: "Keine Anfahrt für das Kontingent",
      action: "Einsatztage/Jahr für die erwarteten Abrufe angeben." });
  });

  it("maps like every other HMS finding", () => {
    expect(getWarningTypeKey("p1_hms_travel_contingent")).toBe("hms");
    expect(fixForWarningSuffix("hms_travel_contingent")).toEqual({ kind: "flow", step: "hms" });
    expect(isHmsFinding({ idSuffix: "hms_travel_contingent" })).toBe(true);
  });

  it("asks for the travel time as well when it is missing", () => {
    const f = findings(makeProject({ hms: { ...contingentOnly, travelMinutesPerVisitDay: 0 } }));
    expect(f.find((x) => x.idSuffix === "hms_travel_contingent")?.action)
      .toBe("Einsatztage/Jahr für die erwarteten Abrufe und die Anfahrt je Einsatztag erfassen.");
  });

  it("stays silent once visit days are set, and never reports double travel without HMS travel", () => {
    const withDays = findings(makeProject({ wegezeit: 10, hms: { ...contingentOnly, visitDaysPerYear: 12 } }));
    expect(ids(withDays)).toEqual(["hms_contingent", "hms_travel"]);
    expect(withDays[1].title).toBe("Anfahrt doppelt?");
    const zeroDays = findings(makeProject({ wegezeit: 10, hms: { ...HMS_REF, rateOverride: 38, vollkostenOverride: 28,
      tasks: HMS_REF.tasks.filter((t) => t.unit !== "kontingent"), visitDaysPerYear: 0 } }));
    expect(ids(zeroDays)).toEqual([]);
  });
});

describe("finding copy", () => {
  it("Deckelung: whole Einsatz counts without „,0“", () => {
    const f = findings(makeProject({ winterdienst: { ...WD_REF, capEinsaetze: 40 } })).find((x) => x.idSuffix === "wd_cap");
    expect(f?.message).toBe("Die Pauschale umfasst 40 Einsätze, erwartet werden 45.");
  });

  it("salt hint names the switch exactly as labelled in the editor", () => {
    const gehwegMitSalz = { ...WD_REF, areas: [{ ...WD_REF.areas[0], material: "salz" as const }] };
    const f = findings(makeProject({ winterdienst: gehwegMitSalz })).find((x) => x.idSuffix === "wd_salt");
    expect(f?.action).toContain("„Ortssatzung schränkt Auftausalz ein“");
  });

  it("negative contributions use the typographic minus", () => {
    const f = findings(makeProject({ hms: { ...HMS_REF, rateOverride: 10 } })).find((x) => x.message.includes("Deckungsbeitrag pro Jahr"));
    expect(f?.message).toMatch(/erzielt −\d/);
  });
});
