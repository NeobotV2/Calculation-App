/* ─────────────────────────────────────────────────────────────────────────
   Kalkulations-Flow „Neue Kalkulation“ / „Kalkulation bearbeiten“ — reiner
   Zustand: Reducer über CalcDraft, Schritt-Sichtbarkeit und -Status,
   Raum-Diff und die exakten Speicher-Updates (UX §6.4/§6.5).
   Keine React-, Store- oder Routing-Abhängigkeiten.
   ───────────────────────────────────────────────────────────────────────── */
import type { FrequencyKey, Project, Room } from "@/store/use-store";
import {
  calcDraftFromProject,
  createEmptyCalcDraft,
  draftToProject,
  isCalcDraftEmpty,
  visibleFlowSteps,
  type CalcDraft,
  type CalcModuleKey,
} from "@/lib/drafts";
import { FLOW_STEP_ORDER, type FlowStepId } from "@/lib/offer-readiness";
import type { HmsConfig, HmsTask, WinterdienstConfig } from "@/lib/service-modules/types";
import { createDefaultWinterdienst } from "@/data/winterdienst";
import { createDefaultHms } from "@/data/hausmeisterservice";
import { applyFrequencyToAll, moveRoom, stripRoomId } from "@/components/calc/rooms/rooms-editor-logic";

export type FlowMode = "create" | "edit";

/* ── Reducer ──────────────────────────────────────────────────────────── */

export type FlowAction =
  /** Ganzen Entwurf ersetzen (Wiederherstellen, Neu beginnen). */
  | { type: "replace"; draft: CalcDraft }
  | { type: "setBase"; patch: Partial<CalcDraft["base"]> }
  /** Leistung an-/abwählen (Regeln §6.4 Schritt 1). */
  | { type: "toggleModule"; module: CalcModuleKey; on: boolean }
  | { type: "setRooms"; rooms: Room[] }
  | { type: "addRoom"; room: Room }
  /** Räume anhängen, z. B. aus einer Vorlage (setzt in der Neuanlage die Herkunft „Vorlage“). */
  | { type: "addRooms"; rooms: Room[]; template?: { name: string } }
  | { type: "updateRoom"; id: string; room: Omit<Room, "id"> }
  | { type: "deleteRoom"; id: string }
  /** Kopie „{Name} (Kopie)“ direkt hinter dem Original. */
  | { type: "duplicateRoom"; id: string; newId: string }
  /** splice-Semantik wie store.reorderRooms. */
  | { type: "moveRoom"; from: number; to: number }
  | { type: "setAllFrequencies"; frequency: FrequencyKey }
  | { type: "setSetupTime"; ruestzeit: number; wegezeit: number }
  | { type: "setWinterdienst"; config: WinterdienstConfig }
  | { type: "setHms"; config: HmsConfig }
  /** Vorschlag der Objektart übernehmen: Aufgaben ersetzen, übrige HMS-Einstellungen behalten. */
  | { type: "applyHmsPreset"; tasks: HmsTask[] }
  | { type: "goToStep"; step: FlowStepId };

function withUnterhalt(state: CalcDraft): CalcDraft["modules"] {
  return state.modules.unterhalt ? state.modules : { ...state.modules, unterhalt: true };
}

