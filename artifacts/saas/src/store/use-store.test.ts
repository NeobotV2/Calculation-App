import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Mocks (vi.mock wird vor die Imports gehoben) ── */
const { memory, dbCalls, dbRows } = vi.hoisted(() => ({
  /** In-Memory-StateStorage statt Capacitor/localStorage. */
  memory: new Map<string, string>(),
  /** Aufzeichnung aller Supabase-Aufrufe des Fake-Clients. */
  dbCalls: [] as { table: string; op: string; payload?: unknown }[],
  /** cleaning_objects-Zeilen, die der Fake-Client per eq("id", …) liefert. */
  dbRows: new Map<string, Record<string, unknown>>(),
}));

vi.mock("@/lib/capacitor-storage", () => ({
  default: {
    getItem: (name: string) => memory.get(name) ?? null,
    setItem: (name: string, value: string) => { memory.set(name, value); },
    removeItem: (name: string) => { memory.delete(name); },
  },
}));

vi.mock("@/lib/supabase", () => {
  let seq = 0;
  /** Verkettbarer Fake-Query-Builder: zeichnet op/payload auf und löst mit { data, error: null } auf. */
  const from = (table: string) => {
    const state: { table: string; op: string; payload?: unknown } = { table, op: "select" };
    let idFilter: unknown;
    const result = () => {
      if (state.op === "insert") return { data: { id: `${table}-${++seq}` }, error: null };
      if (table === "profiles") return { data: { company_id: "company-1" }, error: null };
      if (table === "cleaning_objects" && state.op === "select" && typeof idFilter === "string") {
        return { data: dbRows.get(idFilter) ?? null, error: null };
      }
      if (table === "rooms" && state.op === "select") return { data: [], error: null };
      return { data: null, error: null };
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, val: unknown) => { if (col === "id") idFilter = val; return builder; },
      in: () => builder,
      order: () => builder,
      single: () => builder,
      insert: (payload: unknown) => { state.op = "insert"; state.payload = payload; return builder; },
      update: (payload: unknown) => { state.op = "update"; state.payload = payload; return builder; },
      delete: () => { state.op = "delete"; return builder; },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
        dbCalls.push({ ...state });
        return Promise.resolve(result()).then(resolve, reject);
      },
    };
    return builder;
  };
  return { supabase: { from }, isSupabaseConfigured: true };
});

import { useStore, DEMO_PROJECTS, type Project } from "./use-store";
import { dbObjectToProject, updateObject, duplicateObject, type DbObject } from "@/services/object-service";
import { migrateDemoData } from "@/services/migration-service";
import { createEmptyCalcDraft, createEmptyTenderDraft } from "@/lib/drafts";
import type { HmsConfig, ServiceActuals, WinterdienstConfig } from "@/lib/service-modules/types";

const WD_REF: WinterdienstConfig = {
  schemaVersion: 1, enabled: true, region: "mittelgebirge", seasonMonths: [1, 2, 3, 11, 12],
  expectedEinsaetze: 45, clearingSharePct: 50,
  areas: [
    { id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true, material: "splitt" },
    { id: "a2", label: "Parkplatz", type: "parkplatz", areaM2: 800, method: "maschinell", clear: true, spread: true },
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
  ],
};
const ACTUALS: ServiceActuals = {
  winterdienst: [{ id: "w1", season: "2025/26", einsaetze: 31, recordedAt: "2026-04-01T00:00:00.000Z" }],
};

function seedProject(o: Partial<Project> = {}): string {
  const id = useStore.getState().addProject("Objekt", "Kunde");
  useStore.getState().updateProject(id, o);
  return id;
}
const byId = (id: string) => useStore.getState().projects.find((p) => p.id === id)!;

beforeEach(() => {
  useStore.getState().resetAll();
  dbCalls.length = 0;
});

