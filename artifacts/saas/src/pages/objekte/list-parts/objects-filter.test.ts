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

import {
  DEFAULT_OBJECTS_FILTER,
  HIGH_HOURS_THRESHOLD,
  buildObjectRow,
  countObjectsByTab,
  filterObjectRows,
  formatPercent,
  getObjectModules,
  hasActiveObjectFilters,
  matchesObjectChip,
  matchesObjectSearch,
  objectSortValue,
  sortObjectRows,
  type ObjectRow,
  type ObjectsFilterState,
} from "./objects-filter";
import { computeObjectEconomics, type EconomicsSettings } from "@/lib/object-economics";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { calcProjectTotals } from "@/lib/calc";
import { markupToRevenueMargin } from "@/lib/price-strategy";
import type { CompanyInfo } from "@/lib/offer-readiness";
import type { HmsConfig, WinterdienstConfig } from "@/lib/service-modules/types";
import type { Project, Room } from "@/store/use-store";

const config = getDefaultConfig();
const SETTINGS: EconomicsSettings = {
  hourlyRate: 34,
  hourlyRateConfig: config,
  targetMargin: config.gewinnmarge,
  disabledWarnings: [],
};
const COMPANY: CompanyInfo = {
  companyName: "Glanz GmbH",
  companyStreet: "Hauptstraße 1",
  companyZip: "10115",
  companyCity: "Berlin",
};

const room = (o: Partial<Room> = {}): Room => ({
  id: "r1",
  name: "Büro",
  typeId: "t1",
  typeName: "Büro",
  groupId: "g1",
  groupName: "Büro",
  area: 100,
  frequency: "5x_week",
  typePerformance: 200,
  ...o,
});

const project = (o: Partial<Project> = {}): Project => ({
  id: "p1",
  name: "Objekt",
  customer: "Kunde",
  location: "Berlin",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ruestzeit: 15,
  rooms: [room()],
  ...o,
});

