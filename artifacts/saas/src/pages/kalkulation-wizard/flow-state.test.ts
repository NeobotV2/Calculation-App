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
  adjacentStep,
  buildCreatePlan,
  buildCreateUpdates,
  buildEditUpdates,
  canSelectStep,
  changedFields,
  diffRooms,
  draftContentKey,
  firstIncompleteStep,
  flowReducer,
  initFlowDraft,
  isForeignStoredDraft,
  storedDraftLabel,
  effectiveEditDraft,
  isDraftDirty,
  mergeEditDraft,
  mergeRooms,
  rebaseEditDraft,
  withEditBase,
  rateInputFrom,
  resolveStep,
  roundUpRate,
  shouldReopenSavedFlow,
  stableStringify,
  stepBlock,
  stepStatus,
  visibleSteps,
  type FlowAction,
} from "./flow-state";
import {
  calcDraftFromProject,
  calcDraftFromTemplate,
  createEmptyCalcDraft,
  draftToProject,
  type CalcDraft,
} from "@/lib/drafts";
import { calcProjectTotals } from "@/lib/calc";
import { computeObjectEconomics, type EconomicsSettings } from "@/lib/object-economics";
import { getDefaultConfig } from "@/lib/hourly-rate-calc";
import { createDefaultWinterdienst } from "@/data/winterdienst";
import type { WinterdienstConfig } from "@/lib/service-modules/types";
import type { Project, Room } from "@/store/use-store";

const NOW = "2026-03-01T10:00:00.000Z";
const NO_FINDINGS = { moduleFindings: [] as { idSuffix: string }[] };

const makeRoom = (o: Partial<Room> = {}): Room => ({
  id: "r1", name: "Büro 1", typeId: "buero", typeName: "Einzelbüro", groupId: "g1", groupName: "Büro",
  area: 100, frequency: "5x_week", typePerformance: 200, ...o,
});

const makeProject = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Musterhaus", status: "active", createdAt: NOW, updatedAt: NOW,
  rooms: [makeRoom(), makeRoom({ id: "r2", name: "Flur", area: 40, frequency: "3x_week" })],
  ...o,
});

const WD: WinterdienstConfig = {
  ...createDefaultWinterdienst("flachland"),
  areas: [{ id: "a1", label: "Gehweg", type: "gehweg", areaM2: 120, method: "manuell", clear: true, spread: true }],
};

const SETTINGS: EconomicsSettings = {
  hourlyRate: 22.5,
  hourlyRateConfig: getDefaultConfig(),
  targetMargin: 15,
  disabledWarnings: [],
};

const run = (draft: CalcDraft, ...actions: FlowAction[]) => actions.reduce(flowReducer, draft);

