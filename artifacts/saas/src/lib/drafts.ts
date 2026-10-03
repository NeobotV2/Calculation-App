/* ─────────────────────────────────────────────────────────────────────────
   Entwürfe des Kalkulations-Flows und der Ausschreibung (persistierte
   Store-Slices calcDraft / tenderDraft) und ihre reinen Fabriken.
   Ids kommen vom Aufrufer (makeId, z. B. uuidv4), damit alles testbar bleibt.
   ───────────────────────────────────────────────────────────────────────── */
import type { Project, Room, Template } from "@/store/use-store";
import type { HmsConfig, WinterdienstConfig } from "@/lib/service-modules/types";
import type { FlowStepId } from "@/lib/offer-readiness";
import { parseDecimal } from "@/lib/utils";

export type CalcModuleKey = "unterhalt" | "winterdienst" | "hms";
export type CalcDraftSource = "blank" | "template" | "tender" | "edit";

export interface CalcDraft {
  version: 1;
  /** null = Neuanlage; sonst ID des bearbeiteten Objekts. */
  editingId: string | null;
  source: CalcDraftSource;
  /** Name der Vorlage bzw. Ausschreibung oder des bearbeiteten Objekts. */
  sourceLabel?: string;
  stepId: FlowStepId;
  visitedSteps: FlowStepId[];
  /** Gewählte Leistungen (Schritt „Leistungen“). */
  modules: Record<CalcModuleKey, boolean>;
  base: {
    name: string;
    customer: string;
    location: string;
    notes: string;
    objectType: string;
    contactName: string;
    /** Objektsatz als Eingabetext mit Dezimalkomma; "" = Standardsatz. */
    rateInput: string;
  };
  rooms: Room[];
  /** Rüstzeit je Einsatz in Minuten. */
  ruestzeit: number;
  /** true, solange der Standardwert (15 Min.) unverändert ist. */
  ruestzeitIsDefault: boolean;
  /** Wegezeit je Einsatz in Minuten. */
  wegezeit: number;
  /** Modul-Konfiguration bleibt erhalten, auch wenn das Modul abgewählt ist. */
  winterdienst?: WinterdienstConfig;
  hms?: HmsConfig;
  /** Die HMS-Vorauswahl des Objekttyps wurde übernommen (Callout nicht mehr anbieten). */
  hmsPresetApplied: boolean;
  /** ISO-Zeitpunkt der letzten Sicherung. */
  savedAt: string;
  /**
   * Nur Bearbeiten: Stand des Objekts beim Öffnen des Flows (calcDraftFromProject).
   * Basis des Drei-Wege-Abgleichs beim Speichern und Wiederherstellen — Änderungen,
   * die außerhalb des Flows am Objekt gemacht wurden, bleiben so erhalten.
   */
  editBase?: CalcDraft;
}

export interface TenderDraft {
  version: 1;
  tenderName: string;
  rooms: Room[];
  warnings: string[];
  fileName: string | null;
  rateInput: string;
  perfSpread: string;
  rateSpread: string;
  savedAt: string;
}

/** Rüstzeit neuer Objekte (Minuten je Einsatz), angezeigt als „Standardwert“. */
export const DEFAULT_RUESTZEIT_MINUTES = 15;

const nowIso = (now?: string) => now ?? new Date().toISOString();

/** Tiefe Kopie reiner JSON-Daten. */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Satz als Eingabetext mit Dezimalkomma; kein/ungültiger Satz ⇒ "". */
function rateToInput(rate: number | undefined): string {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? String(rate).replace(".", ",") : "";
}

function emptyBase(): CalcDraft["base"] {
  return { name: "", customer: "", location: "", notes: "", objectType: "", contactName: "", rateInput: "" };
}

/** Schritte, die für den Entwurf sichtbar sind (Modul-Schritte nur bei gewähltem Modul). */
export function visibleFlowSteps(modules: Record<CalcModuleKey, boolean>): FlowStepId[] {
  const steps: FlowStepId[] = ["leistungen", "objekt"];
  if (modules.unterhalt) steps.push("raeume");
  if (modules.winterdienst) steps.push("winterdienst");
  if (modules.hms) steps.push("hms");
  steps.push("preis", "pruefen");
  return steps;
}

/** Leerer Entwurf für „Neue Kalkulation“: Unterhaltsreinigung gewählt, Rüstzeit 15 Min. (Standardwert). */
export function createEmptyCalcDraft(now?: string): CalcDraft {
  return {
    version: 1,
    editingId: null,
    source: "blank",
    stepId: "leistungen",
    visitedSteps: ["leistungen"],
    modules: { unterhalt: true, winterdienst: false, hms: false },
    base: emptyBase(),
    rooms: [],
    ruestzeit: DEFAULT_RUESTZEIT_MINUTES,
    ruestzeitIsDefault: true,
    wegezeit: 0,
    hmsPresetApplied: false,
    savedAt: nowIso(now),
  };
}

/**
 * Entwurf zum Bearbeiten eines bestehenden Objekts. Rüstzeit = project.ruestzeit ?? 0,
 * damit sich der Preis beim Öffnen und Speichern ohne Änderung nicht verschiebt.
 */
