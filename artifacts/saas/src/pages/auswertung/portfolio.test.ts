import { describe, it, expect, vi } from "vitest";

// Der Store persistiert über Capacitor/localStorage — im Node-Test durch einen In-Memory-Speicher ersetzt.
vi.mock("@/lib/capacitor-storage", () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: (name: string) => mem.get(name) ?? null,
      setItem: (name: string, value: string) => {
        mem.set(name, value);
      },
      removeItem: (name: string) => {
        mem.delete(name);
      },
    },
  };
});

import { calcProjectTotals, calcRoom } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { computeObjectEconomics, type EconomicsSettings, type ObjectEconomics } from "@/lib/object-economics";
import type { HmsConfig, WinterdienstConfig } from "@/lib/service-modules/types";
import { DEMO_PROJECTS, type Project } from "@/store/use-store";
import {
  aggregatePortfolio,
  calcRateImpact,
  filterPortfolioRows,
  groupSliceColor,
  hoursByObject,
  objectRevenueSlices,
  portfolioModules,
  revenueByGroup,
  revenueByModule,
  roomGroupBreakdown,
  roomNachkalkulationVerdict,
  SETUP_SLICE_KEY,
  sumSlices,
  type PortfolioRow,
} from "./portfolio";

const SETTINGS: EconomicsSettings = {
  hourlyRate: 22.5,
  hourlyRateConfig: getDefaultConfig(),
  targetMargin: getDefaultConfig().gewinnmarge,
  disabledWarnings: [],
};

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
    { id: "t5", catalogId: "kleinreparaturen", label: "Kleinreparaturen", unit: "kontingent", quantity: 2, frequencyPerYear: 12, materialCostPerYear: 120, enabled: true },
  ],
};

const demo = (): Project[] => DEMO_PROJECTS.map((p) => JSON.parse(JSON.stringify(p)) as Project);

function econMap(projects: Project[], s: EconomicsSettings = SETTINGS): Map<string, ObjectEconomics> {
  const m = new Map<string, ObjectEconomics>();
  for (const p of projects) m.set(p.id, computeObjectEconomics(p, s));
  return m;
}

/** Bisherige Formeln aus pages/auswertung/index.tsx (vor der Überarbeitung). */
function legacyControlling(projects: Project[], hourlyRate: number) {
  let totalArea = 0;
  let totalHours = 0;
  let totalCost = 0;
  let totalRooms = 0;
  const groupMap = new Map<string, number>();
  for (const p of projects.filter((x) => x.status !== "archived")) {
    const rate = p.hourlyRate ?? hourlyRate;
    const t = calcProjectTotals(p, rate);
    totalArea += t.area;
    totalHours += t.hours;
    totalCost += t.cost;
    totalRooms += t.count;
    for (const r of p.rooms) groupMap.set(r.groupName, (groupMap.get(r.groupName) ?? 0) + calcRoom(r, rate).monthlyCost);
  }
  return { totalArea, totalHours, totalCost, totalRooms, avgPricePerSqm: totalArea > 0 ? totalCost / totalArea : 0, groupMap };
}

