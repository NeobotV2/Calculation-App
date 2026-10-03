import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RoomsEditor, type RoomsEditorHandle } from "@/components/calc/RoomsEditor";
import { SetupTimeEditor, type SetupTimeValue } from "@/components/calc/SetupTimeEditor";
import { setupTimeTotals, stripRoomId } from "@/components/calc/rooms/rooms-editor-logic";
import { formatMoney } from "@/components/ui/money";
import { useEconomicsSettings } from "@/hooks/use-object-economics";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useAuth } from "@/lib/auth-context";
import { FREQUENCY_LABELS } from "@/lib/calc";
import { canAddRoom, type GateResult } from "@/lib/feature-gates";
import type { ObjectEconomics } from "@/lib/object-economics";
import type { FrequencyKey, Project, Room } from "@/store/use-store";
import { frequencyChangePreview, type FrequencyChangePreview } from "./workspace-tabs";

/** Speicherverzögerung für Rüst-/Wegezeit in der Cloud (eine Anfrage statt einer je Tastendruck). */
const SETUP_TIME_DEBOUNCE_MS = 600;

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export interface CleaningTabProps {
  project: Project;
  economics: ObjectEconomics;
  readOnly?: boolean;
  /** Imperativer Zugriff (z. B. „+ Raum“ in der StickyActionBar). */
  editorRef?: Ref<RoomsEditorHandle>;
  /** Raumlimit erreicht ⇒ UpgradeModal. */
  onGateBlocked: (gate: GateResult) => void;
}

/**
 * Tab „Unterhaltsreinigung“ (§8.3): Räume direkt im Objekt bearbeiten
 * (sofort gespeichert), Rüst-/Wegezeit als editierbare Fußzeilen,
 * „Turnus für alle“ mit Preisvorschau und Bestätigung.
 */
