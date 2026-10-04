import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useStore, type Project } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PlanLimitError, canAddProject, type GateResult } from "@/lib/feature-gates";
import type { CalcDraft } from "@/lib/drafts";
import { stripRoomId } from "@/components/calc/rooms/rooms-editor-logic";
import {
  trackFirstCalculationCompleted,
  trackFirstObjectCreated,
  trackTenderConverted,
} from "@/services/analytics-service";
import {
  buildCreatePlan,
  buildEditUpdates,
  diffRooms,
  mayClearStoredDraft,
  mergeEditDraft,
  roomsToSave,
  type FlowMode,
  type ProjectUpdates,
} from "./flow-state";

export interface FlowSaveOptions {
  /** Nach dem Speichern zu /objekte/{id} wechseln (Standard: true). */
  navigate?: boolean;
}

export interface UseFlowSaveOptions {
  draft: CalcDraft;
  mode: FlowMode;
  /** Objektlimit (Neuanlage) erreicht ⇒ z. B. UpgradeModal öffnen. */
  onGateBlocked: (gate: GateResult) => void;
  /** Direkt nach erfolgreichem Speichern (vor Toast/Navigation), z. B. Autosave beenden. */
  onSaved?: (id: string) => void;
}

export interface FlowSaveApi {
  /** Speichert den Entwurf; liefert die Objekt-ID oder null (gesperrt/Fehler). */
  save: (opts?: FlowSaveOptions) => Promise<string | null>;
  saving: boolean;
  /** Fehlermeldung des letzten Versuchs (für den Callout „Speichern fehlgeschlagen: …“). */
  error: string | null;
  /** Letzten Speicherversuch wiederholen. */
  retry: () => Promise<string | null>;
  clearError: () => void;
}

/**
 * Speichern des Flows (UX §6.5). Neuanlage: addProject → updateProject →
 * addRoom je Raum, danach Analytics. Bearbeiten: Drei-Wege-Abgleich — nur
 * was der Flow gegenüber seiner Basis (`editBase`, Objektstand beim Öffnen)
 * geändert hat, wird geschrieben; Räume und Felder, die inzwischen im
 * Arbeitsbereich oder auf einem anderen Gerät geändert wurden, bleiben
 * erhalten. Danach updateProject und Raum-Diff (löschen, ändern, hinzufügen)
 * gegen den aktuellen Store-Stand, damit Wiederholungen nach einem Teilfehler
 * nichts doppelt anlegen.
 */
export function useFlowSave({ draft, mode, onGateBlocked, onSaved }: UseFlowSaveOptions): FlowSaveApi {
  const actions = useStoreActions();
  const setCalcDraft = useStore((s) => s.setCalcDraft);
  const [, navigate] = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savingRef = useRef(false);
  /** Neuanlage: bereits angelegtes Objekt (Teilfehler ⇒ Wiederholung ergänzt nur). */
  const createdIdRef = useRef<string | null>(null);
  const isFirstRef = useRef<boolean | null>(null);
  const lastOptsRef = useRef<FlowSaveOptions | undefined>(undefined);
  /**
   * Bearbeiten: Objektstand vor dem ersten Speicherversuch. Wiederholungen
   * führen gegen diesen Stand zusammen — teilweise Geschriebenes zählt so
   * nicht als „außerhalb geändert“ (sonst entstünden Räume doppelt).
   */
  const mergeTheirsRef = useRef<Project | null>(null);

  /** Objekt an den Entwurf angleichen (Felder, Module, Räume). */
  const syncProject = useCallback(
    async (id: string, d: CalcDraft) => {
      const existing = useStore.getState().projects.find((p) => p.id === id);
      if (!existing) throw new Error("Das Objekt wurde nicht gefunden – möglicherweise gelöscht.");
      let target = d;
      if (d.editBase && d.editingId === id) {
        if (!mergeTheirsRef.current) mergeTheirsRef.current = existing;
        target = mergeEditDraft(d, d.editBase, mergeTheirsRef.current);
      }
      await actions.updateProject(id, buildEditUpdates(target, existing) as unknown as ProjectUpdates);
      const diff = diffRooms(existing.rooms, roomsToSave(target));
      for (const roomId of diff.toDelete) await actions.deleteRoom(id, roomId);
      for (const room of diff.toUpdate) await actions.updateRoom(id, room.id, stripRoomId(room));
      for (const room of diff.toAdd) await actions.addRoom(id, room);
    },
    [actions],
  );

  const save = useCallback(
    async (opts?: FlowSaveOptions): Promise<string | null> => {
      if (savingRef.current) return null;
      lastOptsRef.current = opts;
      const d = draft;

      let id: string;
      const isCreate = mode === "create";
      if (isCreate && !createdIdRef.current) {
        const gate = canAddProject();
        if (!gate.allowed) {
          onGateBlocked(gate);
          return null;
        }
      }

      savingRef.current = true;
      setSaving(true);
      setError(null);
      try {
        if (isCreate) {
          if (createdIdRef.current) {
            id = createdIdRef.current;
            await syncProject(id, d);
          } else {
            if (isFirstRef.current === null) isFirstRef.current = useStore.getState().projects.length === 0;
            const plan = buildCreatePlan(d);
            id = await actions.addProject(plan.name, plan.customer);
            createdIdRef.current = id;
            await actions.updateProject(id, plan.updates);
            for (const room of plan.rooms) await actions.addRoom(id, room);
          }
          if (isFirstRef.current) {
            trackFirstObjectCreated(1);
            trackFirstCalculationCompleted();
          }
          if (d.source === "tender") trackTenderConverted(roomsToSave(d).length);
        } else {
          if (!d.editingId) throw new Error("Kein Objekt zum Bearbeiten.");
          id = d.editingId;
          await syncProject(id, d);
        }

        mergeTheirsRef.current = null;
        onSaved?.(id);
        if (mayClearStoredDraft(useStore.getState().calcDraft, d)) setCalcDraft(null);
        toast.success(isCreate ? "Objekt erstellt" : "Kalkulation gespeichert");
        if (opts?.navigate !== false) navigate(`/objekte/${id}`);
        return id;
      } catch (err) {
        // Geändertes Beispielobjekt über dem Objektlimit: UpgradeModal statt Fehlermeldung.
        if (err instanceof PlanLimitError) onGateBlocked(err.gate);
        else setError(err instanceof Error && err.message ? err.message : "Unbekannter Fehler");
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [draft, mode, onGateBlocked, onSaved, actions, syncProject, setCalcDraft, navigate],
  );

  const retry = useCallback(() => save(lastOptsRef.current), [save]);
  const clearError = useCallback(() => setError(null), []);

  return { save, saving, error, retry, clearError };
}