describe("aggregatePortfolio", () => {
  it("equals the legacy Controlling formulas for rooms-only demo data", () => {
    const projects = demo();
    projects[1].hourlyRate = 27.9; // eigener Satz
    const econs = econMap(projects);
    const agg = aggregatePortfolio([...econs.values()]);
    const legacy = legacyControlling(projects, SETTINGS.hourlyRate);

    expect(agg.objectCount).toBe(2);
    expect(agg.roomCount).toBe(legacy.totalRooms);
    expect(agg.priceMonthly).toBe(legacy.totalCost);
    expect(agg.priceAnnual).toBe(legacy.totalCost * 12);
    expect(agg.cleaningCost).toBe(legacy.totalCost);
    expect(agg.cleaningArea).toBe(legacy.totalArea);
    expect(agg.laborHoursMonthly).toBe(legacy.totalHours);
    expect(agg.cleaningPricePerSqm).toBe(legacy.avgPricePerSqm);
  });

  it("derives Ø Marge as Σ DB / Σ Umsatz", () => {
    const projects = demo();
    projects[0].winterdienst = WD_REF;
    const econs = [...econMap(projects).values()];
    const agg = aggregatePortfolio(econs);
    const price = econs.reduce((s, e) => s + e.totals.priceMonthly, 0);
    const db = econs.reduce((s, e) => s + e.totals.contributionMonthly, 0);
    const cost = econs.reduce((s, e) => s + e.totals.costMonthly, 0);
    expect(agg.priceMonthly).toBeCloseTo(price, 9);
    expect(agg.costMonthly).toBeCloseTo(cost, 9);
    expect(agg.contributionMonthly).toBeCloseTo(price - cost, 9);
    expect(agg.marginPct).toBeCloseTo((db / price) * 100, 9);
    // Reinigung €/m² bleibt auf Σ cleaning.cost / Σ cleaning.area
    const cleaningCost = econs.reduce((s, e) => s + e.totals.cleaning.cost, 0);
    const area = econs.reduce((s, e) => s + e.totals.cleaning.area, 0);
    expect(agg.cleaningPricePerSqm).toBeCloseTo(cleaningCost / area, 9);
  });

  it("returns zeros for an empty portfolio", () => {
    const agg = aggregatePortfolio([]);
    expect(agg.priceMonthly).toBe(0);
    expect(agg.marginPct).toBe(0);
    expect(agg.cleaningPricePerSqm).toBe(0);
  });
});

describe("revenueByModule", () => {
  it("sums to Σ priceMonthly with modules and uses the semantic chart colours", () => {
    const projects = demo();
    projects[0].ruestzeit = 15;
    projects[0].winterdienst = WD_REF;
    projects[1].hms = HMS_REF;
    const econs = [...econMap(projects).values()];
    const slices = revenueByModule(econs);
    expect(slices.map((s) => s.key)).toEqual(["reinigung", "ruest_wege", "winterdienst", "hms"]);
    expect(slices.map((s) => s.color)).toEqual([
      "hsl(var(--chart-1))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
    ]);
    const total = econs.reduce((s, e) => s + e.totals.priceMonthly, 0);
    expect(sumSlices(slices)).toBeCloseTo(total, 9);
  });

  it("drops empty components (rooms-only, no setup time)", () => {
    const econs = [...econMap(demo()).values()];
    const slices = revenueByModule(econs);
    expect(slices.map((s) => s.key)).toEqual(["reinigung"]);
    expect(sumSlices(slices)).toBeCloseTo(aggregatePortfolio(econs).priceMonthly, 9);
  });
});

describe("revenueByGroup", () => {
  it("matches the legacy room-group values and adds up to Σ cleaning.cost", () => {
    const projects = demo();
    const econs = econMap(projects);
    const slices = revenueByGroup(projects, econs);
    const legacy = legacyControlling(projects, SETTINGS.hourlyRate);
    expect(slices.some((s) => s.key === SETUP_SLICE_KEY)).toBe(false);
    for (const s of slices) expect(s.value).toBeCloseTo(legacy.groupMap.get(s.label) ?? NaN, 9);
    expect(slices).toHaveLength(legacy.groupMap.size);
    expect(sumSlices(slices)).toBeCloseTo(legacy.totalCost, 9);
    // absteigend sortiert
    for (let i = 1; i < slices.length; i++) expect(slices[i - 1].value).toBeGreaterThanOrEqual(slices[i].value);
  });

  it("adds a Rüst-/Wegezeit slice so the slices still sum to Σ cleaning.cost", () => {
    const projects = demo();
    projects[0].ruestzeit = 15;
    projects[1].wegezeit = 10;
    projects[1].hourlyRate = 30;
    projects[1].hms = HMS_REF; // Module zählen hier nicht mit
    const econs = econMap(projects);
    const slices = revenueByGroup(projects, econs);
    const setup = slices.find((s) => s.key === SETUP_SLICE_KEY);
    expect(setup?.label).toBe("Rüst-/Wegezeit");
    expect(setup?.color).toBe("hsl(var(--chart-4))");
    expect(setup!.value).toBeGreaterThan(0);
    const cleaning = [...econs.values()].reduce((s, e) => s + e.totals.cleaning.cost, 0);
    expect(sumSlices(slices)).toBeCloseTo(cleaning, 9);
  });

  it("shades room groups from chart-1", () => {
    expect(groupSliceColor(0, 1)).toBe("hsl(var(--chart-1))");
    expect(groupSliceColor(0, 3)).toBe("hsl(var(--chart-1) / 1)");
    expect(groupSliceColor(2, 3)).toBe("hsl(var(--chart-1) / 0.4)");
  });
});