describe("module visibility", () => {
  it("shows module steps only for selected modules", () => {
    const d = createEmptyCalcDraft(NOW);
    expect(visibleSteps(d)).toEqual(["leistungen", "objekt", "raeume", "preis", "pruefen"]);
    const all = run(d, { type: "toggleModule", module: "winterdienst", on: true }, { type: "toggleModule", module: "hms", on: true });
    expect(visibleSteps(all)).toEqual(["leistungen", "objekt", "raeume", "winterdienst", "hms", "preis", "pruefen"]);
  });

  it("only Winterdienst ⇒ Leistungen, Objekt, Winterdienst, Preis, Prüfen", () => {
    const d = run(
      createEmptyCalcDraft(NOW),
      { type: "toggleModule", module: "winterdienst", on: true },
      { type: "toggleModule", module: "unterhalt", on: false },
    );
    expect(visibleSteps(d)).toEqual(["leistungen", "objekt", "winterdienst", "preis", "pruefen"]);
  });

  it("first Winterdienst check creates the Flachland default config; unchecking keeps it", () => {
    const on = run(createEmptyCalcDraft(NOW), { type: "toggleModule", module: "winterdienst", on: true });
    expect(on.winterdienst).toEqual(createDefaultWinterdienst("flachland"));
    expect(on.winterdienst?.enabled).toBe(true);
    expect(on.winterdienst?.areas).toEqual([]);
    const edited = run(on, { type: "setWinterdienst", config: WD });
    const off = run(edited, { type: "toggleModule", module: "winterdienst", on: false });
    expect(off.modules.winterdienst).toBe(false);
    expect(off.winterdienst).toBe(WD);
    const back = run(off, { type: "toggleModule", module: "winterdienst", on: true });
    expect(back.winterdienst).toBe(WD);
  });

  it("first HMS check creates an empty HMS config (preset is offered later)", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "toggleModule", module: "hms", on: true });
    expect(d.hms?.tasks).toEqual([]);
    expect(d.hms?.enabled).toBe(true);
    expect(d.hmsPresetApplied).toBe(false);
  });

  it("applyHmsPreset replaces the tasks but keeps the module settings", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "toggleModule", module: "hms", on: true });
    const tuned = run(d, { type: "setHms", config: { ...d.hms!, travelMinutesPerVisitDay: 25, materialMarkupPct: 7 } });
    const task = { id: "t1", label: "Kontrollgang", unit: "pauschal" as const, quantity: 1, minutesPerUnit: 30, frequencyPerYear: 52, enabled: true };
    const next = run(tuned, { type: "applyHmsPreset", tasks: [task] });
    expect(next.hms?.tasks).toEqual([task]);
    expect(next.hms?.travelMinutesPerVisitDay).toBe(25);
    expect(next.hms?.materialMarkupPct).toBe(7);
    expect(next.hmsPresetApplied).toBe(true);
  });
});

describe("Unterhaltsreinigung toggle", () => {
  it("unchecking in create mode clears the rooms", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "addRoom", room: makeRoom() }, { type: "toggleModule", module: "unterhalt", on: false });
    expect(d.modules.unterhalt).toBe(false);
    expect(d.rooms).toEqual([]);
  });

  it("is a no-op in edit mode while rooms exist", () => {
    const d = calcDraftFromProject(makeProject(), NOW);
    expect(run(d, { type: "toggleModule", module: "unterhalt", on: false })).toBe(d);
  });

  it("a create draft with Unterhalt unchecked never yields addRoom calls", () => {
    const base = run(createEmptyCalcDraft(NOW), { type: "addRoom", room: makeRoom() }, { type: "toggleModule", module: "winterdienst", on: true });
    expect(buildCreatePlan(run(base, { type: "toggleModule", module: "unterhalt", on: false })).rooms).toEqual([]);
    // Auch ein (z. B. wiederhergestellter) Entwurf mit Räumen, aber abgewählter Leistung:
    const forced: CalcDraft = { ...base, modules: { ...base.modules, unterhalt: false } };
    expect(forced.rooms.length).toBe(1);
    expect(buildCreatePlan(forced).rooms).toEqual([]);
  });
});

describe("Weiter blocking (Leistungen / Objekt only)", () => {
  it("blocks Leistungen without any module", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "toggleModule", module: "unterhalt", on: false });
    expect(stepBlock("leistungen", d)).toBe("no_module");
    expect(stepBlock("leistungen", createEmptyCalcDraft(NOW))).toBeNull();
  });

  it("blocks Objekt without a (non-blank) name", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "setBase", patch: { name: "   " } });
    expect(stepBlock("objekt", d)).toBe("name_missing");
    expect(stepBlock("objekt", run(d, { type: "setBase", patch: { name: "Haus A" } }))).toBeNull();
  });

  it("never blocks the other steps", () => {
    const d = createEmptyCalcDraft(NOW);
    for (const s of ["raeume", "winterdienst", "hms", "preis", "pruefen"] as const) expect(stepBlock(s, d)).toBeNull();
  });
});