export function flowReducer(state: CalcDraft, action: FlowAction): CalcDraft {
  switch (action.type) {
    case "replace":
      return action.draft;

    case "setBase": {
      const keys = Object.keys(action.patch) as (keyof CalcDraft["base"])[];
      if (keys.every((k) => action.patch[k] === undefined || action.patch[k] === state.base[k])) return state;
      const patch = Object.fromEntries(keys.filter((k) => action.patch[k] !== undefined).map((k) => [k, action.patch[k]]));
      return { ...state, base: { ...state.base, ...patch } };
    }

    case "toggleModule": {
      const { module, on } = action;
      if (state.modules[module] === on) return state;
      const modules = { ...state.modules, [module]: on };
      if (module === "unterhalt") {
        if (on) return { ...state, modules };
        // Bearbeiten: Unterhaltsreinigung endet nur über das Entfernen der Räume.
        if (state.editingId !== null && state.rooms.length > 0) return state;
        return { ...state, modules, rooms: [] };
      }
      if (module === "winterdienst") {
        const winterdienst = on && !state.winterdienst ? createDefaultWinterdienst("flachland") : state.winterdienst;
        return { ...state, modules, ...(winterdienst ? { winterdienst } : {}) };
      }
      const hms = on && !state.hms ? createDefaultHms() : state.hms;
      return { ...state, modules, ...(hms ? { hms } : {}) };
    }

    case "setRooms":
      return { ...state, rooms: action.rooms };

    case "addRoom":
      return { ...state, modules: withUnterhalt(state), rooms: [...state.rooms, action.room] };

    case "addRooms": {
      if (action.rooms.length === 0) return state;
      const fromTemplate = !!action.template && state.editingId === null && state.source === "blank";
      return {
        ...state,
        modules: withUnterhalt(state),
        rooms: [...state.rooms, ...action.rooms],
        ...(fromTemplate ? { source: "template" as const, sourceLabel: action.template!.name } : {}),
      };
    }

    case "updateRoom": {
      const idx = state.rooms.findIndex((r) => r.id === action.id);
      if (idx === -1) return state;
      const rooms = [...state.rooms];
      rooms[idx] = { ...action.room, id: action.id };
      return { ...state, rooms };
    }

    case "deleteRoom": {
      if (!state.rooms.some((r) => r.id === action.id)) return state;
      return { ...state, rooms: state.rooms.filter((r) => r.id !== action.id) };
    }

    case "duplicateRoom": {
      const idx = state.rooms.findIndex((r) => r.id === action.id);
      if (idx === -1) return state;
      const original = state.rooms[idx];
      const copy: Room = { ...original, id: action.newId, name: `${original.name || original.typeName} (Kopie)` };
      const rooms = [...state.rooms];
      rooms.splice(idx + 1, 0, copy);
      return { ...state, rooms };
    }

    case "moveRoom": {
      const rooms = moveRoom(state.rooms, action.from, action.to);
      return rooms.every((r, i) => r === state.rooms[i]) ? state : { ...state, rooms };
    }

    case "setAllFrequencies": {
      if (state.rooms.every((r) => r.frequency === action.frequency)) return state;
      return { ...state, rooms: applyFrequencyToAll(state.rooms, action.frequency) };
    }

    case "setSetupTime": {
      const { ruestzeit, wegezeit } = action;
      if (ruestzeit === state.ruestzeit && wegezeit === state.wegezeit) return state;
      return {
        ...state,
        ruestzeit,
        wegezeit,
        ruestzeitIsDefault: state.ruestzeitIsDefault && ruestzeit === state.ruestzeit,
      };
    }

    case "setWinterdienst":
      return { ...state, winterdienst: action.config };

    case "setHms":
      return { ...state, hms: action.config };

    case "applyHmsPreset": {
      const base = state.hms ?? createDefaultHms();
      return { ...state, hms: { ...base, tasks: action.tasks }, hmsPresetApplied: true };
    }

    case "goToStep": {
      const visited = state.visitedSteps.includes(action.step);
      if (state.stepId === action.step && visited) return state;
      return {
        ...state,
        stepId: action.step,
        visitedSteps: visited ? state.visitedSteps : [...state.visitedSteps, action.step],
      };
    }
  }
}

/* ── Schritte ─────────────────────────────────────────────────────────── */

export const FLOW_STEP_LABELS: Record<FlowStepId, string> = {
  leistungen: "Leistungen",
  objekt: "Objekt",
  raeume: "Räume & Turnus",
  winterdienst: "Winterdienst",
  hms: "Hausmeisterservice",
  preis: "Preis & Wirtschaftlichkeit",
  pruefen: "Prüfen & Abschließen",
};

export function isFlowStepId(v: unknown): v is FlowStepId {
  return typeof v === "string" && (FLOW_STEP_ORDER as readonly string[]).includes(v);
}

/** Sichtbare Schritte in Reihenfolge (Modul-Schritte nur bei gewähltem Modul). */
export function visibleSteps(draft: Pick<CalcDraft, "modules">): FlowStepId[] {
  return visibleFlowSteps(draft.modules);
}

export function isStepVisible(step: FlowStepId, draft: Pick<CalcDraft, "modules">): boolean {
  return visibleSteps(draft).includes(step);
}