export function calcDraftFromProject(p: Project, now?: string): CalcDraft {
  const wdActive = !!p.winterdienst?.enabled;
  const hmsActive = !!p.hms?.enabled;
  const modules: Record<CalcModuleKey, boolean> = {
    unterhalt: p.rooms.length > 0 || !(wdActive || hmsActive),
    winterdienst: wdActive,
    hms: hmsActive,
  };
  return {
    version: 1,
    editingId: p.id,
    source: "edit",
    sourceLabel: p.name,
    stepId: "leistungen",
    visitedSteps: visibleFlowSteps(modules),
    modules,
    base: {
      name: p.name,
      customer: p.customer ?? "",
      location: p.location ?? "",
      notes: p.notes ?? "",
      objectType: p.objectType ?? "",
      contactName: p.rpiContactName ?? "",
      rateInput: rateToInput(p.hourlyRate),
    },
    rooms: p.rooms.map((r) => ({ ...r })),
    ruestzeit: p.ruestzeit ?? 0,
    ruestzeitIsDefault: false,
    wegezeit: p.wegezeit ?? 0,
    ...(p.winterdienst ? { winterdienst: clone(p.winterdienst) } : {}),
    ...(p.hms ? { hms: clone(p.hms) } : {}),
    hmsPresetApplied: (p.hms?.tasks.length ?? 0) > 0,
    savedAt: nowIso(now),
  };
}

/** Neuer Entwurf aus einer Vorlage (nur Räume, mit neuen IDs); startet im Schritt „Objekt“. */
export function calcDraftFromTemplate(t: Template, makeId: () => string, now?: string): CalcDraft {
  return {
    ...createEmptyCalcDraft(now),
    source: "template",
    sourceLabel: t.name,
    stepId: "objekt",
    visitedSteps: ["leistungen", "objekt"],
    rooms: t.rooms.map((r) => ({ ...r, id: makeId() })),
  };
}

/**
 * Neuer Entwurf aus der Ausschreibung. Rüstzeit 0, damit der Preis dem
 * Ausschreibungs-Szenario entspricht; startet im Schritt „Objekt“.
 */
export function calcDraftFromTender(
  input: { name: string; rooms: (Room | Omit<Room, "id">)[]; hourlyRate?: number; notes?: string },
  makeId: () => string,
  now?: string,
): CalcDraft {
  const base = createEmptyCalcDraft(now);
  return {
    ...base,
    source: "tender",
    sourceLabel: input.name,
    stepId: "objekt",
    visitedSteps: ["leistungen", "objekt"],
    base: { ...base.base, name: input.name, notes: input.notes ?? "", rateInput: rateToInput(input.hourlyRate) },
    rooms: input.rooms.map((r) => ({ ...r, id: makeId() })),
    ruestzeit: 0,
    ruestzeitIsDefault: false,
  };
}

/**
 * Projekt-Sicht des Entwurfs für die Live-Berechnung und das Speichern.
 * Räume nur bei gewählter Unterhaltsreinigung; Module = Konfiguration mit
 * enabled = Auswahl; hourlyRate nur, wenn der Eingabetext eine Zahl > 0 ist.
 * Kein stiller Ersatzname: name bleibt "" bis der Nutzer ihn erfasst.
 */
export function draftToProject(d: CalcDraft, opts?: { id?: string; createdAt?: string }): Project {
  const rate = parseDecimal(d.base.rateInput);
  const text = (v: string) => (v.trim() ? v.trim() : undefined);
  const customer = text(d.base.customer);
  const location = text(d.base.location);
  const notes = text(d.base.notes);
  const objectType = text(d.base.objectType);
  const contact = text(d.base.contactName);
  return {
    id: opts?.id ?? d.editingId ?? "flow-draft",
    name: d.base.name.trim(),
    ...(customer ? { customer } : {}),
    ...(location ? { location } : {}),
    ...(notes ? { notes } : {}),
    ...(objectType ? { objectType } : {}),
    ...(contact ? { rpiContactName: contact } : {}),
    ...(rate !== undefined && rate > 0 ? { hourlyRate: rate } : {}),
    ruestzeit: d.ruestzeit,
    wegezeit: d.wegezeit,
    status: "active",
    createdAt: opts?.createdAt ?? d.savedAt,
    updatedAt: d.savedAt,
    rooms: d.modules.unterhalt ? d.rooms : [],
    ...(d.winterdienst ? { winterdienst: { ...d.winterdienst, enabled: d.modules.winterdienst } } : {}),
    ...(d.hms ? { hms: { ...d.hms, enabled: d.modules.hms } } : {}),
  };
}

/** true, wenn der Entwurf keine Nutzereingaben enthält (kein Fortsetzen-Angebot nötig). */
export function isCalcDraftEmpty(d: CalcDraft): boolean {
  const b = d.base;
  const textEmpty = [b.name, b.customer, b.location, b.notes, b.objectType, b.contactName, b.rateInput].every((v) => v.trim() === "");
  return (
    d.editingId === null &&
    textEmpty &&
    d.rooms.length === 0 &&
    !d.modules.winterdienst &&
    !d.modules.hms &&
    (d.winterdienst?.areas.length ?? 0) === 0 &&
    (d.hms?.tasks.length ?? 0) === 0
  );
}

/** Leerer Ausschreibungs-Entwurf (Spannen wie bisher: Leistung ±15 %, Satz ±10 %). */
export function createEmptyTenderDraft(now?: string): TenderDraft {
  return {
    version: 1,
    tenderName: "",
    rooms: [],
    warnings: [],
    fileName: null,
    rateInput: "",
    perfSpread: "15",
    rateSpread: "10",
    savedAt: nowIso(now),
  };
}

/** true, wenn der Ausschreibungs-Entwurf keine Eingaben enthält. */
export function isTenderDraftEmpty(d: TenderDraft): boolean {
  return d.tenderName.trim() === "" && d.rooms.length === 0 && d.fileName === null && d.rateInput.trim() === "";
}