describe("step status and navigation", () => {
  it("marks steps complete / incomplete", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "toggleModule", module: "winterdienst", on: true });
    const status = stepStatus(d, { moduleFindings: [{ idSuffix: "wd_areas" }] });
    expect(status.map((s) => [s.id, s.completion])).toEqual([
      ["leistungen", "complete"],
      ["objekt", "incomplete"],
      ["raeume", "incomplete"],
      ["winterdienst", "incomplete"],
      ["preis", "complete"],
      ["pruefen", "none"],
    ]);
    expect(firstIncompleteStep(d, NO_FINDINGS)).toBe("objekt");
  });

  it("resolves the URL step: valid ⇒ it, hidden/invalid ⇒ first incomplete, none ⇒ stored step", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "setBase", patch: { name: "Haus" } });
    expect(resolveStep("preis", d, NO_FINDINGS)).toBe("preis");
    expect(resolveStep("winterdienst", d, NO_FINDINGS)).toBe("raeume");
    expect(resolveStep("quatsch", d, NO_FINDINGS)).toBe("raeume");
    expect(resolveStep(undefined, d, NO_FINDINGS)).toBe("leistungen");
    const tpl = calcDraftFromTemplate({ id: "t", name: "Büro", rooms: [makeRoom()], createdAt: NOW }, () => "x", NOW);
    expect(resolveStep(undefined, tpl, NO_FINDINGS)).toBe("objekt");
  });

  it("goToStep records visited steps; create = visited clickable, edit = all clickable", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "goToStep", step: "objekt" });
    expect(d.stepId).toBe("objekt");
    expect(d.visitedSteps).toEqual(["leistungen", "objekt"]);
    expect(canSelectStep("objekt", d, "create")).toBe(true);
    expect(canSelectStep("preis", d, "create")).toBe(false);
    expect(canSelectStep("preis", d, "edit")).toBe(true);
    expect(canSelectStep("winterdienst", d, "edit")).toBe(false);
  });

  it("adjacentStep skips hidden module steps", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "toggleModule", module: "hms", on: true });
    expect(adjacentStep(d, "raeume", 1)).toBe("hms");
    expect(adjacentStep(d, "hms", -1)).toBe("raeume");
    expect(adjacentStep(d, "pruefen", 1)).toBeNull();
    expect(adjacentStep(d, "leistungen", -1)).toBeNull();
  });
});

describe("room actions", () => {
  it("duplicates directly after the original with „(Kopie)“", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "addRoom", room: makeRoom() }, { type: "addRoom", room: makeRoom({ id: "r2", name: "" }) });
    const dup = run(d, { type: "duplicateRoom", id: "r1", newId: "r1b" });
    expect(dup.rooms.map((r) => r.id)).toEqual(["r1", "r1b", "r2"]);
    expect(dup.rooms[1].name).toBe("Büro 1 (Kopie)");
    expect(run(d, { type: "duplicateRoom", id: "r2", newId: "x" }).rooms[2].name).toBe("Einzelbüro (Kopie)");
  });

  it("sets all 9 frequencies and updates single rooms", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "addRoom", room: makeRoom() }, { type: "addRoom", room: makeRoom({ id: "r2" }) });
    expect(run(d, { type: "setAllFrequencies", frequency: "4x_week" }).rooms.every((r) => r.frequency === "4x_week")).toBe(true);
    const { id: _id, ...rest } = makeRoom({ area: 55 });
    expect(run(d, { type: "updateRoom", id: "r2", room: rest }).rooms[1]).toEqual(makeRoom({ id: "r2", area: 55 }));
  });

  it("template rooms set the source in create mode", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "addRooms", rooms: [makeRoom()], template: { name: "Büro Standard" } });
    expect(d.source).toBe("template");
    expect(d.sourceLabel).toBe("Büro Standard");
    expect(d.rooms).toHaveLength(1);
  });

  it("changing the Rüstzeit clears the „Standardwert“ tag", () => {
    const d = createEmptyCalcDraft(NOW);
    expect(d.ruestzeitIsDefault).toBe(true);
    expect(run(d, { type: "setSetupTime", ruestzeit: 15, wegezeit: 5 }).ruestzeitIsDefault).toBe(true);
    expect(run(d, { type: "setSetupTime", ruestzeit: 20, wegezeit: 0 }).ruestzeitIsDefault).toBe(false);
  });
});