export function hasAnyModule(draft: Pick<CalcDraft, "modules">): boolean {
  return draft.modules.unterhalt || draft.modules.winterdienst || draft.modules.hms;
}

/** Minimale Sicht auf die Wirtschaftlichkeit für den Schrittstatus. */
export interface StepEconomics {
  moduleFindings: readonly { idSuffix: string }[];
}

/** "none" = ohne Vollständigkeitsregel (Prüfen & Abschließen). */
export type StepCompletion = "complete" | "incomplete" | "none";

export function stepCompletion(step: FlowStepId, draft: CalcDraft, econ: StepEconomics): StepCompletion {
  const ok = (v: boolean): StepCompletion => (v ? "complete" : "incomplete");
  const finding = (suffix: string) => econ.moduleFindings.some((f) => f.idSuffix === suffix);
  switch (step) {
    case "leistungen":
      return ok(hasAnyModule(draft));
    case "objekt":
      return ok(draft.base.name.trim() !== "");
    case "raeume":
      return ok(draft.rooms.length >= 1);
    case "winterdienst":
      return ok(!finding("wd_areas"));
    case "hms":
      return ok(!finding("hms_incomplete"));
    case "preis":
      return "complete";
    case "pruefen":
      return "none";
  }
}

export interface FlowStepStatus {
  id: FlowStepId;
  /** Position unter den sichtbaren Schritten (0-basiert). */
  index: number;
  completion: StepCompletion;
  visited: boolean;
}

/** Status aller sichtbaren Schritte (für Stepper und Prüfliste). */
export function stepStatus(draft: CalcDraft, econ: StepEconomics): FlowStepStatus[] {
  return visibleSteps(draft).map((id, index) => ({
    id,
    index,
    completion: stepCompletion(id, draft, econ),
    visited: draft.visitedSteps.includes(id),
  }));
}

/** Erster unvollständiger sichtbarer Schritt; sonst „Prüfen & Abschließen“. */
export function firstIncompleteStep(draft: CalcDraft, econ: StepEconomics): FlowStepId {
  return stepStatus(draft, econ).find((s) => s.completion === "incomplete")?.id ?? "pruefen";
}

/**
 * Startschritt aus der URL: ohne Angabe der gespeicherte Schritt des Entwurfs
 * (sofern sichtbar); ungültige oder ausgeblendete Schritte ⇒ erster
 * unvollständiger sichtbarer Schritt.
 */
export function resolveStep(param: string | undefined | null, draft: CalcDraft, econ: StepEconomics): FlowStepId {
  if (param === undefined || param === null || param === "") {
    return isStepVisible(draft.stepId, draft) ? draft.stepId : firstIncompleteStep(draft, econ);
  }
  if (isFlowStepId(param) && isStepVisible(param, draft)) return param;
  return firstIncompleteStep(draft, econ);
}

/** Nachbarschritt unter den sichtbaren Schritten (null am Anfang/Ende). */
export function adjacentStep(draft: Pick<CalcDraft, "modules">, current: FlowStepId, dir: 1 | -1): FlowStepId | null {
  const steps = visibleSteps(draft);
  const i = steps.indexOf(current);
  if (i === -1) return steps[0] ?? null;
  return steps[i + dir] ?? null;
}

/** Warum „Weiter“ gesperrt ist — nur in „Leistungen“ und „Objekt“. */
export type StepBlock = "no_module" | "name_missing";

export const STEP_BLOCK_MESSAGES: Record<StepBlock, string> = {
  no_module: "Bitte wählen Sie mindestens eine Leistung.",
  name_missing: "Bitte geben Sie einen Objektnamen ein.",
};

export function stepBlock(step: FlowStepId, draft: CalcDraft): StepBlock | null {
  if (step === "leistungen" && !hasAnyModule(draft)) return "no_module";
  if (step === "objekt" && draft.base.name.trim() === "") return "name_missing";
  return null;
}

/** Klickbar im Stepper: Neuanlage = besuchte Schritte, Bearbeiten = alle sichtbaren. */
export function canSelectStep(step: FlowStepId, draft: CalcDraft, mode: FlowMode): boolean {
  if (!isStepVisible(step, draft)) return false;
  return mode === "edit" || draft.visitedSteps.includes(step) || draft.stepId === step;
}

