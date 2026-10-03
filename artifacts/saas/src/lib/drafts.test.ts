import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/capacitor-storage", () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: (name: string) => mem.get(name) ?? null,
      setItem: (name: string, value: string) => { mem.set(name, value); },
      removeItem: (name: string) => { mem.delete(name); },
    },
  };
});

import {
  calcDraftFromProject,
  calcDraftFromTemplate,
  calcDraftFromTender,
  createEmptyCalcDraft,
  createEmptyTenderDraft,
  DEFAULT_RUESTZEIT_MINUTES,
  draftToProject,
  isCalcDraftEmpty,
  isTenderDraftEmpty,
  visibleFlowSteps,
} from "./drafts";
import { calcObjectTotals } from "./object-totals";
import type { HmsConfig, ModuleRates, WinterdienstConfig } from "./service-modules/types";
import { DEMO_PROJECTS, type Project, type Room, type Template } from "@/store/use-store";

const R: ModuleRates = { rate: 30, vollkosten: 24 };
const NOW = "2026-03-01T10:00:00.000Z";

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
const pAll = makeProject({ ruestzeit: 15, winterdienst: WD_REF, hms: HMS_REF });

const roundTrip = (p: Project) => draftToProject(calcDraftFromProject(p, NOW));

describe("calcDraftFromProject → draftToProject round trip", () => {
  for (const p of [...DEMO_PROJECTS, pAll]) {
    it(`keeps the totals of ${p.name}`, () => {
      expect(calcObjectTotals(roundTrip(p), R)).toEqual(calcObjectTotals(p, R));
    });
  }

  it("a project without ruestzeit keeps its price (ruestzeit ?? 0)", () => {
    const p = makeProject({ ruestzeit: undefined, wegezeit: undefined });
    const d = calcDraftFromProject(p, NOW);
    expect(d.ruestzeit).toBe(0);
    expect(d.ruestzeitIsDefault).toBe(false);
    expect(d.wegezeit).toBe(0);
    expect(calcObjectTotals(draftToProject(d), R).priceMonthly).toBe(calcObjectTotals(p, R).priceMonthly);
  });

  it("paused modules stay paused and module-only objects keep no rooms", () => {
    const paused = makeProject({ winterdienst: { ...WD_REF, enabled: false } });
    const d = calcDraftFromProject(paused, NOW);
    expect(d.modules).toEqual({ unterhalt: true, winterdienst: false, hms: false });
    expect(draftToProject(d).winterdienst?.enabled).toBe(false);
    expect(calcObjectTotals(draftToProject(d), R)).toEqual(calcObjectTotals(paused, R));

    const wdOnly = makeProject({ rooms: [], winterdienst: WD_REF });
    const d2 = calcDraftFromProject(wdOnly, NOW);
    expect(d2.modules).toEqual({ unterhalt: false, winterdienst: true, hms: false });
    expect(d2.visitedSteps).toEqual(["leistungen", "objekt", "winterdienst", "preis", "pruefen"]);
  });

  it("copies base data and deep-copies module configs", () => {
    const p = makeProject({ customer: "Kunde", location: "Berlin", notes: "N", objectType: "Büro", rpiContactName: "Frau M.", hourlyRate: 31.5, winterdienst: WD_REF, hms: HMS_REF });
    const d = calcDraftFromProject(p, NOW);
    expect(d.editingId).toBe("p1");
    expect(d.source).toBe("edit");
    expect(d.base).toEqual({ name: "Objekt", customer: "Kunde", location: "Berlin", notes: "N", objectType: "Büro", contactName: "Frau M.", rateInput: "31,5" });
    expect(d.winterdienst).toEqual(WD_REF);
    expect(d.winterdienst).not.toBe(WD_REF);
    expect(d.winterdienst!.areas).not.toBe(WD_REF.areas);
    expect(d.hmsPresetApplied).toBe(true);
    expect(d.savedAt).toBe(NOW);
    const back = draftToProject(d);
    expect(back).toMatchObject({ id: "p1", name: "Objekt", customer: "Kunde", location: "Berlin", notes: "N", objectType: "Büro", rpiContactName: "Frau M.", hourlyRate: 31.5 });
  });
});

describe("createEmptyCalcDraft", () => {
  it("starts with Unterhaltsreinigung and the default Rüstzeit", () => {
    const d = createEmptyCalcDraft(NOW);
    expect(d.modules).toEqual({ unterhalt: true, winterdienst: false, hms: false });
    expect(d.ruestzeit).toBe(DEFAULT_RUESTZEIT_MINUTES);
    expect(d.ruestzeit).toBe(15);
    expect(d.ruestzeitIsDefault).toBe(true);
    expect(d.wegezeit).toBe(0);
    expect(d.stepId).toBe("leistungen");
    expect(d.editingId).toBeNull();
    expect(d.source).toBe("blank");
    expect(isCalcDraftEmpty(d)).toBe(true);
  });

  it("isCalcDraftEmpty detects user input", () => {
    const d = createEmptyCalcDraft(NOW);
    expect(isCalcDraftEmpty({ ...d, base: { ...d.base, name: "X" } })).toBe(false);
    expect(isCalcDraftEmpty({ ...d, rooms: [makeRoom()] })).toBe(false);
    expect(isCalcDraftEmpty({ ...d, modules: { ...d.modules, hms: true } })).toBe(false);
    expect(isCalcDraftEmpty(calcDraftFromProject(makeProject(), NOW))).toBe(false);
  });
});