describe("diffRooms", () => {
  it("deletes removed, updates changed, adds new rooms", () => {
    const a = makeRoom({ id: "a" });
    const b = makeRoom({ id: "b", area: 50 });
    const c = makeRoom({ id: "c" });
    const b2 = { ...b, area: 60 };
    const d = makeRoom({ id: "new-1", name: "Neu" });
    const diff = diffRooms([a, b, c], [a, b2, d]);
    expect(diff.toDelete).toEqual(["c"]);
    expect(diff.toUpdate).toEqual([b2]);
    const { id: _id, ...dNoId } = d;
    expect(diff.toAdd).toEqual([dNoId]);
  });

  it("ignores key order and undefined fields", () => {
    const a = makeRoom({ id: "a" });
    const reordered = { ...Object.fromEntries(Object.entries(a).reverse()), customPerformance: undefined } as Room;
    expect(Object.keys(reordered)[0]).not.toBe(Object.keys(a)[0]);
    expect(diffRooms([a], [reordered])).toEqual({ toDelete: [], toUpdate: [], toAdd: [] });
  });
});

describe("save updates (§6.5)", () => {
  it("create updates match the old 8-step wizard for rooms-only drafts", () => {
    const d = run(
      createEmptyCalcDraft(NOW),
      { type: "setBase", patch: { name: " Haus A ", customer: " Kunde ", location: " Berlin ", notes: "", objectType: "Büro", contactName: "Herr M.", rateInput: "26,5" } },
      { type: "addRoom", room: makeRoom() },
      { type: "setSetupTime", ruestzeit: 15, wegezeit: 10 },
    );
    const plan = buildCreatePlan(d);
    expect(plan.name).toBe("Haus A");
    expect(plan.customer).toBe("Kunde");
    expect(plan.updates).toEqual({ location: "Berlin", objectType: "Büro", rpiContactName: "Herr M.", hourlyRate: 26.5, ruestzeit: 15, wegezeit: 10 });
    expect(plan.rooms).toHaveLength(1);
    expect("id" in plan.rooms[0]).toBe(false);
    // Gespeichertes Projekt rechnet identisch zum Entwurf
    const saved: Project = { ...makeProject({ rooms: [makeRoom()] }), ...plan.updates };
    const draftProject = draftToProject(d, { id: "p1" });
    expect(calcProjectTotals(saved, 26.5)).toEqual(calcProjectTotals(draftProject, 26.5));
  });

  it("create adds enabled module configs only for selected modules", () => {
    const d = run(createEmptyCalcDraft(NOW), { type: "toggleModule", module: "winterdienst", on: true }, { type: "setWinterdienst", config: { ...WD, enabled: false } }, { type: "toggleModule", module: "hms", on: true }, { type: "toggleModule", module: "hms", on: false });
    const u = buildCreateUpdates(d);
    expect(u.winterdienst?.enabled).toBe(true);
    expect(u.winterdienst?.areas).toEqual(WD.areas);
    expect("hms" in u).toBe(false);
  });

  it("edit updates: all base fields, hourlyRate null without object rate", () => {
    const p = makeProject({ customer: "Alt GmbH", hourlyRate: 25 });
    const d = run(calcDraftFromProject(p, NOW), { type: "setBase", patch: { customer: "", rateInput: "" } });
    const u = buildEditUpdates(d, p);
    expect(u).toEqual({
      name: "Musterhaus", customer: undefined, location: undefined, notes: undefined, objectType: undefined,
      rpiContactName: undefined, hourlyRate: null, ruestzeit: 0, wegezeit: 0,
    });
  });

  it("edit updates omit winterdienst/hms when neither draft nor existing has them", () => {
    const p = makeProject();
    const u = buildEditUpdates(calcDraftFromProject(p, NOW), p);
    expect("winterdienst" in u).toBe(false);
    expect("hms" in u).toBe(false);
  });

  it("unchecking Winterdienst in edit yields enabled:false with the data kept", () => {
    const p = makeProject({ winterdienst: WD });
    const d = run(calcDraftFromProject(p, NOW), { type: "toggleModule", module: "winterdienst", on: false });
    const u = buildEditUpdates(d, p);
    expect(u.winterdienst).toEqual({ ...WD, enabled: false });
  });

  it("enabling a new module in edit sends the config", () => {
    const p = makeProject();
    const d = run(calcDraftFromProject(p, NOW), { type: "toggleModule", module: "winterdienst", on: true }, { type: "setWinterdienst", config: WD });
    expect(buildEditUpdates(d, p).winterdienst).toEqual({ ...WD, enabled: true });
  });

  it("a legacy object (ruestzeit undefined) keeps its price when saved unchanged", () => {
    const legacy = makeProject({ ruestzeit: undefined, wegezeit: undefined, hourlyRate: 24 });
    const d = calcDraftFromProject(legacy, NOW);
    const u = buildEditUpdates(d, legacy);
    expect(u.ruestzeit).toBe(0);
    const saved = { ...legacy, ...u, hourlyRate: u.hourlyRate ?? undefined } as Project;
    const before = computeObjectEconomics(legacy, SETTINGS).totals.priceMonthly;
    expect(computeObjectEconomics(saved, SETTINGS).totals.priceMonthly).toBeCloseTo(before, 9);
    expect(computeObjectEconomics(draftToProject(d), SETTINGS).totals.priceMonthly).toBeCloseTo(before, 9);
    expect(changedFields(legacy, d)).toEqual([]);
    expect(diffRooms(legacy.rooms, d.rooms)).toEqual({ toDelete: [], toUpdate: [], toAdd: [] });
  });
});