/**
 * Nach „Speichern & Angebot öffnen“ im Bearbeiten-Modus zeigt der Flow den
 * Rahmen „Änderungen gespeichert“. Wechselt danach die URL auf einen anderen
 * Schritt (z. B. „Beheben“ im Angebots-Check: gleiche Objekt-Route), muss der
 * Flow mit dem gespeicherten Objekt neu geöffnet werden. Bei der Neuanlage
 * wechselt die Route von „neu“ auf die Objekt-ID; das öffnet den Flow ohnehin neu.
 */
export function shouldReopenSavedFlow(
  mode: FlowMode,
  savedId: string | null,
  savedStepParam: string | undefined,
  stepParam: string | undefined,
): boolean {
  return mode === "edit" && savedId !== null && stepParam !== savedStepParam;
}

/* ── Start: Entwurf fortsetzen / wiederherstellen (§6.1) ──────────────── */

export type DraftBanner =
  /** Neuanlage: gespeicherter Entwurf wurde übernommen („… fortgesetzt“ + [Neu beginnen]). */
  | { kind: "resumed"; savedAt: string }
  /**
   * Bearbeiten: ungespeicherter Entwurf liegt vor ([Wiederherstellen] [Verwerfen]).
   * `draft` ist bereits auf den aktuellen Objektstand umgesetzt; `conflict`: das
   * Objekt wurde seit dem Entwurf außerhalb des Flows geändert.
   */
  | { kind: "restore"; savedAt: string; draft: CalcDraft; conflict?: boolean };

export interface FlowInit {
  draft: CalcDraft;
  /** Ausgangsstand für „ungespeicherte Änderungen“. */
  baseline: CalcDraft;
  banner: DraftBanner | null;
  /** Der Entwurf stammt aus dem Store (bereits gesichert). */
  fromStore: boolean;
}

/** Ab diesem Alter gilt ein Vorlagen-/Ausschreibungsentwurf als „fortgesetzt“ (sonst frisch übergeben). */
export const RESUME_BANNER_MIN_AGE_MS = 30_000;

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

/**
 * Startzustand des Flows. Neuanlage: gespeicherter Neuanlage-Entwurf
 * (editingId null) oder ein leerer Entwurf. Bearbeiten: Entwurf aus dem
 * Objekt (mit `editBase` = Objektstand beim Öffnen); ein gespeicherter Entwurf
 * desselben Objekts wird nur angeboten (Banner), nicht automatisch übernommen.
 *
 * Mit `editBase` gilt ein gespeicherter Entwurf als wiederherstellbar, wenn er
 * eigene Änderungen enthält, die nach dem Umsetzen auf den aktuellen
 * Objektstand noch etwas bewirken — unabhängig von `updatedAt`, das in der
 * Cloud bei Raumänderungen nicht fortgeschrieben wird. Ältere Entwürfe ohne
 * `editBase`: wie bisher nur, wenn neuer als das Objekt und inhaltlich anders.
 */
export function initFlowDraft(
  mode: FlowMode,
  project: Project | undefined,
  stored: CalcDraft | null,
  nowMs: number = Date.now(),
): FlowInit {
  if (mode === "create" || !project) {
    if (stored && stored.editingId === null) {
      const fresh = stored.source !== "blank" && nowMs - time(stored.savedAt) < RESUME_BANNER_MIN_AGE_MS;
      const banner: DraftBanner | null =
        !isCalcDraftEmpty(stored) && !fresh ? { kind: "resumed", savedAt: stored.savedAt } : null;
      return { draft: stored, baseline: stored, banner, fromStore: true };
    }
    const empty = createEmptyCalcDraft(new Date(nowMs).toISOString());
    return { draft: empty, baseline: empty, banner: null, fromStore: false };
  }
  const nowIso = new Date(nowMs).toISOString();
  const fresh = calcDraftFromProject(project, nowIso);
  const draft = withEditBase(fresh);
  let banner: DraftBanner | null = null;
  if (stored && stored.editingId === project.id) {
    if (stored.editBase) {
      const ownChanges = draftContentKey(stored) !== draftContentKey(stored.editBase);
      const rebased = rebaseEditDraft(stored, project, nowIso);
      if (ownChanges && draftContentKey(rebased) !== draftContentKey(fresh)) {
        const conflict = draftContentKey(stored.editBase) !== draftContentKey(fresh);
        banner = { kind: "restore", savedAt: stored.savedAt, draft: rebased, ...(conflict ? { conflict: true } : {}) };
      }
    } else if (time(stored.savedAt) > time(project.updatedAt) && draftContentKey(stored) !== draftContentKey(fresh)) {
      banner = { kind: "restore", savedAt: stored.savedAt, draft: stored };
    }
  }
  return { draft, baseline: draft, banner, fromStore: false };
}

