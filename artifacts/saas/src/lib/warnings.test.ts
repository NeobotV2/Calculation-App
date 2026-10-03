import { describe, it, expect } from "vitest";
import {
  getProjectWarnings,
  getAllProjectWarnings,
  countWarningsBySeverity,
  getWarningTypeKey,
  type ProjectWarnings,
} from "./warnings";
import { calcHourlyRate, getDefaultConfig } from "./hourly-rate-calc";
import type { Room, Project } from "@/store/use-store";
import { WARNING_TYPES } from "./warnings";
import { calcWinterdienst } from "./service-modules/winterdienst";
import type { HmsConfig, WinterdienstConfig } from "./service-modules/types";

const cfg = getDefaultConfig();
const breakdown = calcHourlyRate(cfg);
const vollkosten = breakdown.vollkosten;

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
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
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Objekt",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    rooms: [makeRoom()],
    ...overrides,
  };
}

const has = (w: { id: string; severity: string }[], suffix: string, severity?: string) =>
  w.some((x) => x.id.endsWith(suffix) && (severity ? x.severity === severity : true));

describe("getWarningTypeKey", () => {
  it("maps warning ids to their stable type key (project id stripped)", () => {
    expect(getWarningTypeKey("p1_below_cost")).toBe("below_cost");
    expect(getWarningTypeKey("p1_low_margin")).toBe("low_margin");
    expect(getWarningTypeKey("p1_default_rate")).toBe("default_rate");
    expect(getWarningTypeKey("p1_perf_r9")).toBe("perf");
    expect(getWarningTypeKey("p1_sanitaer")).toBe("sanitaer");
  });
});

describe("getProjectWarnings", () => {
  it("returns no warnings for a project without rooms", () => {
    expect(getProjectWarnings(makeProject({ rooms: [] }), 30, cfg, breakdown, false)).toEqual([]);
  });

  it("flags a critical 'below cost' warning when the rate is under full cost", () => {
    const p = makeProject({ hourlyRate: vollkosten * 0.5 });
    const w = getProjectWarnings(p, 30, cfg, breakdown, false);
    expect(has(w, "below_cost", "critical")).toBe(true);
  });

  it("flags 'low margin' (not below-cost) when the margin is positive but under target", () => {
    const p = makeProject({ hourlyRate: vollkosten * 1.05 }); // ~4.8% margin < 10% default target
    const w = getProjectWarnings(p, 30, cfg, breakdown, false);
    expect(has(w, "low_margin", "warning")).toBe(true);
    expect(has(w, "below_cost")).toBe(false);
  });

  it("produces no margin warnings for a healthy, well-priced project", () => {
    const p = makeProject({ hourlyRate: vollkosten * 2 });
    const w = getProjectWarnings(p, 30, cfg, breakdown, false);
    expect(w).toEqual([]);
  });

  it("flags an unrealistic custom performance value (>50% over the industry value)", () => {
    const p = makeProject({
      hourlyRate: vollkosten * 2,
      rooms: [makeRoom({ customPerformance: 400, typePerformance: 200 })],
    });
    const w = getProjectWarnings(p, 30, cfg, breakdown, false);
    expect(w.some((x) => /_perf_/.test(x.id) && x.severity === "warning")).toBe(true);
  });

  it("flags a high sanitary-area cost share (info)", () => {
    const p = makeProject({
      hourlyRate: vollkosten * 2,
      rooms: [makeRoom({ groupId: "g2", name: "WC" })],
    });
    const w = getProjectWarnings(p, 30, cfg, breakdown, false);
    expect(has(w, "sanitaer", "info")).toBe(true);
  });

  it("flags use of the default rate when no project-specific rate is set", () => {
    const p = makeProject({ hourlyRate: undefined });
    const w = getProjectWarnings(p, vollkosten * 2, cfg, breakdown, true);
    expect(has(w, "default_rate", "info")).toBe(true);
  });
});

describe("getAllProjectWarnings", () => {
  it("ignores archived projects", () => {
    const archived = makeProject({ id: "a", status: "archived", hourlyRate: vollkosten * 0.5 });
    const active = makeProject({ id: "b", hourlyRate: vollkosten * 0.5 });
    const all = getAllProjectWarnings([archived, active], 30, cfg, false);
    expect(all.map((x) => x.projectId)).toEqual(["b"]);
  });

  it("drops disabled warning types and projects that end up warning-free", () => {
    const p = makeProject({ id: "b", hourlyRate: vollkosten * 0.5 }); // only a below_cost warning
    const all = getAllProjectWarnings([p], 30, cfg, false, ["below_cost"]);
    expect(all).toEqual([]);
  });
});