describe("calcDraftFromTemplate", () => {
  it("gives the rooms fresh ids and starts at the Objekt step", () => {
    const t: Template = { id: "tpl", name: "Büro Standard", createdAt: NOW, rooms: [
      { name: "A", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro", area: 50, frequency: "5x_week", typePerformance: 200 },
      { name: "B", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro", area: 30, frequency: "2x_week", typePerformance: 200 },
    ] };
    let n = 0;
    const d = calcDraftFromTemplate(t, () => `new-${++n}`, NOW);
    expect(d.rooms.map((r) => r.id)).toEqual(["new-1", "new-2"]);
    expect(d.rooms[0]).toMatchObject({ name: "A", area: 50 });
    expect(d.source).toBe("template");
    expect(d.sourceLabel).toBe("Büro Standard");
    expect(d.stepId).toBe("objekt");
    expect(d.ruestzeit).toBe(15);
    expect(d.editingId).toBeNull();
  });
});

describe("calcDraftFromTender", () => {
  it("uses ruestzeit 0 so the price matches the tender scenario", () => {
    let n = 0;
    const d = calcDraftFromTender(
      { name: "LV Rathaus", rooms: [makeRoom({ id: "lv-1" }), { ...makeRoom(), id: undefined } as unknown as Omit<Room, "id">], hourlyRate: 28.4, notes: "Aus Ausschreibungs-Kalkulation übernommen" },
      () => `t-${++n}`,
      NOW,
    );
    expect(d.ruestzeit).toBe(0);
    expect(d.ruestzeitIsDefault).toBe(false);
    expect(d.source).toBe("tender");
    expect(d.stepId).toBe("objekt");
    expect(d.base.name).toBe("LV Rathaus");
    expect(d.base.rateInput).toBe("28,4");
    expect(d.base.notes).toBe("Aus Ausschreibungs-Kalkulation übernommen");
    expect(d.rooms.map((r) => r.id)).toEqual(["t-1", "t-2"]);
    expect(draftToProject(d).hourlyRate).toBe(28.4);
    expect(draftToProject(d).ruestzeit).toBe(0);
  });

  it("leaves the rate empty without an own rate", () => {
    expect(calcDraftFromTender({ name: "X", rooms: [] }, () => "id", NOW).base.rateInput).toBe("");
  });
});

describe("draftToProject", () => {
  const d = { ...createEmptyCalcDraft(NOW), rooms: [makeRoom()], winterdienst: WD_REF, hms: HMS_REF };

  it("includes rooms only when Unterhaltsreinigung is selected", () => {
    expect(draftToProject(d).rooms).toHaveLength(1);
    expect(draftToProject({ ...d, modules: { ...d.modules, unterhalt: false } }).rooms).toEqual([]);
  });

  it("module enabled flags follow the selection; configs are kept", () => {
    const off = draftToProject(d);
    expect(off.winterdienst?.enabled).toBe(false);
    expect(off.hms?.enabled).toBe(false);
    const on = draftToProject({ ...d, modules: { unterhalt: true, winterdienst: true, hms: true } });
    expect(on.winterdienst?.enabled).toBe(true);
    expect(on.hms?.enabled).toBe(true);
    expect(draftToProject(createEmptyCalcDraft(NOW)).winterdienst).toBeUndefined();
  });

  it("parses the rate input with decimal comma and ignores invalid values", () => {
    const withRate = (rateInput: string) => draftToProject({ ...d, base: { ...d.base, rateInput } }).hourlyRate;
    expect(withRate("31,5")).toBe(31.5);
    expect(withRate("1.234,5")).toBe(1234.5);
    expect(withRate("29.9")).toBe(29.9);
    expect(withRate("")).toBeUndefined();
    expect(withRate("abc")).toBeUndefined();
    expect(withRate("0")).toBeUndefined();
    expect(withRate("-5")).toBeUndefined();
  });

  it("uses no silent fallback name and trims text fields", () => {
    const p = draftToProject({ ...d, base: { ...d.base, name: "  ", customer: " Kunde ", location: "" } });
    expect(p.name).toBe("");
    expect(p.customer).toBe("Kunde");
    expect(p.location).toBeUndefined();
    expect(p.id).toBe("flow-draft");
    expect(draftToProject(d, { id: "x", createdAt: "2025-01-01T00:00:00.000Z" })).toMatchObject({ id: "x", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: NOW });
  });
});

describe("visibleFlowSteps", () => {
  it("lists module steps only for selected modules", () => {
    expect(visibleFlowSteps({ unterhalt: true, winterdienst: false, hms: false })).toEqual(["leistungen", "objekt", "raeume", "preis", "pruefen"]);
    expect(visibleFlowSteps({ unterhalt: true, winterdienst: true, hms: true })).toEqual(["leistungen", "objekt", "raeume", "winterdienst", "hms", "preis", "pruefen"]);
  });
});

describe("TenderDraft", () => {
  it("createEmptyTenderDraft uses the previous page defaults", () => {
    const t = createEmptyTenderDraft(NOW);
    expect(t).toEqual({ version: 1, tenderName: "", rooms: [], warnings: [], fileName: null, rateInput: "", perfSpread: "15", rateSpread: "10", savedAt: NOW });
    expect(isTenderDraftEmpty(t)).toBe(true);
    expect(isTenderDraftEmpty({ ...t, tenderName: "LV" })).toBe(false);
  });
});