/* ── Bearbeiten: Drei-Wege-Abgleich (Flow ⇄ Objekt) ───────────────────── */

/** Entwurf ohne verschachtelte Basis (für `editBase`). */
function stripEditBase(d: CalcDraft): CalcDraft {
  const { editBase: _editBase, ...rest } = d;
  return rest;
}

/** Bearbeiten-Entwurf mit seinem Ausgangsstand als Basis für den späteren Abgleich. */
export function withEditBase(d: CalcDraft): CalcDraft {
  return { ...d, editBase: stripEditBase(d) };
}

const sameContent = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

/** Drei-Wege-Wert: im Flow unverändert ⇒ aktueller Objektstand, sonst der Flow-Wert. */
function pick3<T>(mine: T, base: T, theirs: T): T {
  return sameContent(mine, base) ? theirs : mine;
}

/**
 * Räume im Drei-Wege-Abgleich: außerhalb des Flows hinzugefügte oder
 * geänderte Räume bleiben erhalten; im Flow entfernte Räume entfallen; im
 * Flow geänderte bzw. hinzugefügte Räume gewinnen.
 */
export function mergeRooms(mine: readonly Room[], base: readonly Room[], theirs: readonly Room[]): Room[] {
  const baseById = new Map(base.map((r) => [r.id, r]));
  const mineById = new Map(mine.map((r) => [r.id, r]));
  const theirsIds = new Set(theirs.map((r) => r.id));
  const changedInFlow = (r: Room) => {
    const b = baseById.get(r.id);
    return !b || !sameContent(b, r);
  };
  const out: Room[] = [];
  for (const t of theirs) {
    if (!baseById.has(t.id)) {
      out.push(t); // außerhalb des Flows hinzugefügt
      continue;
    }
    const m = mineById.get(t.id);
    if (!m) continue; // im Flow entfernt
    out.push(changedInFlow(m) ? m : t);
  }
  for (const m of mine) {
    if (theirsIds.has(m.id)) continue;
    // Im Flow hinzugefügt bzw. im Flow geändert, aber außerhalb gelöscht ⇒ Flow gewinnt.
    if (changedInFlow(m)) out.push(m);
  }
  return out;
}

/**
 * Wirksamer Entwurf beim Speichern: die Änderungen des Flows (gegenüber
 * `base`) auf den aktuellen Objektstand `existing` angewandt. Felder und
 * Räume, die der Flow nicht geändert hat, kommen aus dem Objekt — so
 * überschreibt das Speichern keine Änderungen aus dem Arbeitsbereich oder
 * von einem anderen Gerät.
 */
export function mergeEditDraft(draft: CalcDraft, base: CalcDraft, existing: Project): CalcDraft {
  const theirs = calcDraftFromProject(existing, draft.savedAt);
  const baseKeys = Object.keys(draft.base) as (keyof CalcDraft["base"])[];
  const fields = Object.fromEntries(baseKeys.map((k) => [k, pick3(draft.base[k], base.base[k], theirs.base[k])])) as CalcDraft["base"];
  const rooms = mergeRooms(draft.rooms, base.rooms, theirs.rooms);
  const modules: CalcDraft["modules"] = {
    unterhalt: rooms.length > 0 || pick3(draft.modules.unterhalt, base.modules.unterhalt, theirs.modules.unterhalt),
    winterdienst: pick3(draft.modules.winterdienst, base.modules.winterdienst, theirs.modules.winterdienst),
    hms: pick3(draft.modules.hms, base.modules.hms, theirs.modules.hms),
  };
  const winterdienst = pick3(draft.winterdienst, base.winterdienst, theirs.winterdienst);
  const hms = pick3(draft.hms, base.hms, theirs.hms);
  const { winterdienst: _wd, hms: _hms, ...rest } = draft;
  return {
    ...rest,
    base: fields,
    modules,
    rooms,
    ruestzeit: pick3(draft.ruestzeit, base.ruestzeit, theirs.ruestzeit),
    wegezeit: pick3(draft.wegezeit, base.wegezeit, theirs.wegezeit),
    ...(winterdienst ? { winterdienst } : {}),
    ...(hms ? { hms } : {}),
    hmsPresetApplied: pick3(draft.hmsPresetApplied, base.hmsPresetApplied, theirs.hmsPresetApplied),
  };
}

