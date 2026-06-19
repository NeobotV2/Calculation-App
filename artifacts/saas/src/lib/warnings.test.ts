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