describe("countWarningsBySeverity", () => {
  it("tallies counts per severity and the total", () => {
    const input: ProjectWarnings[] = [
      {
        projectId: "x",
        projectName: "X",
        warnings: [
          { id: "x_below_cost", severity: "critical", title: "", message: "", action: "" },
          { id: "x_sanitaer", severity: "info", title: "", message: "", action: "" },
        ],
      },
    ];
    expect(countWarningsBySeverity(input)).toEqual({ critical: 1, warning: 0, info: 1, total: 2 });
  });
});

/* ── Fixtures Leistungsmodule (Kontrakt §14) ── */
const MOD_R = { rate: 30, vollkosten: 24 };
const MOD_WD_REF: WinterdienstConfig = {
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
const MOD_HMS_REF: HmsConfig = {
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
const modProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Objekt", status: "active", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  rooms: [{ id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro", area: 100, frequency: "5x_week", typePerformance: 200 }],
  ...o,
});
const MOD_P_ALL = modProject({ ruestzeit: 15, winterdienst: MOD_WD_REF, hms: MOD_HMS_REF });

describe("getProjectWarnings with service modules (T11)", () => {
  const bd = { ...calcHourlyRate(cfg), vollkosten: 24 };

  it("appends module findings after the room checks", () => {
    const w = getProjectWarnings(MOD_P_ALL, 30, cfg, bd, false, 10);
    expect(w.map((x) => x.id)).toEqual(["p1_wd_harsh", "p1_wd_splitt", "p1_hms_rate"]);
  });

  it("maps module warning ids to toggle keys", () => {
    expect(["p1_wd_salt", "p1_below_cost_wd", "p1_low_margin_hms", "p1_hms_contingent", "p1_perf_r9"].map(getWarningTypeKey))
      .toEqual(["winterdienst", "below_cost", "low_margin", "hms", "perf"]);
    expect(WARNING_TYPES.map((t) => t.key)).toContain("winterdienst");
    expect(WARNING_TYPES.map((t) => t.key)).toContain("hms");
  });

  it("the winterdienst toggle filters only Winterdienst findings", () => {
    const disabled = new Set(["winterdienst"]);
    const w = getProjectWarnings(MOD_P_ALL, 30, cfg, bd, false, 10).filter((x) => !disabled.has(getWarningTypeKey(x.id)));
    expect(w.map((x) => x.id)).toEqual(["p1_hms_rate"]);
    const all = getAllProjectWarnings([MOD_P_ALL], 30, cfg, false, ["winterdienst"], 10);
    expect(all[0].warnings.some((x) => x.id.startsWith("p1_wd_"))).toBe(false);
  });

  it("a project without rooms and modules still has no warnings", () => {
    expect(getProjectWarnings(modProject({ rooms: [] }), 30, cfg, bd, false)).toEqual([]);
  });

  it("a module-only object is checked", () => {
    const w = getProjectWarnings(modProject({ rooms: [], winterdienst: { ...MOD_WD_REF, saltRestricted: true } }), 30, cfg, bd, false, 10);
    expect(w.map((x) => x.id)).toEqual(["p1_wd_harsh", "p1_wd_salt", "p1_wd_splitt"]);
  });

  it("a Winterdienst loss is critical", () => {
    const wd = { ...MOD_WD_REF, rateOverride: 15, vollkostenOverride: 24 };
    const w = getProjectWarnings(modProject({ winterdienst: wd }), 30, cfg, bd, false, 10);
    expect(w.filter((x) => x.id.includes("cost_wd")).map((x) => [x.id, x.severity])).toEqual([["p1_below_cost_wd", "critical"]]);
    expect(calcWinterdienst(wd, MOD_R).contributionSeason).toBeCloseTo(-344.2675, 6);
  });

  it("paused modules add no warnings", () => {
    const paused = modProject({ winterdienst: { ...MOD_WD_REF, enabled: false }, hms: { ...MOD_HMS_REF, enabled: false } });
    expect(getProjectWarnings(paused, 30, cfg, bd, false, 10)).toEqual(getProjectWarnings(modProject(), 30, cfg, bd, false, 10));
  });
});