/**
 * Gespeicherten Bearbeiten-Entwurf auf den aktuellen Objektstand umsetzen
 * (Wiederherstellen): eigene Änderungen bleiben, neuere Objektänderungen
 * kommen hinzu; neue Basis = aktueller Objektstand. Ältere Entwürfe ohne
 * Basis werden unverändert übernommen (Basis = aktueller Objektstand).
 */
export function rebaseEditDraft(stored: CalcDraft, project: Project, nowIso?: string): CalcDraft {
  const fresh = calcDraftFromProject(project, nowIso);
  const merged = stored.editBase ? mergeEditDraft(stored, stored.editBase, project) : stored;
  return { ...merged, editBase: fresh };
}

/** Bearbeiten: wirksamer Zielstand für Speichern und Änderungsliste (ohne Basis ⇒ der Entwurf selbst). */
export function effectiveEditDraft(draft: CalcDraft, existing: Project): CalcDraft {
  return draft.editBase && draft.editingId === existing.id ? mergeEditDraft(draft, draft.editBase, existing) : draft;
}

/**
 * Es gibt nur einen Entwurfsspeicher (calcDraft). Ein gespeicherter Entwurf
 * eines anderen Kontexts (Neuanlage ⇄ Bearbeiten bzw. anderes Objekt) mit
 * Inhalt darf nicht stillschweigend überschrieben werden.
 */
export function isForeignStoredDraft(stored: CalcDraft, draft: Pick<CalcDraft, "editingId">): boolean {
  return stored.editingId !== draft.editingId && !isCalcDraftEmpty(stored);
}

/** Bezeichnung eines gespeicherten Entwurfs für Hinweise: „Neue Kalkulation „X““ bzw. „Bearbeitung von „Y““. */
export function storedDraftLabel(d: CalcDraft): string {
  const name = d.base.name.trim() || d.sourceLabel?.trim() || "";
  if (d.editingId === null) return name ? `Neue Kalkulation „${name}“` : "Neue Kalkulation";
  return name ? `Bearbeitung von „${name}“` : "Bearbeitung eines Objekts";
}