describe("changedFields", () => {
  it("lists Rüstzeit, room and module changes", () => {
    const p = makeProject({ ruestzeit: 0 });
    const d = run(
      calcDraftFromProject(p, NOW),
      { type: "setSetupTime", ruestzeit: 15, wegezeit: 0 },
      { type: "deleteRoom", id: "r2" },
      { type: "addRoom", room: makeRoom({ id: "n1" }) },
      { type: "addRoom", room: makeRoom({ id: "n2" }) },
      { type: "toggleModule", module: "winterdienst", on: true },
    );
    expect(changedFields(p, d)).toEqual(["Rüstzeit 0 → 15 Min.", "Räume: +2 / −1", "Winterdienst aktiviert"]);
  });

  it("reports text, rate and pause changes", () => {
    const p = makeProject({ hms: { schemaVersion: 1, enabled: true, tasks: [], travelMinutesPerVisitDay: 10, materialMarkupPct: 10, contingentOverageBilled: false } });
    const d = run(
      calcDraftFromProject(p, NOW),
      { type: "setBase", patch: { name: "Neu", rateInput: "27,5" } },
      { type: "toggleModule", module: "hms", on: false },
    );
    expect(changedFields(p, d)).toEqual(["Objektname: „Musterhaus“ → „Neu“", "Objektsatz Standard → 27,50 €/h", "Hausmeisterservice pausiert"]);
  });
});

