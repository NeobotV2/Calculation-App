import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* ── Mocks (vi.mock wird vor die Imports gehoben) ── */
const { calls, results, reload } = vi.hoisted(() => ({
  calls: [] as { table: string; op: string; payload?: unknown }[],
  /** Antwort des Fake-Clients je „table:op“ (fest oder abhängig vom Payload); sonst { data: null, error: null }. */
  results: new Map<string, { data: unknown; error: unknown } | ((payload: unknown) => { data: unknown; error: unknown })>(),
  reload: vi.fn(async () => {}),
}));

vi.mock("@/lib/capacitor-storage", () => ({
  default: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/hooks/use-supabase-sync", () => ({ useSupabaseSync: () => ({ reload }) }));
vi.mock("@/lib/supabase", () => {
  const from = (table: string) => {
    const state: { table: string; op: string; payload?: unknown } = { table, op: "select" };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      order: () => builder,
      single: () => builder,
      insert: (payload: unknown) => { state.op = "insert"; state.payload = payload; return builder; },
      update: (payload: unknown) => { state.op = "update"; state.payload = payload; return builder; },
      delete: () => { state.op = "delete"; return builder; },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
        calls.push({ ...state });
        const r = results.get(`${table}:${state.op}`);
        const value = typeof r === "function" ? r(state.payload) : r;
        return Promise.resolve(value ?? { data: null, error: null }).then(resolve, reject);
      },
    };
    return builder;
  };
  return { supabase: { from }, isSupabaseConfigured: true };
});

import {
  SERVICE_MODULES_MIGRATION_MESSAGE,
  ServiceModulesMigrationError,
  duplicateObject,
  isMissingServiceModuleColumn,
  updateObject,
} from "./object-service";
import { migrateDemoData, migrateDemoDataDetailed } from "./migration-service";
import { useStoreActions } from "@/hooks/use-store-actions";
import { createDefaultWinterdienst } from "@/data/winterdienst";
import type { Project } from "@/store/use-store";

/** PostgREST, Migration 005 fehlt bzw. Schema-Cache veraltet. */
const PGRST204 = {
  code: "PGRST204",
  message: "Could not find the 'winterdienst' column of 'cleaning_objects' in the schema cache",
  details: null,
  hint: null,
};
/** Postgres undefined_column. */
const PG42703 = { code: "42703", message: 'column "service_actuals" of relation "cleaning_objects" does not exist', details: null, hint: null };
const DENIED = { code: "42501", message: "permission denied for table cleaning_objects", details: null, hint: null };

const WD = createDefaultWinterdienst("flachland");

beforeEach(() => {
  calls.length = 0;
  results.clear();
  reload.mockClear();
  results.set("profiles:select", { data: { company_id: "company-1" }, error: null });
});

describe("isMissingServiceModuleColumn", () => {
  it("detects PGRST204 and 42703 for the module columns only", () => {
    expect(isMissingServiceModuleColumn(PGRST204)).toBe(true);
    expect(isMissingServiceModuleColumn(PG42703)).toBe(true);
    expect(isMissingServiceModuleColumn({ ...PGRST204, message: "Could not find the 'hms' column of 'cleaning_objects' in the schema cache" })).toBe(true);
    // Andere Spalte (z. B. Migration 004) oder anderer Fehler: allgemeine Meldung.
    expect(isMissingServiceModuleColumn({ ...PGRST204, message: "Could not find the 'object_type' column of 'cleaning_objects' in the schema cache" })).toBe(false);
    expect(isMissingServiceModuleColumn({ code: "23514", message: 'new row violates check constraint "cleaning_objects_winterdienst_is_object"' })).toBe(false);
    expect(isMissingServiceModuleColumn(DENIED)).toBe(false);
    expect(isMissingServiceModuleColumn(null)).toBe(false);
  });
});

describe("object-service — database without migration 005", () => {
  it("updateObject with a module throws the migration error", async () => {
    results.set("cleaning_objects:update", { data: null, error: PGRST204 });
    await expect(updateObject("o1", { winterdienst: WD })).rejects.toBeInstanceOf(ServiceModulesMigrationError);
    results.set("cleaning_objects:update", { data: null, error: PG42703 });
    await expect(updateObject("o1", { serviceActuals: { winterdienst: [] } })).rejects.toThrow(SERVICE_MODULES_MIGRATION_MESSAGE);
  });

  it("other update failures still return false; success returns true", async () => {
    results.set("cleaning_objects:update", { data: null, error: DENIED });
    await expect(updateObject("o1", { name: "X", ruestzeit: 10 })).resolves.toBe(false);
    results.delete("cleaning_objects:update");
    await expect(updateObject("o1", { name: "X" })).resolves.toBe(true);
    expect(calls.at(-1)?.payload).toEqual({ name: "X" });
  });

  it("duplicateObject with module plan throws the migration error; other failures give null", async () => {
    results.set("cleaning_objects:select", { data: { id: "o1", name: "Haus", winterdienst: WD }, error: null });
    results.set("cleaning_objects:insert", { data: null, error: PGRST204 });
    await expect(duplicateObject("o1")).rejects.toThrow(SERVICE_MODULES_MIGRATION_MESSAGE);
    results.set("cleaning_objects:insert", { data: null, error: DENIED });
    await expect(duplicateObject("o1")).resolves.toBeNull();
  });
});

describe("migrateDemoData — database without migration 005", () => {
  it("still transfers the rooms and the remaining objects", async () => {
    results.set("cleaning_objects:insert", { data: { id: "new-1" }, error: null });
    results.set("rooms:insert", { data: { id: "room-1" }, error: null });
    results.set("cleaning_objects:update", { data: null, error: PGRST204 });
    const base = { status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } as const;
    const projects: Project[] = [
      { ...base, id: "l1", name: "Mit Winterdienst", winterdienst: WD, rooms: [
        { id: "r1", name: "Büro", typeId: "t1", typeName: "Büro", groupId: "g1", groupName: "Büro", area: 50, frequency: "5x_week", typePerformance: 200 },
      ] },
      { ...base, id: "l2", name: "Zweites Objekt", rooms: [] },
    ];
    const ok = await migrateDemoData({
      projects, templates: [], customRoomTypes: [], companyName: "Firma", hourlyRate: 30, vatRate: 19,
      defaultFrequency: "5x_week", pdfHeader: "", pdfFooter: "",
    });
    expect(ok).toBe(false);
    expect(calls.filter((c) => c.table === "rooms" && c.op === "insert")).toHaveLength(1);
    expect(calls.filter((c) => c.table === "cleaning_objects" && c.op === "insert")).toHaveLength(2);
  });
});

describe("migrateDemoData — module columns missing, base fields still transferred", () => {
  it("sends rate, Rüst-/Wegezeit, status and texts without the modules and reports the missing migration", async () => {
    results.set("cleaning_objects:insert", { data: { id: "new-1" }, error: null });
    // Nur Updates mit Modul-Spalten scheitern (Datenbank ohne Migration 005).
    results.set("cleaning_objects:update", (payload) => {
      const p = payload as Record<string, unknown>;
      return "winterdienst" in p || "hms" in p || "service_actuals" in p ? { data: null, error: PGRST204 } : { data: null, error: null };
    });
    const project: Project = {
      id: "l1", name: "Lager", customer: "Kunde", location: "Hamburg", notes: "Schlüssel beim Pförtner", hourlyRate: 36.5,
      ruestzeit: 15, wegezeit: 20, status: "archived", objectType: "Lager", rpiContactName: "Herr K.",
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", rooms: [], winterdienst: WD,
    };
    const result = await migrateDemoDataDetailed({
      projects: [project], templates: [], customRoomTypes: [], companyName: "Firma", hourlyRate: 30, vatRate: 19,
      defaultFrequency: "5x_week", pdfHeader: "", pdfFooter: "",
    });
    expect(result).toEqual({ ok: false, migrationMissing: true });
    const updates = calls.filter((c) => c.table === "cleaning_objects" && c.op === "update");
    const base = updates.find((u) => !("winterdienst" in (u.payload as object)));
    expect(base?.payload).toEqual({
      location: "Hamburg", notes: "Schlüssel beim Pförtner", hourly_rate: 36.5, status: "archived",
      object_type: "Lager", contact_name: "Herr K.", ruestzeit: 15, wegezeit: 20,
    });
  });

  it("reports no missing migration for other failures", async () => {
    results.set("cleaning_objects:insert", { data: { id: "new-1" }, error: null });
    results.set("cleaning_objects:update", { data: null, error: DENIED });
    const result = await migrateDemoDataDetailed({
      projects: [{ id: "l1", name: "X", status: "active", createdAt: "", updatedAt: "", rooms: [], winterdienst: WD }],
      templates: [], customRoomTypes: [], companyName: "Firma", hourlyRate: 30, vatRate: 19,
      defaultFrequency: "5x_week", pdfHeader: "", pdfFooter: "",
    });
    expect(result).toEqual({ ok: false, migrationMissing: false });
  });
});

describe("useStoreActions — surfaces the migration message (cloud mode)", () => {
  function renderActions() {
    let actions: ReturnType<typeof useStoreActions> | null = null;
    function Probe() {
      actions = useStoreActions();
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    return actions!;
  }

  it("updateProject / duplicateProject reject with the migration message", async () => {
    const actions = renderActions();
    results.set("cleaning_objects:update", { data: null, error: PGRST204 });
    await expect(actions.updateProject("o1", { winterdienst: WD })).rejects.toThrow(SERVICE_MODULES_MIGRATION_MESSAGE);
    results.set("cleaning_objects:select", { data: { id: "o1", name: "Haus", hms: { schemaVersion: 1 } }, error: null });
    results.set("cleaning_objects:insert", { data: null, error: PGRST204 });
    await expect(actions.duplicateProject("o1")).rejects.toThrow(SERVICE_MODULES_MIGRATION_MESSAGE);
    expect(reload).not.toHaveBeenCalled();
  });

  it("saves without modules behave as before", async () => {
    const actions = renderActions();
    results.set("cleaning_objects:update", { data: null, error: DENIED });
    await expect(actions.updateProject("o1", { name: "X" })).rejects.toThrow("Objekt konnte nicht aktualisiert werden.");
    results.delete("cleaning_objects:update");
    await expect(actions.updateProject("o1", { name: "X" })).resolves.toBeUndefined();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