/** „03.10., 14:05“ für die Entwurfs-Hinweise. */
export function formatDraftTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const date = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const t = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${t}`;
}

/** „14:05“ für den Sicherungsstatus im Kopf. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

/* ── Vergleich und Änderungen ─────────────────────────────────────────── */

/** JSON mit sortierten Schlüsseln, ohne undefined-Felder (stabil für Vergleiche). */
export function stableStringify(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        const x = (v as Record<string, unknown>)[k];
        if (x !== undefined) out[k] = norm(x);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(value)) ?? "";
}

/** Inhalt des Entwurfs ohne Zeitstempel, Navigationszustand und Abgleichsbasis. */
export function draftContentKey(d: CalcDraft): string {
  const { savedAt: _savedAt, stepId: _stepId, visitedSteps: _visited, editBase: _editBase, ...content } = d;
  return stableStringify(content);
}

/** true, wenn der Entwurf inhaltlich von seinem Ausgangsstand abweicht. */
export function isDraftDirty(baseline: CalcDraft, draft: CalcDraft): boolean {
  return baseline !== draft && draftContentKey(baseline) !== draftContentKey(draft);
}

export interface RoomDiff {
  /** IDs bestehender Räume, die im Entwurf fehlen. */
  toDelete: string[];
  /** Bestehende Räume mit geändertem Inhalt. */
  toUpdate: Room[];
  /** Neue Räume (ohne ID, in Entwurfsreihenfolge). */
  toAdd: Omit<Room, "id">[];
}

export function diffRooms(existing: readonly Room[], next: readonly Room[]): RoomDiff {
  const before = new Map(existing.map((r) => [r.id, r]));
  const nextIds = new Set(next.map((r) => r.id));
  const toDelete = existing.filter((r) => !nextIds.has(r.id)).map((r) => r.id);
  const toUpdate: Room[] = [];
  const toAdd: Omit<Room, "id">[] = [];
  for (const room of next) {
    const old = before.get(room.id);
    if (!old) toAdd.push(stripRoomId(room));
    else if (stableStringify(old) !== stableStringify(room)) toUpdate.push(room);
  }
  return { toDelete, toUpdate, toAdd };
}

/* ── Speichern (§6.5) ─────────────────────────────────────────────────── */

export type ProjectUpdates = Partial<Omit<Project, "id" | "createdAt" | "rooms">>;

/** Bearbeiten: hourlyRate wird mit null zurückgesetzt (Cloud: Spalte NULL). */
export type EditUpdates = Omit<ProjectUpdates, "hourlyRate"> & { hourlyRate: number | null };

/** Räume, die gespeichert werden: nur bei gewählter Unterhaltsreinigung. */
export function roomsToSave(draft: CalcDraft): Room[] {
  return draft.modules.unterhalt ? draft.rooms : [];
}

/** Objektsatz aus dem Eingabetext (nur > 0), wie draftToProject. */
export function parsedRate(draft: CalcDraft): number | undefined {
  return draftToProject(draft).hourlyRate;
}

/** Neuanlage, Schritt 4: Felder für updateProject direkt nach addProject. */
export function buildCreateUpdates(draft: CalcDraft): ProjectUpdates {
  const b = draft.base;
  const updates: ProjectUpdates = {};
  if (b.location.trim()) updates.location = b.location.trim();
  if (b.notes.trim()) updates.notes = b.notes.trim();
  if (b.objectType.trim()) updates.objectType = b.objectType.trim();
  if (b.contactName.trim()) updates.rpiContactName = b.contactName.trim();
  const rate = parsedRate(draft);
  if (rate !== undefined) updates.hourlyRate = rate;
  updates.ruestzeit = draft.ruestzeit;
  updates.wegezeit = draft.wegezeit;
  if (draft.winterdienst && draft.modules.winterdienst) updates.winterdienst = { ...draft.winterdienst, enabled: true };
  if (draft.hms && draft.modules.hms) updates.hms = { ...draft.hms, enabled: true };
  return updates;
}

export interface CreatePlan {
  /** addProject(name, customer). */
  name: string;
  customer?: string;
  updates: ProjectUpdates;
  /** addRoom je Raum (ohne ID), nur bei gewählter Unterhaltsreinigung. */
  rooms: Omit<Room, "id">[];
}

export function buildCreatePlan(draft: CalcDraft): CreatePlan {
  const customer = draft.base.customer.trim();
  return {
    name: draft.base.name.trim(),
    ...(customer ? { customer } : {}),
    updates: buildCreateUpdates(draft),
    rooms: roomsToSave(draft).map(stripRoomId),
  };
}

/**
 * Bearbeiten: alle Grundfelder (leere Texte ⇒ undefined; der vorhandene
 * Schlüssel leert das Feld lokal wie in der Cloud), Objektsatz oder
 * null, Rüst-/Wegezeit. Module nur, wenn das Objekt sie schon hat oder sie
 * jetzt gewählt sind; abgewählt ⇒ enabled:false, Daten bleiben erhalten.
 */
export function buildEditUpdates(draft: CalcDraft, existing: Project): EditUpdates {
  const b = draft.base;
  const text = (v: string) => v.trim() || undefined;
  const updates: EditUpdates = {
    name: b.name.trim(),
    customer: text(b.customer),
    location: text(b.location),
    notes: text(b.notes),
    objectType: text(b.objectType),
    rpiContactName: text(b.contactName),
    hourlyRate: parsedRate(draft) ?? null,
    ruestzeit: draft.ruestzeit,
    wegezeit: draft.wegezeit,
  };
  if (existing.winterdienst || (draft.winterdienst && draft.modules.winterdienst)) {
    updates.winterdienst = draft.winterdienst && { ...draft.winterdienst, enabled: draft.modules.winterdienst };
  }
  if (existing.hms || (draft.hms && draft.modules.hms)) {
    updates.hms = draft.hms && { ...draft.hms, enabled: draft.modules.hms };
  }
  return updates;
}

const fmtNumber = (v: number, digits = 2) =>
  v.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: digits });
const fmtRate = (v: number | undefined | null) =>
  typeof v === "number" && v > 0
    ? `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/h`
    : "Standard";
const quote = (v: string | undefined) => (v && v.trim() ? `„${v.trim()}“` : "–");

/** Ohne enabled-Flag, für „geändert“-Vergleiche der Modul-Konfiguration. */
function moduleKey(cfg: WinterdienstConfig | HmsConfig | undefined): string {
  if (!cfg) return "";
  const { enabled: _enabled, ...rest } = cfg;
  return stableStringify(rest);
}

/**
 * Lesbare Änderungen gegenüber dem gespeicherten Objekt, z. B.
 * „Rüstzeit 0 → 15 Min.“, „Räume: +2 / −1“, „Winterdienst aktiviert“.
 */
export function changedFields(existing: Project, draft: CalcDraft): string[] {
  const next = draftToProject(draft, { id: existing.id, createdAt: existing.createdAt });
  const out: string[] = [];
  const textField = (label: string, a: string | undefined, b: string | undefined) => {
    if ((a ?? "").trim() !== (b ?? "").trim()) out.push(`${label}: ${quote(a)} → ${quote(b)}`);
  };
  textField("Objektname", existing.name, next.name);
  textField("Kunde", existing.customer, next.customer);
  textField("Standort", existing.location, next.location);
  textField("Objektart", existing.objectType, next.objectType);
  textField("Ansprechpartner", existing.rpiContactName, next.rpiContactName);
  if ((existing.notes ?? "").trim() !== (next.notes ?? "").trim()) out.push("Notizen geändert");

  const oldRate = typeof existing.hourlyRate === "number" && existing.hourlyRate > 0 ? existing.hourlyRate : undefined;
  if (oldRate !== next.hourlyRate) out.push(`Objektsatz ${fmtRate(oldRate)} → ${fmtRate(next.hourlyRate)}`);

  const oldRuest = existing.ruestzeit ?? 0;
  const oldWege = existing.wegezeit ?? 0;
  if (oldRuest !== (next.ruestzeit ?? 0)) out.push(`Rüstzeit ${fmtNumber(oldRuest)} → ${fmtNumber(next.ruestzeit ?? 0)} Min.`);
  if (oldWege !== (next.wegezeit ?? 0)) out.push(`Wegezeit ${fmtNumber(oldWege)} → ${fmtNumber(next.wegezeit ?? 0)} Min.`);

  const diff = diffRooms(existing.rooms, next.rooms);
  const parts: string[] = [];
  if (diff.toAdd.length > 0) parts.push(`+${diff.toAdd.length}`);
  if (diff.toDelete.length > 0) parts.push(`−${diff.toDelete.length}`);
  if (parts.length > 0 || diff.toUpdate.length > 0) {
    const changed = diff.toUpdate.length > 0 ? `${diff.toUpdate.length} geändert` : "";
    out.push(`Räume: ${[parts.join(" / "), changed].filter(Boolean).join(" · ")}`);
  }

  const modules: { label: string; before: WinterdienstConfig | HmsConfig | undefined; after: WinterdienstConfig | HmsConfig | undefined }[] = [
    { label: "Winterdienst", before: existing.winterdienst, after: next.winterdienst },
    { label: "Hausmeisterservice", before: existing.hms, after: next.hms },
  ];
  for (const m of modules) {
    const wasOn = !!m.before?.enabled;
    const isOn = !!m.after?.enabled;
    if (!wasOn && isOn) out.push(`${m.label} aktiviert`);
    else if (wasOn && !isOn) out.push(`${m.label} pausiert`);
    else if (isOn && moduleKey(m.before) !== moduleKey(m.after)) out.push(`${m.label} geändert`);
  }
  return out;
}

/** Rate als Eingabetext mit Dezimalkomma (z. B. für „Auf Zielsatz setzen“). */
export function rateInputFrom(rate: number): string {
  return Number.isFinite(rate) && rate > 0 ? String(Math.round(rate * 100) / 100).replace(".", ",") : "";
}

/** „Auf Zielsatz setzen“: auf 0,10 € aufgerundet. */
export function roundUpRate(rate: number): number {
  return Math.ceil(rate * 10 - 1e-9) / 10;
}