describe("initFlowDraft (§6.1)", () => {
  const nowMs = Date.parse(NOW);
  const later = (ms: number) => new Date(nowMs + ms).toISOString();

  it("create: resumes a stored create draft with banner, ignores edit drafts", () => {
    const stored = { ...run(createEmptyCalcDraft(NOW), { type: "setBase", patch: { name: "X" } }), savedAt: later(-60_000) };
    const init = initFlowDraft("create", undefined, stored, nowMs);
    expect(init.draft).toBe(stored);
    expect(init.fromStore).toBe(true);
    expect(init.banner).toEqual({ kind: "resumed", savedAt: stored.savedAt });

    const editDraft = calcDraftFromProject(makeProject(), NOW);
    const fresh = initFlowDraft("create", undefined, editDraft, nowMs);
    expect(fresh.fromStore).toBe(false);
    expect(fresh.draft.editingId).toBeNull();
    expect(fresh.banner).toBeNull();
  });

  it("create: no banner for empty drafts or a template handed over seconds ago", () => {
    expect(initFlowDraft("create", undefined, createEmptyCalcDraft(NOW), nowMs).banner).toBeNull();
    const tpl = calcDraftFromTemplate({ id: "t", name: "Büro", rooms: [makeRoom()], createdAt: NOW }, () => "x", later(-2_000));
    expect(initFlowDraft("create", undefined, tpl, nowMs).banner).toBeNull();
    expect(initFlowDraft("create", undefined, { ...tpl, savedAt: later(-120_000) }, nowMs).banner?.kind).toBe("resumed");
  });

  it("edit: offers a newer stored draft of the same object, otherwise starts from the project", () => {
    const p = makeProject({ updatedAt: later(-10_000) });
    const stored = { ...run(calcDraftFromProject(p, NOW), { type: "setBase", patch: { name: "Neu" } }), savedAt: later(-5_000) };
    const init = initFlowDraft("edit", p, stored, nowMs);
    expect(init.draft.base.name).toBe("Musterhaus");
    expect(init.banner).toEqual({ kind: "restore", savedAt: stored.savedAt, draft: stored });
    expect(initFlowDraft("edit", p, { ...stored, savedAt: later(-20_000) }, nowMs).banner).toBeNull();
    expect(initFlowDraft("edit", p, { ...stored, editingId: "other" }, nowMs).banner).toBeNull();
    const same = { ...calcDraftFromProject(p, NOW), savedAt: later(-5_000) };
    expect(initFlowDraft("edit", p, same, nowMs).banner).toBeNull();
  });
});

describe("dirty tracking and helpers", () => {
  it("ignores savedAt and navigation", () => {
    const base = createEmptyCalcDraft(NOW);
    const nav = run({ ...base, savedAt: "2030-01-01T00:00:00.000Z" }, { type: "goToStep", step: "objekt" });
    expect(isDraftDirty(base, nav)).toBe(false);
    expect(isDraftDirty(base, run(base, { type: "setBase", patch: { notes: "x" } }))).toBe(true);
    expect(draftContentKey(base)).toBe(draftContentKey({ ...base }));
  });

  it("stableStringify sorts keys and drops undefined", () => {
    expect(stableStringify({ b: 1, a: { d: undefined, c: [2, { z: 1, y: 0 }] } })).toBe('{"a":{"c":[2,{"y":0,"z":1}]},"b":1}');
  });

  it("reopens a saved edit flow when the URL step changes (Beheben after Speichern & Angebot öffnen)", () => {
    expect(shouldReopenSavedFlow("edit", "p1", "pruefen", "objekt")).toBe(true);
    expect(shouldReopenSavedFlow("edit", "p1", "pruefen", undefined)).toBe(true);
    expect(shouldReopenSavedFlow("edit", "p1", "pruefen", "pruefen")).toBe(false);
    expect(shouldReopenSavedFlow("edit", null, "pruefen", "objekt")).toBe(false);
    // Neuanlage: Die Route wechselt auf die neue Objekt-ID und öffnet den Flow ohnehin neu.
    expect(shouldReopenSavedFlow("create", "p1", "pruefen", "objekt")).toBe(false);
  });

  it("rate helpers", () => {
    expect(roundUpRate(26.3)).toBe(26.3);
    expect(roundUpRate(26.31)).toBe(26.4);
    expect(rateInputFrom(26.4)).toBe("26,4");
    expect(rateInputFrom(0)).toBe("");
  });
});

