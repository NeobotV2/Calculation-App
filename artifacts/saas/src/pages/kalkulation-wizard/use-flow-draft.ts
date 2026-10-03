import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch } from "react";
import { useStore, type Project } from "@/store/use-store";
import { calcDraftFromProject, createEmptyCalcDraft, type CalcDraft } from "@/lib/drafts";
import type { FlowStepId } from "@/lib/offer-readiness";
import {
  draftContentKey,
  flowReducer,
  initFlowDraft,
  isDraftDirty,
  isForeignStoredDraft,
  isStepVisible,
  stableStringify,
  storedDraftLabel,
  type DraftBanner,
  type FlowAction,
  type FlowMode,
} from "./flow-state";

/** Verzögerung der automatischen Sicherung (ms). */
export const AUTOSAVE_DELAY_MS = 500;

export interface UseFlowDraftOptions {
  mode: FlowMode;
  /** Bearbeiten: das (geladene) Objekt. */
  project?: Project;
  /** Startschritt aus der URL bestimmen (einmalig beim Start). */
  resolveStep?: (draft: CalcDraft) => FlowStepId;
}

/** Anderer, nicht leerer Entwurf im (einzigen) Entwurfsspeicher, den die Sicherung ersetzen würde. */
export interface StoredDraftConflict {
  /** Objektname bzw. „Neue Kalkulation“. */
  name: string;
  /** null = Neuanlage. */
  editingId: string | null;
  savedAt: string;
}

export interface FlowDraftApi {
  draft: CalcDraft;
  dispatch: Dispatch<FlowAction>;
  /** Ausgangsstand (Objekt bzw. übernommener Entwurf). */
  baseline: CalcDraft;
  /** Inhalt weicht vom Ausgangsstand ab. */
  isDirty: boolean;
  /** Zeitpunkt der letzten Sicherung (ISO) oder null. */
  savedAt: string | null;
  /** Hinweis „Entwurf … fortgesetzt“ bzw. „Ungespeicherte Änderungen … gefunden“. */
  banner: DraftBanner | null;
  /** Bearbeiten: gespeicherten Entwurf übernehmen. */
  restore: () => void;
  /** Bearbeiten: gespeicherten Entwurf verwerfen und mit dem Objekt weiterarbeiten. */
  dismissStored: () => void;
  /** Neuanlage: gespeicherten Entwurf verwerfen und leer neu beginnen. */
  startOver: () => void;
  /** „Entwurf verwerfen“: gespeicherten Entwurf löschen, keine weitere Sicherung. */
  discard: () => void;
  /** Ausstehende Änderungen sofort sichern (z. B. vor dem Verlassen). */
  flush: () => void;
  /** Nach erfolgreichem Speichern: keine weitere automatische Sicherung. */
  close: () => void;
  /**
   * Die automatische Sicherung würde einen anderen Entwurf ersetzen (es gibt
   * nur einen Entwurfsspeicher) — bis zur Entscheidung wird nicht gesichert.
   */
  storedConflict: StoredDraftConflict | null;
  /** Automatische Sicherung ist ausgesetzt (Entscheidung offen oder „Vorhandenen behalten“). */
  autosaveBlocked: boolean;
  /** „Entwurf ersetzen“: vorhandenen Entwurf überschreiben und ab jetzt sichern. */
  replaceStored: () => void;
  /** „Vorhandenen behalten“: nicht sichern; Änderungen bleiben nur bis zum Verlassen erhalten. */
  keepStored: () => void;
}


/** Schlüssel inkl. Schritt und besuchten Schritten, ohne Zeitstempel. */
const persistKey = (d: CalcDraft) => stableStringify({ ...d, savedAt: undefined });

/**
 * Entwurf des Kalkulations-Flows (UX §6.1): Start aus `calcDraft`,
 * `calcDraftFromProject` oder einem leeren Entwurf, automatische Sicherung
 * 500 ms nach der letzten Änderung (sobald der Inhalt abweicht) und
 * Sicherung ausstehender Änderungen beim Verlassen der Seite.
 */