export function CleaningTab({ project, economics, readOnly = false, editorRef, onGateBlocked }: CleaningTabProps) {
  const actions = useStoreActions();
  const { isAuthenticated } = useAuth();
  const settings = useEconomicsSettings();
  const rate = economics.effectiveRate;
  const projectId = project.id;

  /* ── Räume ── */

  const handleAdd = useCallback((room: Omit<Room, "id">) => actions.addRoom(projectId, room), [actions, projectId]);

  // Sheet-Speichern wartet auf das Promise (Fehler erscheinen dort inline);
  // der Turnus-Chip ruft es ohne await auf ⇒ Fehler zusätzlich als Toast,
  // und die Ablehnung gilt als behandelt.
  const handleUpdate = useCallback(
    (id: string, room: Omit<Room, "id">) => {
      const p = actions.updateRoom(projectId, id, room).catch((err: unknown) => {
        toast.error(errorMessage(err, "Der Raum konnte nicht gespeichert werden."));
        throw err;
      });
      p.catch(() => undefined);
      return p;
    },
    [actions, projectId],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await actions.deleteRoom(projectId, id);
        toast.success("Raum entfernt");
      } catch (err) {
        toast.error(errorMessage(err, "Der Raum konnte nicht entfernt werden."));
      }
    },
    [actions, projectId],
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      const room = project.rooms.find((r) => r.id === id);
      if (!room) return;
      try {
        await actions.addRoom(projectId, { ...stripRoomId(room), name: `${room.name || room.typeName} (Kopie)` });
        toast.success("Raum dupliziert");
      } catch (err) {
        toast.error(errorMessage(err, "Der Raum konnte nicht dupliziert werden."));
      }
    },
    [actions, project.rooms, projectId],
  );

  const handleReorder = useCallback(
    (from: number, to: number) => {
      actions.reorderRooms(projectId, from, to);
    },
    [actions, projectId],
  );

  const checkRoomLimit = useCallback(() => canAddRoom(projectId), [projectId]);

  /* ── Turnus für alle ── */

  const [bulk, setBulk] = useState<{ frequency: FrequencyKey; preview: FrequencyChangePreview } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const requestBulkFrequency = (frequency: FrequencyKey) => {
    const preview = frequencyChangePreview(project, frequency, settings, { breakdown: economics.breakdown });
    if (preview.changedCount === 0) {
      toast.info(`Alle Räume haben bereits den Turnus „${FREQUENCY_LABELS[frequency]}“.`);
      return;
    }
    setBulk({ frequency, preview });
    setBulkOpen(true);
  };

  const applyBulkFrequency = async (frequency: FrequencyKey) => {
    const targets = project.rooms.filter((r) => r.frequency !== frequency);
    const toastId = toast.loading(`Turnus wird geändert … 0 von ${targets.length}`);
    let done = 0;
    try {
      for (const room of targets) {
        await actions.updateRoom(projectId, room.id, { frequency });
        done += 1;
        toast.loading(`Turnus wird geändert … ${done} von ${targets.length}`, { id: toastId });
      }
      toast.success(`Turnus für ${done} ${done === 1 ? "Raum" : "Räume"} geändert`, { id: toastId });
    } catch (err) {
      toast.error(
        `${errorMessage(err, "Der Turnus konnte nicht geändert werden.")} (${done} von ${targets.length} geändert)`,
        { id: toastId },
      );
    }
  };

  /* ── Rüst- und Wegezeit ── */

  const saved: SetupTimeValue = { ruestzeit: project.ruestzeit ?? 0, wegezeit: project.wegezeit ?? 0 };
  const [pendingSetup, setPendingSetup] = useState<SetupTimeValue | null>(null);
  const setupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSetup = useRef<SetupTimeValue | null>(null);
  const shownSetup = pendingSetup ?? saved;

  const persistSetup = useCallback(
    async (value: SetupTimeValue) => {
      try {
        await actions.updateProject(projectId, { ruestzeit: value.ruestzeit, wegezeit: value.wegezeit });
      } catch (err) {
        toast.error(errorMessage(err, "Rüst- und Wegezeit konnten nicht gespeichert werden."));
      } finally {
        if (latestSetup.current === value) {
          latestSetup.current = null;
          setPendingSetup(null);
        }
      }
    },
    [actions, projectId],
  );

  const handleSetupChange = (value: SetupTimeValue) => {
    if (!isAuthenticated) {
      // Lokal: sofort speichern – Preis und Summen folgen ohne Verzögerung.
      void persistSetup(value);
      return;
    }
    latestSetup.current = value;
    setPendingSetup(value);
    if (setupTimer.current) clearTimeout(setupTimer.current);
    setupTimer.current = setTimeout(() => {
      setupTimer.current = null;
      void persistSetup(value);
    }, SETUP_TIME_DEBOUNCE_MS);
  };

  // Beim Verlassen des Tabs ausstehende Eingaben sofort speichern.
  const persistRef = useRef(persistSetup);
  useEffect(() => {
    persistRef.current = persistSetup;
  }, [persistSetup]);
  useEffect(
    () => () => {
      if (setupTimer.current) {
        clearTimeout(setupTimer.current);
        setupTimer.current = null;
        if (latestSetup.current) void persistRef.current(latestSetup.current);
      }
    },
    [],
  );

  const footerAmounts = setupTimeTotals(shownSetup, project.rooms, rate);

  return (
    <section aria-label="Unterhaltsreinigung" className="space-y-4">
      <h2 className="sr-only">Unterhaltsreinigung</h2>
      <RoomsEditor
        ref={editorRef}
        mode="persisted"
        rooms={project.rooms}
        rate={rate}
        readOnly={readOnly}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onReorder={actions.canReorderRooms ? handleReorder : undefined}
        onSetAllFrequencies={requestBulkFrequency}
        checkRoomLimit={checkRoomLimit}
        onGateBlocked={onGateBlocked}
        footer={
          <SetupTimeEditor
            compact
            ruestzeit={shownSetup.ruestzeit}
            wegezeit={shownSetup.wegezeit}
            onChange={handleSetupChange}
            rooms={project.rooms}
            rate={rate}
            readOnly={readOnly}
          />
        }
        footerAmounts={{
          hoursMonthly: footerAmounts.hoursMonthly,
          priceMonthly: footerAmounts.priceMonthly,
          rows: [
            { key: "ruestzeit", hoursMonthly: footerAmounts.ruestzeitHours, priceMonthly: footerAmounts.ruestzeitHours * rate },
            { key: "wegezeit", hoursMonthly: footerAmounts.wegezeitHours, priceMonthly: footerAmounts.wegezeitHours * rate },
          ],
        }}
        totalLabel="Unterhalt gesamt"
        caption="Räume der Unterhaltsreinigung"
      />

      <ConfirmDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={() => {
          if (bulk) void applyBulkFrequency(bulk.frequency);
        }}
        title={
          bulk
            ? `Turnus für alle ${bulk.preview.roomCount} Räume auf „${FREQUENCY_LABELS[bulk.frequency]}“ setzen?`
            : "Turnus ändern?"
        }
        description={
          bulk
            ? `Monatspreis: ${formatMoney(bulk.preview.oldPriceMonthly)} → ${formatMoney(bulk.preview.newPriceMonthly)} (${formatMoney(
                bulk.preview.deltaMonthly,
                { signed: true },
              )} pro Monat netto). ${bulk.preview.changedCount} von ${bulk.preview.roomCount} Räumen werden geändert.`
            : ""
        }
        confirmLabel="Turnus übernehmen"
      />
    </section>
  );
}