const WD: WinterdienstConfig = {
  schemaVersion: 1,
  enabled: true,
  region: "mittelgebirge",
  seasonMonths: [1, 2, 3, 11, 12],
  expectedEinsaetze: 45,
  clearingSharePct: 50,
  areas: [{ id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" }],
  material: "salz",
  materialMarkupPct: 20,
  saltRestricted: false,
  travelMinutesPerEinsatz: 15,
  documentationMinutesPerEinsatz: 5,
  seasonSetupHours: 2,
  standbyFeeMonthly: 50,
  standbyCostMonthly: 25,
  offHoursSharePct: 50,
  offHoursSurchargePct: 25,
  liabilitySurchargePct: 10,
  riskProvisionPct: 100,
  machineRatePerHour: 45,
  machineCostPerHour: 35,
  billingMode: "pauschale_12",
  clearingWindowHours: 3,
};

const HMS: HmsConfig = {
  schemaVersion: 1,
  enabled: true,
  travelMinutesPerVisitDay: 10,
  materialMarkupPct: 15,
  contingentOverageBilled: true,
  tasks: [
    { id: "t1", catalogId: "kontrollgang", label: "Kontrollgang", unit: "pauschal", quantity: 1, minutesPerUnit: 30, frequencyPerYear: 52, enabled: true },
  ],
};

const row = (p: Project): ObjectRow => buildObjectRow(p, computeObjectEconomics(p, SETTINGS), COMPANY);

const filter = (o: Partial<ObjectsFilterState>): ObjectsFilterState => ({ ...DEFAULT_OBJECTS_FILTER, ...o });

const ids = (rows: ObjectRow[]) => rows.map((r) => r.project.id);

/* Portfolio:
   a: rooms-only, eigener Satz unter Vollkosten → kritisch
   b: rooms-only, globaler Satz 34 € (über Zielsatz ≈ 32,90 €) → gesund
   c: rooms-only, viele Stunden (> 80 h) mit gutem Satz
   d: mit Winterdienst
   e: mit HMS, ohne Räume
   f: archiviert */
const breakdown = calcHourlyRate(config);
const big = [room({ id: "r1", area: 4000, frequency: "5x_week", typePerformance: 200 })];
const projects: Project[] = [
  project({ id: "a", name: "Arztpraxis", customer: "Dr. Schmidt", hourlyRate: breakdown.vollkosten - 1 }),
  project({ id: "b", name: "Bürogebäude Mitte", customer: "Muster GmbH", location: "München" }),
  project({ id: "c", name: "Großobjekt", rooms: big, updatedAt: "2026-03-01T00:00:00.000Z" }),
  project({ id: "d", name: "Lager Nord", winterdienst: WD, updatedAt: "2026-02-01T00:00:00.000Z" }),
  project({ id: "e", name: "Wohnanlage", rooms: [], hms: HMS }),
  project({ id: "f", name: "Altobjekt", status: "archived" }),
  project({ id: "g", name: "Praxis Süd", hourlyRate: 31.5, updatedAt: "2025-12-01T00:00:00.000Z" }),
];
const rows = projects.map(row);

describe("getObjectModules", () => {
  it("counts Unterhaltsreinigung for rooms or when no other module is active", () => {
    expect(getObjectModules(project())).toEqual(["unterhalt"]);
    expect(getObjectModules(project({ rooms: [] }))).toEqual(["unterhalt"]);
    expect(getObjectModules(project({ winterdienst: WD }))).toEqual(["unterhalt", "winterdienst"]);
    expect(getObjectModules(project({ rooms: [], hms: HMS }))).toEqual(["hms"]);
    expect(getObjectModules(project({ rooms: [], hms: { ...HMS, enabled: false } }))).toEqual(["unterhalt"]);
  });
});

describe("legacy parity for rooms-only objects", () => {
  for (const p of projects.filter((x) => !x.winterdienst && !x.hms)) {
    it(`${p.name}: price, margin and hours equal the pre-overhaul list values`, () => {
      const r = row(p);
      const rate = p.hourlyRate ?? SETTINGS.hourlyRate;
      const legacyTotals = calcProjectTotals(p, rate);
      const legacyMargin = ((rate - breakdown.vollkosten) / rate) * 100;
      expect(r.econ.totals.priceMonthly).toBe(legacyTotals.cost);
      expect(r.econ.totals.laborHoursMonthly).toBe(legacyTotals.hours);
      expect(r.econ.totals.cleaning.area).toBe(legacyTotals.area);
      expect(r.econ.strategy.marginPct).toBeCloseTo(legacyMargin, 10);
      // „Schwach kalkuliert" = bisher „Marge < Zielwert (Umsatzbasis)"
      const legacyWeak = legacyMargin < markupToRevenueMargin(SETTINGS.targetMargin);
      expect(matchesObjectChip(r, "weak")).toBe(legacyWeak);
    });
  }
});

describe("filterObjectRows", () => {
  it("tab Aktiv / Archiviert", () => {
    expect(ids(filterObjectRows(rows, filter({ tab: "active" })))).toEqual(["a", "b", "c", "d", "e", "g"]);
    expect(ids(filterObjectRows(rows, filter({ tab: "archived" })))).toEqual(["f"]);
  });

  it("chip Schwach kalkuliert = strategy.status ≠ gesund", () => {
    const weak = filterObjectRows(rows, filter({ chip: "weak" }));
    expect(ids(weak)).toContain("a");
    expect(ids(weak)).toContain("g");
    expect(ids(weak)).not.toContain("b");
    for (const r of weak) expect(r.econ.strategy.status).not.toBe("gesund");
  });

  it("chip Hoher Stundenanteil uses laborHoursMonthly > threshold", () => {
    const high = filterObjectRows(rows, filter({ chip: "high_hours" }));
    expect(ids(high)).toEqual(["c"]);
    expect(rows.find((r) => r.project.id === "c")!.econ.totals.laborHoursMonthly).toBeGreaterThan(HIGH_HOURS_THRESHOLD);
  });

  it("chip Prüfung offen = status pruefung_offen", () => {
    const review = filterObjectRows(rows, filter({ chip: "review" }));
    for (const r of review) expect(r.status.key).toBe("pruefung_offen");
    // Objekt a liegt unter Vollkosten → kritisch → Prüfung offen
    expect(ids(review)).toContain("a");
  });

  it("module filter", () => {
    expect(ids(filterObjectRows(rows, filter({ module: "winterdienst" })))).toEqual(["d"]);
    expect(ids(filterObjectRows(rows, filter({ module: "hms" })))).toEqual(["e"]);
  });

  it("search matches name, customer and location, case-insensitively", () => {
    expect(ids(filterObjectRows(rows, filter({ search: "büro" })))).toEqual(["b"]);
    expect(ids(filterObjectRows(rows, filter({ search: "SCHMIDT" })))).toEqual(["a"]);
    expect(ids(filterObjectRows(rows, filter({ search: " münchen " })))).toEqual(["b"]);
    expect(ids(filterObjectRows(rows, filter({ search: "xyz" })))).toEqual([]);
    expect(matchesObjectSearch(project({ customer: undefined, location: undefined }), "objekt")).toBe(true);
  });

  it("combines filters (AND)", () => {
    expect(ids(filterObjectRows(rows, filter({ chip: "weak", search: "arzt" })))).toEqual(["a"]);
    expect(ids(filterObjectRows(rows, filter({ tab: "archived", search: "arzt" })))).toEqual([]);
  });

  it("hasActiveObjectFilters ignores the tab", () => {
    expect(hasActiveObjectFilters(DEFAULT_OBJECTS_FILTER)).toBe(false);
    expect(hasActiveObjectFilters(filter({ tab: "archived" }))).toBe(false);
    expect(hasActiveObjectFilters(filter({ search: "a" }))).toBe(true);
    expect(hasActiveObjectFilters(filter({ chip: "weak" }))).toBe(true);
    expect(hasActiveObjectFilters(filter({ module: "hms" }))).toBe(true);
  });

  it("countObjectsByTab", () => {
    expect(countObjectsByTab(rows)).toEqual({ active: 6, archived: 1 });
  });
});

describe("sortObjectRows", () => {
  it("updated desc by default order", () => {
    const sorted = sortObjectRows(rows, { id: "updated", dir: "desc" });
    expect(ids(sorted).slice(0, 2)).toEqual(["c", "d"]);
  });

  it("price asc/desc and stable ties", () => {
    const asc = sortObjectRows(rows, { id: "price", dir: "asc" });
    for (let i = 1; i < asc.length; i++) {
      expect(objectSortValue(asc[i], "price") as number).toBeGreaterThanOrEqual(objectSortValue(asc[i - 1], "price") as number);
    }
    const desc = sortObjectRows(rows, { id: "price", dir: "desc" });
    expect(ids(desc)[0]).toBe("c");
  });

  it("name uses German collation", () => {
    const sorted = sortObjectRows(rows, { id: "name", dir: "asc" });
    expect(ids(sorted)).toEqual(["f", "a", "b", "c", "d", "g", "e"]);
  });

  it("status puts Prüfung offen first", () => {
    const sorted = sortObjectRows(rows, { id: "status", dir: "asc" });
    expect(sorted[0].status.key).toBe("pruefung_offen");
    expect(sorted[sorted.length - 1].status.key).toBe("archiviert");
  });

  it("does not mutate the input", () => {
    const before = ids(rows);
    sortObjectRows(rows, { id: "margin", dir: "asc" });
    expect(ids(rows)).toEqual(before);
  });
});

describe("formatPercent", () => {
  it("one decimal, German comma, typographic minus", () => {
    expect(formatPercent(9.0909)).toBe("9,1 %");
    expect(formatPercent(-32.94)).toBe("−32,9 %");
    expect(formatPercent(-0.01)).toBe("0,0 %");
    expect(formatPercent(Number.NaN)).toBe("–");
  });
});