describe("objectRevenueSlices", () => {
  it("adds up to priceMonthly for a rooms-only object (identity with calcProjectTotals)", () => {
    const p = demo()[0];
    p.ruestzeit = 20;
    const econ = computeObjectEconomics(p, SETTINGS);
    const slices = objectRevenueSlices(p, econ);
    expect(sumSlices(slices)).toBeCloseTo(calcProjectTotals(p, SETTINGS.hourlyRate).cost, 9);
    expect(slices.at(-1)?.key).toBe("ruest_wege");
  });

  it("adds module slices from totals.components", () => {
    const p = demo()[0];
    p.winterdienst = WD_REF;
    p.hms = HMS_REF;
    const econ = computeObjectEconomics(p, SETTINGS);
    const slices = objectRevenueSlices(p, econ);
    expect(slices.map((s) => s.key)).toContain("winterdienst");
    expect(slices.map((s) => s.key)).toContain("hms");
    expect(sumSlices(slices)).toBeCloseTo(econ.totals.priceMonthly, 9);
  });

  it("keeps the legacy detail-page group breakdown", () => {
    const p = demo()[0];
    const groups = roomGroupBreakdown(p, SETTINGS.hourlyRate);
    const office = groups.find((g) => g.name === "Büro & Verwaltung");
    const expected = p.rooms
      .filter((r) => r.groupName === "Büro & Verwaltung")
      .reduce((s, r) => s + calcRoom(r, SETTINGS.hourlyRate).monthlyCost, 0);
    expect(office?.cost).toBeCloseTo(expected, 12);
  });
});

describe("controlling detail figures", () => {
  it("keeps Gewinnbeitrag and margin bit-identical for rooms-only objects", () => {
    for (const p of demo()) {
      const econ = computeObjectEconomics(p, SETTINGS);
      const t = calcProjectTotals(p, SETTINGS.hourlyRate);
      const vollkosten = calcHourlyRate(SETTINGS.hourlyRateConfig).vollkosten;
      const gewinnbeitrag = t.cost - t.hours * vollkosten;
      expect(econ.totals.costMonthly).toBe(t.hours * vollkosten);
      expect(econ.totals.contributionMonthly).toBe(gewinnbeitrag);
      expect(econ.totals.marginPct).toBe(t.cost > 0 ? (gewinnbeitrag / t.cost) * 100 : 0);
    }
  });
});

describe("hoursByObject", () => {
  it("splits Ø monthly hours by component and sorts descending", () => {
    const projects = demo();
    projects[1].hms = HMS_REF;
    const econs = econMap(projects);
    const rows = hoursByObject(projects, econs);
    for (const r of rows) {
      expect(r.reinigung + r.ruest_wege + r.winterdienst + r.hms).toBeCloseTo(r.total, 9);
    }
    expect(rows[0].total).toBeGreaterThanOrEqual(rows[1].total);
    expect(rows.find((r) => r.id === "demo-2")!.hms).toBeGreaterThan(0);
  });
});

