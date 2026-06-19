import { useState, useMemo, useCallback, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore, type Room, type FrequencyKey, type Project } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canAddProject, canUsePDF, getRoomLimit, isPaidPlan } from "@/lib/feature-gates";
import { type UpgradeTrigger } from "@/lib/billing-config";
import { calcProjectTotals } from "@/lib/calc";
import {
  calcHourlyRate,
  getDefaultConfig,
} from "@/lib/hourly-rate-calc";
import { getProjectWarnings, getWarningTypeKey } from "@/lib/warnings";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { type WizardStep } from "./kalkulation-wizard/constants";
import { StepIndicator } from "./kalkulation-wizard/StepIndicator";
import { Step1Object } from "./kalkulation-wizard/steps/Step1Object";
import { Step2Rooms } from "./kalkulation-wizard/steps/Step2Rooms";
import { Step3Frequency } from "./kalkulation-wizard/steps/Step3Frequency";
import { Step4Performance } from "./kalkulation-wizard/steps/Step4Performance";
import { Step5SetupTime } from "./kalkulation-wizard/steps/Step5SetupTime";
import { Step6Rate } from "./kalkulation-wizard/steps/Step6Rate";
import { Step7Check } from "./kalkulation-wizard/steps/Step7Check";
import { Step8Result } from "./kalkulation-wizard/steps/Step8Result";

const stepMotionProps = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
};