export function useFlowDraft({ mode, project, resolveStep }: UseFlowDraftOptions): FlowDraftApi {
  const setCalcDraft = useStore((s) => s.setCalcDraft);

  const [init] = useState(() => {
    const base = initFlowDraft(mode, project, useStore.getState().calcDraft);
    const step = resolveStep?.(base.draft);
    return step ? { ...base, draft: flowReducer(base.draft, { type: "goToStep", step }) } : base;
  });

  const [draft, dispatch] = useReducer(flowReducer, init.draft);
  const [baseline, setBaseline] = useState<CalcDraft>(init.baseline);
  const [banner, setBanner] = useState<DraftBanner | null>(init.banner);
  const [savedAt, setSavedAt] = useState<string | null>(init.fromStore ? init.draft.savedAt : null);
  const [storedConflict, setStoredConflict] = useState<StoredDraftConflict | null>(null);
  /** ask: vor dem Überschreiben eines fremden Entwurfs nachfragen; replace/keep: entschieden. */
  const slotDecisionRef = useRef<"ask" | "replace" | "keep">("ask");
  const [slotDecision, setSlotDecision] = useState<"ask" | "replace" | "keep">("ask");

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const closedRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Schlüssel des zuletzt gesicherten Stands. */
  const lastSavedKeyRef = useRef<string | null>(init.fromStore ? persistKey(init.draft) : null);
  /** In dieser Sitzung schon gesichert bzw. aus dem Store übernommen ⇒ auch Schrittwechsel sichern. */
  const trackingRef = useRef(init.fromStore);

  const isDirty = useMemo(() => isDraftDirty(baseline, draft), [baseline, draft]);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const persist = useCallback(() => {
    clearTimer();
    if (closedRef.current) {
      pendingRef.current = false;
      return;
    }
    // Ein Entwurfsspeicher: einen anderen, nicht leeren Entwurf nie stillschweigend ersetzen.
    const stored = useStore.getState().calcDraft;
    if (stored && isForeignStoredDraft(stored, draftRef.current) && slotDecisionRef.current !== "replace") {
      pendingRef.current = true;
      if (slotDecisionRef.current === "ask") {
        setStoredConflict((prev) => prev ?? { name: storedDraftLabel(stored), editingId: stored.editingId, savedAt: stored.savedAt });
      }
      return;
    }
    pendingRef.current = false;
    const now = new Date().toISOString();
    const next = { ...draftRef.current, savedAt: now };
    setCalcDraft(next);
    lastSavedKeyRef.current = persistKey(next);
    trackingRef.current = true;
    setSavedAt(now);
  }, [setCalcDraft]);

  // Automatisch sichern (entprellt).
  useEffect(() => {
    if (closedRef.current) return;
    if (!isDirty && !trackingRef.current) return;
    if (persistKey(draft) === lastSavedKeyRef.current) {
      pendingRef.current = false;
      return;
    }
    pendingRef.current = true;
    clearTimer();
    timerRef.current = setTimeout(persist, AUTOSAVE_DELAY_MS);
    return clearTimer;
  }, [draft, isDirty, persist]);

  // Beim Verlassen ausstehende Änderungen sichern.
  useEffect(
    () => () => {
      if (pendingRef.current && !closedRef.current) persist();
    },
    [persist],
  );

  // Erste echte Änderung macht den Wiederherstellen-Hinweis gegenstandslos.
  useEffect(() => {
    if (isDirty && banner?.kind === "restore") setBanner(null);
  }, [isDirty, banner]);

  const flush = useCallback(() => {
    if (pendingRef.current) persist();
  }, [persist]);

  const restore = useCallback(() => {
    if (banner?.kind !== "restore") return;
    // Der Entwurf ist bereits auf den aktuellen Objektstand umgesetzt (initFlowDraft);
    // ältere Entwürfe ohne Basis erhalten den aktuellen Objektstand als Basis.
    const stored = banner.draft.editBase ? banner.draft : { ...banner.draft, editBase: baseline.editBase };
    trackingRef.current = true;
    setSavedAt(stored.savedAt);
    setBanner(null);
    // Aktuellen Schritt beibehalten (URL), besuchte Schritte zusammenführen.
    const current = draftRef.current;
    const visitedSteps = [...new Set([...stored.visitedSteps, ...current.visitedSteps])];
    dispatch({ type: "replace", draft: { ...stored, stepId: current.stepId, visitedSteps } });
  }, [banner, baseline]);

  // Bearbeiten: Ändert sich das Objekt (z. B. erster Cloud-Sync nach Start aus dem
  // Zwischenspeicher, Änderung im Arbeitsbereich), solange im Flow nichts geändert
  // wurde, mit dem aktuellen Stand neu beginnen. Bei Änderungen im Flow schützt der
  // Drei-Wege-Abgleich beim Speichern (editBase) die Objektänderungen.
  const projectKey = useMemo(
    () => (mode === "edit" && project ? draftContentKey(calcDraftFromProject(project, "")) : null),
    [mode, project],
  );
  const projectKeyRef = useRef(projectKey);
  useEffect(() => {
    if (projectKey === null || projectKey === projectKeyRef.current) return;
    projectKeyRef.current = projectKey;
    if (closedRef.current || isDirtyRef.current || !project) return;
    const next = initFlowDraft(mode, project, useStore.getState().calcDraft);
    const current = draftRef.current;
    const stepId = isStepVisible(current.stepId, next.draft) ? current.stepId : next.draft.stepId;
    const visitedSteps = [...new Set([...next.draft.visitedSteps, ...current.visitedSteps])];
    setBaseline(next.baseline);
    setBanner(next.banner);
    dispatch({ type: "replace", draft: { ...next.draft, stepId, visitedSteps } });
  }, [projectKey, mode, project]);

  const dismissStored = useCallback(() => {
    setBanner(null);
    if (useStore.getState().calcDraft?.editingId === project?.id) setCalcDraft(null);
  }, [project?.id, setCalcDraft]);

  const replaceStored = useCallback(() => {
    slotDecisionRef.current = "replace";
    setSlotDecision("replace");
    setStoredConflict(null);
    persist();
  }, [persist]);

  const keepStored = useCallback(() => {
    slotDecisionRef.current = "keep";
    setSlotDecision("keep");
    setStoredConflict(null);
  }, []);

  const startOver = useCallback(() => {
    clearTimer();
    pendingRef.current = false;
    const empty = createEmptyCalcDraft();
    setCalcDraft(null);
    lastSavedKeyRef.current = null;
    trackingRef.current = false;
    setSavedAt(null);
    setBanner(null);
    setBaseline(empty);
    dispatch({ type: "replace", draft: empty });
  }, [setCalcDraft]);

  const discard = useCallback(() => {
    closedRef.current = true;
    clearTimer();
    pendingRef.current = false;
    // Nur den eigenen Entwurf löschen — nie einen anderen, der den Speicher belegt.
    const stored = useStore.getState().calcDraft;
    if (!stored || !isForeignStoredDraft(stored, draftRef.current)) setCalcDraft(null);
  }, [setCalcDraft]);

  const close = useCallback(() => {
    closedRef.current = true;
    clearTimer();
    pendingRef.current = false;
  }, []);

  // Belegt ein fremder Entwurf den Speicher (und wurde „ersetzen“ nicht gewählt), wird nicht gesichert —
  // auch schon vor dem ersten Sicherungsversuch (z. B. Verlassen innerhalb der Entprellzeit).
  const storedSlot = useStore((s) => s.calcDraft);
  const autosaveBlocked =
    storedConflict !== null ||
    (slotDecision !== "replace" && !!storedSlot && isForeignStoredDraft(storedSlot, draft));

  return {
    draft,
    dispatch,
    baseline,
    isDirty,
    savedAt,
    banner,
    restore,
    dismissStored,
    startOver,
    discard,
    flush,
    close,
    storedConflict,
    autosaveBlocked,
    replaceStored,
    keepStored,
  };
}