/* ── Drei-Wege-Abgleich (Bearbeiten) ─────────────────────────────────── */

describe("edit flow: three-way merge against the draft's own baseline", () => {
  const nowMs = Date.parse(NOW);
  const later = (ms: number) => new Date(nowMs + ms).toISOString();
  const r3 = makeRoom({ id: "r3", name: "Küche", area: 12 });

  it("initFlowDraft stores the object state as editBase (not part of the content key)", () => {
    const p = makeProject();
    const init = initFlowDraft("edit", p, null, nowMs);
    expect(init.draft.editBase).toBeDefined();
    expect(init.draft.editBase!.editBase).toBeUndefined();
    expect(draftContentKey(init.draft)).toBe(draftContentKey(calcDraftFromProject(p, NOW)));
    expect(isDraftDirty(init.baseline, init.draft)).toBe(false);
  });

  it("mergeRooms keeps rooms added/changed outside the flow and applies the flow's own changes", () => {
    const base = [makeRoom(), makeRoom({ id: "r2", name: "Flur", area: 40 })];
    const theirs = [makeRoom({ area: 120 }), makeRoom({ id: "r2", name: "Flur", area: 40 }), r3];
    // Flow: r2 geändert, neuer Raum r9; r1 unverändert.
    const mine = [makeRoom(), makeRoom({ id: "r2", name: "Flur", area: 45 }), makeRoom({ id: "r9", name: "Neu" })];
    expect(mergeRooms(mine, base, theirs).map((r) => [r.id, r.area])).toEqual([["r1", 120], ["r2", 45], ["r3", 12], ["r9", 100]]);
    // Flow entfernt r2 ⇒ entfällt; außerhalb gelöschter, im Flow unveränderter Raum bleibt gelöscht.
    expect(mergeRooms([makeRoom()], base, [makeRoom({ id: "r2", name: "Flur", area: 40 })]).map((r) => r.id)).toEqual([]);
    // Außerhalb gelöscht, im Flow geändert ⇒ Flow gewinnt (Raum wird neu angelegt).
    expect(mergeRooms([makeRoom({ area: 99 })], [makeRoom()], []).map((r) => r.area)).toEqual([99]);
  });

  it("finding scenario: restore after a room was added in the workspace does not delete it", () => {
    // (1) Bearbeiten → Name ändern → „Entwurf behalten“.
    const p0 = makeProject({ updatedAt: later(-60_000) });
    const opened = initFlowDraft("edit", p0, null, nowMs - 30_000).draft;
    const stored = { ...run(opened, { type: "setBase", patch: { customer: "Neu GmbH" } }), savedAt: later(-20_000) };
    // (2) Im Arbeitsbereich Raum R3 hinzugefügt (updatedAt bleibt in der Cloud unverändert).
    const p1 = { ...p0, rooms: [...p0.rooms, r3] };
    // (3) Erneut „Bearbeiten“: Banner, Entwurf bereits auf den aktuellen Stand umgesetzt.
    const init = initFlowDraft("edit", p1, stored, nowMs);
    expect(init.banner?.kind).toBe("restore");
    const banner = init.banner as Extract<typeof init.banner, { kind: "restore" }>;
    expect(banner.conflict).toBe(true);
    expect(banner.draft.rooms.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    expect(banner.draft.base.customer).toBe("Neu GmbH");
    // (4) Speichern: wirksamer Stand behält R3.
    const target = effectiveEditDraft(banner.draft, p1);
    expect(target.rooms.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    expect(diffRooms(p1.rooms, target.rooms)).toEqual({ toDelete: [], toUpdate: [], toAdd: [] });
  });

  it("saving a draft built from stale cached data keeps rooms added on another device", () => {
    const cached = makeProject();
    const draft = run(initFlowDraft("edit", cached, null, nowMs).draft, {
      type: "updateRoom",
      id: "r1",
      room: { ...makeRoom({ area: 130 }), id: undefined } as unknown as Omit<Room, "id">,
    });
    const synced = { ...cached, name: "Musterhaus Nord", rooms: [...cached.rooms, r3] };
    const target = effectiveEditDraft(draft, synced);
    expect(target.base.name).toBe("Musterhaus Nord");
    const diff = diffRooms(synced.rooms, target.rooms);
    expect(diff.toDelete).toEqual([]);
    expect(diff.toAdd).toEqual([]);
    expect(diff.toUpdate.map((r) => [r.id, r.area])).toEqual([["r1", 130]]);
  });

  it("mergeEditDraft: fields changed in the flow win, untouched fields follow the object", () => {
    const p = makeProject({ customer: "Alt", ruestzeit: 10, winterdienst: { ...WD, enabled: true } });
    const base = calcDraftFromProject(p, NOW);
    const mine = run(withEditBase(base), { type: "setSetupTime", ruestzeit: 20, wegezeit: 0 });
    const theirs = { ...p, customer: "Neu", winterdienst: { ...WD, enabled: true, expectedEinsaetze: 60 } };
    const merged = mergeEditDraft(mine, base, theirs);
    expect(merged.ruestzeit).toBe(20);
    expect(merged.base.customer).toBe("Neu");
    expect(merged.winterdienst?.expectedEinsaetze).toBe(60);
    expect(merged.modules).toEqual(base.modules);
  });

  it("legacy drafts without editBase keep the previous rule; rebase adds a base", () => {
    const p = makeProject({ updatedAt: later(-10_000) });
    const legacy = { ...run(calcDraftFromProject(p, NOW), { type: "deleteRoom", id: "r2" }), savedAt: later(-5_000) };
    const rebased = rebaseEditDraft(legacy, p, NOW);
    expect(rebased.rooms.map((r) => r.id)).toEqual(["r1"]);
    expect(rebased.editBase?.rooms.map((r) => r.id)).toEqual(["r1", "r2"]);
    // Ohne eigene Änderungen gegenüber der Basis: kein Banner.
    const clean = { ...withEditBase(calcDraftFromProject(p, NOW)), savedAt: later(-5_000) };
    expect(initFlowDraft("edit", p, clean, nowMs).banner).toBeNull();
  });
});

describe("single draft slot (calcDraft)", () => {
  it("a non-empty draft of another context is foreign; own context or empty drafts are not", () => {
    const create = run(createEmptyCalcDraft(NOW), { type: "setBase", patch: { name: "Neues Objekt in Arbeit" } });
    const edit = initFlowDraft("edit", makeProject(), null).draft;
    expect(isForeignStoredDraft(create, edit)).toBe(true);
    expect(isForeignStoredDraft(edit, create)).toBe(true);
    expect(isForeignStoredDraft(edit, { editingId: "other" })).toBe(true);
    expect(isForeignStoredDraft(create, create)).toBe(false);
    expect(isForeignStoredDraft(edit, edit)).toBe(false);
    expect(isForeignStoredDraft(createEmptyCalcDraft(NOW), edit)).toBe(false);
  });

  it("labels the stored draft for the replace prompt", () => {
    expect(storedDraftLabel(run(createEmptyCalcDraft(NOW), { type: "setBase", patch: { name: "X" } }))).toBe("Neue Kalkulation „X“");
    expect(storedDraftLabel(createEmptyCalcDraft(NOW))).toBe("Neue Kalkulation");
    expect(storedDraftLabel(calcDraftFromProject(makeProject(), NOW))).toBe("Bearbeitung von „Musterhaus“");
  });
});