describe("roomNachkalkulationVerdict", () => {
  const p = demo()[0];
  const econ = computeObjectEconomics(p, SETTINGS);
  const planned = econ.totals.cleaning.hours;

  it("returns null without an entry", () => {
    expect(roomNachkalkulationVerdict(econ, undefined)).toBeNull();
  });

  it("maps verdicts like the Nachkalkulation card", () => {
    const im = roomNachkalkulationVerdict(econ, { actualMonthlyHours: planned, recordedAt: "2026-01-01" });
    expect(im).toMatchObject({ verdict: "im_plan", tone: "success", label: "Im Plan" });
    const better = roomNachkalkulationVerdict(econ, { actualMonthlyHours: planned * 0.9, recordedAt: "2026-01-01" });
    expect(better).toMatchObject({ verdict: "besser", tone: "success", label: "Besser als geplant" });
    const loss = roomNachkalkulationVerdict(econ, { actualMonthlyHours: planned * 3, recordedAt: "2026-01-01" });
    expect(loss).toMatchObject({ verdict: "schlechter", tone: "critical", label: "Kritisch – Verlust" });
    expect(loss!.result.actualMarginPct).toBeLessThan(0);
  });
});

describe("portfolio filters", () => {
  it("filters by module and status", () => {
    const projects = demo();
    projects[0].winterdienst = WD_REF;
    const econs = econMap(projects);
    const rows: PortfolioRow[] = projects.map((p, i) => ({
      project: p,
      econ: econs.get(p.id)!,
      status: i === 0 ? { key: "angebotsbereit", label: "Angebotsbereit", tone: "success" } : { key: "entwurf", label: "Entwurf", tone: "neutral" },
      modules: portfolioModules(p),
      verdict: null,
    }));
    expect(portfolioModules(projects[0])).toEqual(["unterhalt", "winterdienst"]);
    expect(filterPortfolioRows(rows, { module: "winterdienst", status: "all" }).map((r) => r.project.id)).toEqual(["demo-1"]);
    expect(filterPortfolioRows(rows, { module: "all", status: "entwurf" }).map((r) => r.project.id)).toEqual(["demo-2"]);
    expect(filterPortfolioRows(rows, { module: "hms", status: "all" })).toHaveLength(0);
    expect(filterPortfolioRows(rows, { module: "all", status: "all" })).toHaveLength(2);
  });

  it("treats a module-only object without rooms as not Unterhalt", () => {
    const p: Project = { ...demo()[0], rooms: [], hms: HMS_REF };
    expect(portfolioModules(p)).toEqual(["hms"]);
    expect(portfolioModules({ ...p, hms: { ...HMS_REF, enabled: false } })).toEqual(["unterhalt"]);
  });
});

describe("calcRateImpact", () => {
  it("counts objects without an own rate and sums the monthly price delta", () => {
    const projects = demo();
    projects[1].hourlyRate = 30; // eigener Satz → Preis unverändert
    const archived: Project = { ...demo()[0], id: "arch", status: "archived" };
    const next: EconomicsSettings = { ...SETTINGS, hourlyRate: 25 };
    const impact = calcRateImpact([...projects, archived], SETTINGS, next);
    expect(impact.affectedCount).toBe(1);
    const hours = calcProjectTotals(projects[0], 22.5).hours;
    expect(impact.deltaMonthly).toBeCloseTo(hours * 2.5, 9);
    expect(impact.newMonthly - impact.oldMonthly).toBeCloseTo(impact.deltaMonthly, 12);
  });

  it("reports no price change when only the cost configuration changes", () => {
    const cfg = getDefaultConfig();
    const next: EconomicsSettings = { ...SETTINGS, hourlyRateConfig: { ...cfg, baseLohn: cfg.baseLohn + 1 } };
    const impact = calcRateImpact(demo(), SETTINGS, next);
    expect(impact.affectedCount).toBe(2);
    expect(impact.deltaMonthly).toBe(0);
  });
});