export default function KalkulationWizard() {
  const [, params] = useRoute("/kalkulation/:id");
  const [, setLocation] = useLocation();
  const hourlyRate = useStore((s) => s.hourlyRate);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const targetMargin = useStore((s) => s.targetMargin);
  const plan = useStore((s) => s.plan);
  const actions = useStoreActions();

  const editId = params?.id;
  const isNew = !editId || editId === "neu";
  const existingProject = useStore((s) => s.projects.find((p) => p.id === editId));

  const [step, setStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [location_, setLocation_] = useState("");
  const [notes, setNotes] = useState("");
  const [objectType, setObjectType] = useState("");
  const [contactName, setContactName] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [ruestzeit, setRuestzeit] = useState(15);
  const [wegezeit, setWegezeit] = useState(0);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | undefined>(undefined);

  useEffect(() => {
    if (existingProject && !isNew) {
      setName(existingProject.name);
      setCustomer(existingProject.customer || "");
      setLocation_(existingProject.location || "");
      setNotes(existingProject.notes || "");
      setObjectType(existingProject.objectType || "");
      setContactName(existingProject.rpiContactName || "");
      setRateInput(existingProject.hourlyRate ? existingProject.hourlyRate.toString().replace(".", ",") : "");
      setRuestzeit(existingProject.ruestzeit ?? 15);
      setWegezeit(existingProject.wegezeit ?? 0);
      setRooms(existingProject.rooms.map((r) => ({ ...r })));
    }
  }, [existingProject, isNew]);

  const parsedRate = useMemo(() => {
    const v = rateInput ? parseFloat(rateInput.replace(",", ".")) : undefined;
    return v && v > 0 ? v : undefined;
  }, [rateInput]);

  const effectiveRate = parsedRate ?? hourlyRate;

  const tempProject: Project = useMemo(
    () => ({
      id: editId || "wizard-temp",
      name: name || "Neues Objekt",
      customer: customer || undefined,
      location: location_ || undefined,
      notes: notes || undefined,
      objectType: objectType || undefined,
      rpiContactName: contactName || undefined,
      hourlyRate: parsedRate,
      ruestzeit,
      wegezeit,
      status: "active" as const,
      createdAt: existingProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rooms,
    }),
    [name, customer, location_, notes, objectType, contactName, parsedRate, ruestzeit, wegezeit, rooms, editId, existingProject]
  );

  const totals = useMemo(
    () => calcProjectTotals(tempProject, effectiveRate),
    [tempProject, effectiveRate]
  );

  const breakdown = useMemo(() => calcHourlyRate(hourlyRateConfig), [hourlyRateConfig]);
  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());

  const warnings = useMemo(() => {
    if (rooms.length === 0) return [];
    const disabled = new Set(disabledWarnings);
    return getProjectWarnings(tempProject, hourlyRate, hourlyRateConfig, breakdown, isDefaultRate, targetMargin)
      .filter((w) => !disabled.has(getWarningTypeKey(w.id)));
  }, [tempProject, hourlyRate, hourlyRateConfig, breakdown, isDefaultRate, disabledWarnings, targetMargin, rooms]);

  const completenessChecks = useMemo(() => {
    const checks: { label: string; ok: boolean }[] = [];
    checks.push({ label: "Objektname vergeben", ok: name.trim().length > 0 });
    checks.push({ label: "Mindestens ein Raum erfasst", ok: rooms.length > 0 });
    checks.push({ label: "Alle Räume mit Fläche > 0", ok: rooms.every((r) => r.area > 0) });
    checks.push({ label: "Turnus für alle Räume gesetzt", ok: rooms.every((r) => !!r.frequency) });
    checks.push({ label: "Rüstzeit berücksichtigt", ok: ruestzeit > 0 });
    checks.push({ label: "Verrechnungssatz über Vollkosten", ok: effectiveRate >= breakdown.vollkosten });
    const marginPercent = effectiveRate > 0 ? ((effectiveRate - breakdown.vollkosten) / effectiveRate) * 100 : 0;
    checks.push({ label: "Marge im Zielbereich", ok: marginPercent >= targetMargin });
    checks.push({ label: "Leistungswerte plausibel", ok: !warnings.some((w) => w.id.includes("_perf_")) });
    return checks;
  }, [name, rooms, ruestzeit, effectiveRate, breakdown, targetMargin, warnings]);

  const completenessScore = useMemo(() => {
    const passed = completenessChecks.filter((c) => c.ok).length;
    return Math.round((passed / completenessChecks.length) * 100);
  }, [completenessChecks]);

  const handleAddRoom = (room: Omit<Room, "id">) => {
    if (editingRoom) {
      setRooms((prev) =>
        prev.map((r) => (r.id === editingRoom.id ? { ...r, ...room } : r))
      );
    } else {
      const newRoom: Room = {
        ...room,
        id: `wizard-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
      setRooms((prev) => [...prev, newRoom]);
    }
    setSheetOpen(false);
    setEditingRoom(undefined);
  };

  const openAddRoom = () => {
    if (!isPaidPlan(plan) && rooms.length >= getRoomLimit()) {
      setUpgradeReason(`Im Basic-Plan sind maximal ${getRoomLimit()} Räume pro Objekt enthalten. Für vollständige Kalkulationen ohne Raumlimit wechseln Sie zum Pro-Plan.`);
      setUpgradeTrigger("room_limit");
      setUpgradeOpen(true);
      return;
    }
    setEditingRoom(undefined);
    setSheetOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setSheetOpen(true);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setDeleteRoomId(null);
  };

  const updateRoomFrequency = useCallback((roomId: string, freq: FrequencyKey) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, frequency: freq } : r))
    );
  }, []);

  const setAllFrequencies = useCallback((freq: FrequencyKey) => {
    setRooms((prev) => prev.map((r) => ({ ...r, frequency: freq })));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isNew) {
        const gate = canAddProject();
        if (!gate.allowed) {
          setUpgradeReason(gate.reason || "");
          setUpgradeTrigger(gate.trigger);
          setUpgradeOpen(true);
          setIsSaving(false);
          return;
        }

        const projectName = name.trim() || "Neues Objekt";
        const id = await actions.addProject(projectName, customer.trim() || undefined);

        const updates: Record<string, unknown> = {};
        if (location_.trim()) updates.location = location_.trim();
        if (notes.trim()) updates.notes = notes.trim();
        if (objectType) updates.objectType = objectType;
        if (contactName.trim()) updates.rpiContactName = contactName.trim();
        if (parsedRate) updates.hourlyRate = parsedRate;
        updates.ruestzeit = ruestzeit;
        updates.wegezeit = wegezeit;
        if (Object.keys(updates).length > 0) {
          await actions.updateProject(id, updates);
        }

        for (const room of rooms) {
          const { id: _roomId, ...roomData } = room;
          await actions.addRoom(id, roomData);
        }

        toast.success("Objekt erstellt");
        setLocation(`/objekte/${id}`);
      } else {
        await actions.updateProject(editId!, {
          name: name.trim() || "Neues Objekt",
          customer: customer.trim() || undefined,
          location: location_.trim() || undefined,
          notes: notes.trim() || undefined,
          objectType: objectType || undefined,
          rpiContactName: contactName.trim() || undefined,
          hourlyRate: parsedRate ?? null,
          ruestzeit,
          wegezeit,
        } as any);

        const existingRoomIds = new Set(existingProject?.rooms.map((r) => r.id) || []);
        const newRoomIds = new Set(rooms.map((r) => r.id));

        for (const oldId of existingRoomIds) {
          if (!newRoomIds.has(oldId)) {
            await actions.deleteRoom(editId!, oldId);
          }
        }

        for (const room of rooms) {
          if (existingRoomIds.has(room.id)) {
            const { id: _roomId, ...roomData } = room;
            await actions.updateRoom(editId!, room.id, roomData);
          } else {
            const { id: _roomId, ...roomData } = room;
            await actions.addRoom(editId!, roomData);
          }
        }

        toast.success("Kalkulation gespeichert");
        setLocation(`/objekte/${editId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (name.trim() || customer.trim() || rooms.length > 0) {
      setCancelConfirm(true);
    } else {
      setLocation(isNew ? "/objekte" : `/objekte/${editId}`);
    }
  };

  const goToStep = (s: WizardStep) => {
    setStep(s);
  };

  const groupedRooms = useMemo(() => {
    const groups: Record<string, { groupName: string; rooms: Room[] }> = {};
    for (const room of rooms) {
      if (!groups[room.groupId]) {
        groups[room.groupId] = { groupName: room.groupName, rooms: [] };
      }
      groups[room.groupId].rooms.push(room);
    }
    return groups;
  }, [rooms]);

  const marginPercent = effectiveRate > 0
    ? ((effectiveRate - breakdown.vollkosten) / effectiveRate) * 100
    : 0;

  const readinessColor = completenessScore >= 80
    ? "text-success"
    : completenessScore >= 50
      ? "text-warning"
      : "text-destructive";

  const readinessLabel = completenessScore >= 80
    ? "Bereit für Angebot"
    : completenessScore >= 50
      ? "Entwurf"
      : "Unvollständig";

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="safe-header bg-background/95 border-b border-border/20 sticky top-0 z-40 px-4 pb-3 pt-4 md:pt-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
          <h2 className="text-sm font-semibold">{isNew ? "Neue Kalkulation" : "Kalkulation bearbeiten"}</h2>
          <div className="w-9" />
        </div>
        <StepIndicator current={step} onStepClick={goToStep} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" {...stepMotionProps} className="p-6 space-y-5 max-w-2xl mx-auto">
              <Step1Object
                name={name}
                setName={setName}
                customer={customer}
                setCustomer={setCustomer}
                location_={location_}
                setLocation_={setLocation_}
                notes={notes}
                setNotes={setNotes}
                objectType={objectType}
                setObjectType={setObjectType}
                contactName={contactName}
                setContactName={setContactName}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" {...stepMotionProps} className="p-6 max-w-2xl mx-auto">
              <Step2Rooms
                rooms={rooms}
                groupedRooms={groupedRooms}
                effectiveRate={effectiveRate}
                totals={totals}
                openAddRoom={openAddRoom}
                onEditRoom={handleEditRoom}
                onDeleteRoom={setDeleteRoomId}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" {...stepMotionProps} className="p-6 max-w-2xl mx-auto">
              <Step3Frequency
                rooms={rooms}
                groupedRooms={groupedRooms}
                setAllFrequencies={setAllFrequencies}
                updateRoomFrequency={updateRoomFrequency}
              />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" {...stepMotionProps} className="p-6 max-w-2xl mx-auto">
              <Step4Performance
                rooms={rooms}
                effectiveRate={effectiveRate}
                onEditRoom={handleEditRoom}
              />
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step5" {...stepMotionProps} className="p-6 max-w-2xl mx-auto">
              <Step5SetupTime
                ruestzeit={ruestzeit}
                setRuestzeit={setRuestzeit}
                wegezeit={wegezeit}
                setWegezeit={setWegezeit}
                totals={totals}
              />
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="step6" {...stepMotionProps} className="p-6 max-w-2xl mx-auto">
              <Step6Rate
                breakdown={breakdown}
                rateInput={rateInput}
                setRateInput={setRateInput}
                hourlyRate={hourlyRate}
                effectiveRate={effectiveRate}
                marginPercent={marginPercent}
                targetMargin={targetMargin}
              />
            </motion.div>
          )}

          {step === 7 && (
            <motion.div key="step7" {...stepMotionProps} className="p-6 max-w-2xl mx-auto">
              <Step7Check
                completenessScore={completenessScore}
                readinessColor={readinessColor}
                readinessLabel={readinessLabel}
                completenessChecks={completenessChecks}
                warnings={warnings}
                rooms={rooms}
              />
            </motion.div>
          )}

          {step === 8 && (
            <motion.div key="step8" {...stepMotionProps} className="p-6 max-w-2xl mx-auto">
              <Step8Result
                totals={totals}
                completenessScore={completenessScore}
                completenessChecks={completenessChecks}
                warnings={warnings}
                rooms={rooms}
                ruestzeit={ruestzeit}
                wegezeit={wegezeit}
                effectiveRate={effectiveRate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="sticky bottom-0 bg-background/95 border-t border-border/20 px-6 py-4 z-30"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
      >
        <div className="flex gap-3 max-w-2xl mx-auto">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((step - 1) as WizardStep)}
              className="h-12 px-4"
            >
              <ArrowLeft size={16} className="mr-1" />
              Zurück
            </Button>
          )}
          {step < 8 ? (
            <Button
              onClick={() => setStep((step + 1) as WizardStep)}
              className="flex-1 h-12"
            >
              Weiter
              <ArrowRight size={16} className="ml-1" />
            </Button>
          ) : (
            <div className="flex-1 flex gap-2">
              <Button
                onClick={handleSave}
                className="flex-1 h-12"
                disabled={isSaving}
              >
                <Check size={16} className="mr-1" />
                {isSaving ? "Wird gespeichert…" : isNew ? "Objekt speichern" : "Änderungen speichern"}
              </Button>
              {!isNew && existingProject && (
                <Button
                  variant="outline"
                  className="h-12 px-3"
                  onClick={() => {
                    const gate = canUsePDF();
                    if (!gate.allowed) {
                      setUpgradeReason(gate.reason || "");
                      setUpgradeTrigger(gate.trigger);
                      setUpgradeOpen(true);
                      return;
                    }
                    setLocation(`/print/${editId}`);
                  }}
                >
                  <Printer size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <RoomEditorSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingRoom(undefined); }}
        onSave={handleAddRoom}
        editRoom={editingRoom}
        hourlyRate={effectiveRate}
      />

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} triggerReason={upgradeTrigger} />

      <ConfirmDialog
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        onConfirm={() => setLocation(isNew ? "/objekte" : `/objekte/${editId}`)}
        title="Kalkulation abbrechen?"
        description="Alle eingegebenen Daten gehen verloren."
        confirmLabel="Abbrechen"
        destructive
      />

      <ConfirmDialog
        open={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        onConfirm={() => { if (deleteRoomId) handleDeleteRoom(deleteRoomId); }}
        title="Raum entfernen?"
        description="Der Raum wird aus der Liste entfernt."
        confirmLabel="Entfernen"
        destructive
      />
    </PageTransition>
  );
}