describe("store — persistence contract", () => {
  it("keeps persist version 11 (no bump for the optional module fields)", () => {
    expect(useStore.persist.getOptions().version).toBe(11);
  });

  it("starts with empty draft slots", () => {
    expect(useStore.getState().calcDraft).toBeNull();
    expect(useStore.getState().tenderDraft).toBeNull();
  });

  it("rehydrating a v11 state without draft slots keeps them null", async () => {
    memory.set("cleancalc-storage", JSON.stringify({ state: { projects: [DEMO_PROJECTS[0]], hasOnboarded: true }, version: 11 }));
    await useStore.persist.rehydrate();
    expect(useStore.getState().projects.map((p) => p.id)).toEqual(["demo-1"]);
    expect(useStore.getState().calcDraft).toBeNull();
    expect(useStore.getState().tenderDraft).toBeNull();
    memory.clear();
  });

  it("persists the draft slots", () => {
    const draft = createEmptyCalcDraft("2026-01-01T00:00:00.000Z");
    useStore.getState().setCalcDraft(draft);
    const saved = JSON.parse(memory.get("cleancalc-storage") ?? "{}");
    expect(saved.state.calcDraft).toEqual(draft);
  });
});

describe("store — draft slots", () => {
  it("setCalcDraft / setTenderDraft set and clear the slots", () => {
    const d = createEmptyCalcDraft();
    const t = createEmptyTenderDraft();
    useStore.getState().setCalcDraft(d);
    useStore.getState().setTenderDraft(t);
    expect(useStore.getState().calcDraft).toBe(d);
    expect(useStore.getState().tenderDraft).toBe(t);
    useStore.getState().setCalcDraft(null);
    useStore.getState().setTenderDraft(null);
    expect(useStore.getState().calcDraft).toBeNull();
    expect(useStore.getState().tenderDraft).toBeNull();
  });

  it("resetAll clears both drafts", () => {
    useStore.getState().setCalcDraft(createEmptyCalcDraft());
    useStore.getState().setTenderDraft(createEmptyTenderDraft());
    useStore.getState().resetAll();
    expect(useStore.getState().calcDraft).toBeNull();
    expect(useStore.getState().tenderDraft).toBeNull();
  });

  it("clearSession clears drafts only when leaving a cloud session", () => {
    useStore.getState().setCalcDraft(createEmptyCalcDraft());
    useStore.setState({ isDemo: true });
    useStore.getState().clearSession();
    expect(useStore.getState().calcDraft).not.toBeNull();

    useStore.setState({ isDemo: false, isLoggedIn: true });
    useStore.getState().setTenderDraft(createEmptyTenderDraft());
    useStore.getState().clearSession();
    expect(useStore.getState().calcDraft).toBeNull();
    expect(useStore.getState().tenderDraft).toBeNull();
  });

  it("drafts are not part of the export", () => {
    useStore.getState().setCalcDraft(createEmptyCalcDraft());
    const exported = JSON.parse(useStore.getState().exportData());
    expect(exported).not.toHaveProperty("calcDraft");
    expect(exported).not.toHaveProperty("tenderDraft");
  });
});

describe("store — service modules", () => {
  it("duplicateProject deep-copies the module configs and drops the actuals", () => {
    const id = seedProject({ winterdienst: WD_REF, hms: HMS_REF, serviceActuals: ACTUALS });
    const dupId = useStore.getState().duplicateProject(id);
    const original = byId(id);
    const dup = byId(dupId);
    expect(dup.serviceActuals).toBeUndefined();
    expect(original.serviceActuals).toEqual(ACTUALS);
    expect(dup.winterdienst).toEqual(original.winterdienst);
    expect(dup.winterdienst).not.toBe(original.winterdienst);
    expect(dup.hms).toEqual(original.hms);
    expect(dup.hms).not.toBe(original.hms);
    dup.winterdienst!.areas[0].areaM2 = 999;
    dup.hms!.tasks[0].quantity = 7;
    expect(byId(id).winterdienst!.areas[0].areaM2).toBe(120);
    expect(byId(id).hms!.tasks[0].quantity).toBe(1);
  });

  it("duplicateProject without modules leaves them undefined", () => {
    const dup = byId(useStore.getState().duplicateProject(seedProject()));
    expect(dup.winterdienst).toBeUndefined();
    expect(dup.hms).toBeUndefined();
  });

  it("updateProject({ winterdienst: undefined }) removes the module", () => {
    const id = seedProject({ winterdienst: WD_REF, hms: HMS_REF });
    useStore.getState().updateProject(id, { winterdienst: undefined });
    expect(byId(id).winterdienst).toBeUndefined();
    expect(byId(id).hms).toEqual(HMS_REF);
  });

  it("importData sanitizes modules and keeps the project when a module is invalid", () => {
    const base = { id: "x1", name: "Import", status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", rooms: [] };
    const ok = useStore.getState().importData(JSON.stringify({
      projects: [
        { ...base, winterdienst: "abc", hms: [1], serviceActuals: { winterdienst: [{ season: "x", einsaetze: -1 }] } },
        { ...base, id: "x2", winterdienst: { enabled: "yes" } },
        { ...base, id: "x3", winterdienst: WD_REF, hms: HMS_REF, serviceActuals: ACTUALS },
        { id: 5, name: "kaputt", rooms: [] },
      ],
    }));
    expect(ok).toBe(true);
    const projects = useStore.getState().projects;
    expect(projects.map((p) => p.id)).toEqual(["x1", "x2", "x3"]);
    expect(projects[0]).not.toHaveProperty("winterdienst");
    expect(projects[0]).not.toHaveProperty("hms");
    expect(projects[0]).not.toHaveProperty("serviceActuals");
    expect(projects[1].winterdienst?.enabled).toBe(false);
    expect(projects[2].winterdienst).toEqual(WD_REF);
    expect(projects[2].hms).toEqual(HMS_REF);
    expect(projects[2].serviceActuals?.winterdienst?.[0].einsaetze).toBe(31);
  });

  it("export → import round-trips module data", () => {
    seedProject({ winterdienst: WD_REF, hms: HMS_REF, serviceActuals: ACTUALS });
    const json = useStore.getState().exportData();
    useStore.getState().resetAll();
    expect(useStore.getState().importData(json)).toBe(true);
    const p = useStore.getState().projects[0];
    expect(p.winterdienst).toEqual(WD_REF);
    expect(p.hms).toEqual(HMS_REF);
  });

  it("exposes the demo projects", () => {
    expect(DEMO_PROJECTS.map((p) => p.id)).toEqual(["demo-1", "demo-2"]);
  });
});

describe("object-service — module columns", () => {
  const row: DbObject = {
    id: "o1", company_id: "c1", name: "Objekt", customer: null, location: null, notes: null, hourly_rate: null,
    object_type: null, contact_name: null, ruestzeit: null, wegezeit: null, status: "active",
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("dbObjectToProject: missing columns give undefined (before migration 005)", () => {
    const p = dbObjectToProject(row, []);
    expect(p.winterdienst).toBeUndefined();
    expect(p.hms).toBeUndefined();
    expect(p.serviceActuals).toBeUndefined();
  });

  it("dbObjectToProject runs the sanitizers", () => {
    const p = dbObjectToProject({ ...row, winterdienst: { enabled: "yes", areas: [{ type: "dach" }] }, hms: JSON.parse(JSON.stringify(HMS_REF)), service_actuals: ACTUALS }, []);
    expect(p.winterdienst?.enabled).toBe(false);
    expect(p.winterdienst?.areas[0].type).toBe("sonstige");
    expect(p.hms).toEqual(HMS_REF);
    expect(p.serviceActuals?.winterdienst?.[0].season).toBe("2025/26");
  });

  it("updateObject maps the modules only when the key is present", async () => {
    await updateObject("o1", { name: "Neu" });
    expect(dbCalls.at(-1)?.payload).toEqual({ name: "Neu" });

    await updateObject("o1", { winterdienst: WD_REF });
    expect(dbCalls.at(-1)?.payload).toEqual({ winterdienst: WD_REF });

    await updateObject("o1", { winterdienst: undefined, hms: undefined, serviceActuals: undefined });
    expect(dbCalls.at(-1)?.payload).toEqual({ winterdienst: null, hms: null, service_actuals: null });

    await updateObject("o1", { serviceActuals: ACTUALS });
    expect(dbCalls.at(-1)?.payload).toEqual({ service_actuals: ACTUALS });
  });

  it("updateObject clears optional text columns when the key is present but empty", async () => {
    await updateObject("o1", { customer: undefined, location: "", notes: undefined, objectType: undefined, rpiContactName: "" });
    expect(dbCalls.at(-1)?.payload).toEqual({ customer: null, location: null, notes: null, object_type: null, contact_name: null });

    await updateObject("o1", { customer: "Kunde", location: "Ort" });
    expect(dbCalls.at(-1)?.payload).toEqual({ customer: "Kunde", location: "Ort" });
  });

  it("duplicateObject copies the plan only when present, never the actuals", async () => {
    dbRows.set("with-modules", { ...row, id: "with-modules", winterdienst: WD_REF, hms: HMS_REF, service_actuals: ACTUALS });
    dbRows.set("plain", { ...row, id: "plain" });

    expect(await duplicateObject("with-modules")).not.toBeNull();
    const withModules = dbCalls.filter((c) => c.table === "cleaning_objects" && c.op === "insert").at(-1)?.payload as Record<string, unknown>;
    expect(withModules.winterdienst).toEqual(WD_REF);
    expect(withModules.hms).toEqual(HMS_REF);
    expect(withModules).not.toHaveProperty("service_actuals");
    expect(withModules.name).toBe("Objekt (Kopie)");

    expect(await duplicateObject("plain")).not.toBeNull();
    const plain = dbCalls.filter((c) => c.table === "cleaning_objects" && c.op === "insert").at(-1)?.payload as Record<string, unknown>;
    expect(plain).not.toHaveProperty("winterdienst");
    expect(plain).not.toHaveProperty("hms");

    expect(await duplicateObject("missing")).toBeNull();
  });
});

describe("migration-service — forwards all object fields", () => {
  it("always calls updateObject with objectType, contact, Rüst-/Wegezeit and modules", async () => {
    const project: Project = {
      id: "local-1", name: "Lokal", customer: "Kunde", status: "active", objectType: "Büro", rpiContactName: "Frau M.",
      ruestzeit: 15, wegezeit: 5, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      rooms: [], winterdienst: WD_REF, hms: HMS_REF, serviceActuals: ACTUALS,
    };
    const ok = await migrateDemoData({
      projects: [project], templates: [], customRoomTypes: [], companyName: "Firma", hourlyRate: 30, vatRate: 19,
      defaultFrequency: "5x_week", pdfHeader: "", pdfFooter: "",
    });
    expect(ok).toBe(true);
    const update = dbCalls.find((c) => c.table === "cleaning_objects" && c.op === "update");
    expect(update?.payload).toMatchObject({
      object_type: "Büro", contact_name: "Frau M.", ruestzeit: 15, wegezeit: 5, status: "active",
      winterdienst: WD_REF, hms: HMS_REF, service_actuals: ACTUALS,
    });
  });

  it("also updates objects without location, notes or rate (no data loss)", async () => {
    const project: Project = {
      id: "local-2", name: "Minimal", status: "active", objectType: "Praxis", ruestzeit: 10,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", rooms: [],
    };
    await migrateDemoData({
      projects: [project], templates: [], customRoomTypes: [], companyName: "Firma", hourlyRate: 30, vatRate: 19,
      defaultFrequency: "5x_week", pdfHeader: "", pdfFooter: "",
    });
    const update = dbCalls.find((c) => c.table === "cleaning_objects" && c.op === "update");
    expect(update?.payload).toMatchObject({ object_type: "Praxis", ruestzeit: 10 });
    expect(update?.payload).not.toHaveProperty("winterdienst");
  });
});
