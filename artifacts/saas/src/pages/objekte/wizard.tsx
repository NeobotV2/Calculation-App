import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useStore, type Room } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canAddProject, canUseTemplates, getRoomLimit, isPaidPlan } from "@/lib/feature-gates";
import { type UpgradeTrigger } from "@/lib/billing-config";
import { calcProjectTotals } from "@/lib/calc";
import { trackFirstObjectCreated } from "@/services/analytics-service";
import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { type WizardStep } from "./wizard-parts/constants";
import { StepIndicator } from "./wizard-parts/StepIndicator";
import { InfoStep } from "./wizard-parts/InfoStep";
import { RoomsStep } from "./wizard-parts/RoomsStep";
import { SummaryStep } from "./wizard-parts/SummaryStep";
import { ActionBar } from "./wizard-parts/ActionBar";

export default function ObjektWizard() {
  const [, setLocation] = useLocation();
  const hourlyRate = useStore((s) => s.hourlyRate);
  const templates = useStore((s) => s.templates);
  const actions = useStoreActions();

  const [step, setStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [location_, setLocation_] = useState("");
  const [notes, setNotes] = useState("");
  const [rateInput, setRateInput] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | undefined>(undefined);

  const parsedRate = useMemo(() => {
    const v = rateInput ? parseFloat(rateInput.replace(",", ".")) : undefined;
    return v && v > 0 ? v : undefined;
  }, [rateInput]);

  const effectiveRate = parsedRate ?? hourlyRate;

  const tempProject = useMemo(
    () => ({
      id: "wizard-temp",
      name: name || "Neues Objekt",
      customer: customer || undefined,
      location: location_ || undefined,
      notes: notes || undefined,
      hourlyRate: parsedRate,
      status: "active" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rooms,
    }),
    [name, customer, location_, notes, parsedRate, rooms],
  );

  const totals = useMemo(
    () => calcProjectTotals(tempProject, effectiveRate),
    [tempProject, effectiveRate],
  );

  const handleAddRoom = (room: Omit<Room, "id">) => {
    if (editingRoom) {
      setRooms((prev) =>
        prev.map((r) => (r.id === editingRoom.id ? { ...r, ...room } : r)),
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

  const plan = useStore((s) => s.plan);

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

  const handleDuplicateRoom = (roomId: string) => {
    if (!isPaidPlan(plan) && rooms.length >= getRoomLimit()) {
      setUpgradeReason(`Im Basic-Plan sind maximal ${getRoomLimit()} Räume pro Objekt enthalten. Für vollständige Kalkulationen ohne Raumlimit wechseln Sie zum Pro-Plan.`);
      setUpgradeTrigger("room_limit");
      setUpgradeOpen(true);
      return;
    }
    setRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === roomId);
      if (idx === -1) return prev;
      const copy: Room = {
        ...prev[idx],
        id: `wizard-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    toast.success("Raum dupliziert");
  };

  const handleApplyTemplate = (templateId: string) => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeTrigger(gate.trigger);
      setUpgradeOpen(true);
      return;
    }
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const copies: Room[] = tpl.rooms.map((r, i) => ({
      ...r,
      id: `wizard-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    setRooms((prev) => [...prev, ...copies]);
    toast.success(`Vorlage „${tpl.name}" geladen (${copies.length} Räume)`);
  };

  const handleSave = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeTrigger(gate.trigger);
      setUpgradeOpen(true);
      return;
    }

    setIsSaving(true);
    const isFirstObject = useStore.getState().projects.length === 0;
    try {
      const projectName = name.trim() || "Neues Objekt";
      const id = await actions.addProject(
        projectName,
        customer.trim() || undefined,
      );

      if (isFirstObject) {
        trackFirstObjectCreated(1);
      }

      const updates: Record<string, unknown> = {};
      if (location_.trim()) updates.location = location_.trim();
      if (notes.trim()) updates.notes = notes.trim();
      if (parsedRate) updates.hourlyRate = parsedRate;
      if (Object.keys(updates).length > 0) {
        await actions.updateProject(id, updates);
      }

      for (const room of rooms) {
        const { id: _roomId, ...roomData } = room;
        await actions.addRoom(id, roomData);
      }

      toast.success("Objekt erstellt");
      setLocation(`/objekte/${id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Erstellen",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      name.trim() ||
      customer.trim() ||
      location_.trim() ||
      notes.trim() ||
      rooms.length > 0
    ) {
      setCancelConfirm(true);
    } else {
      setLocation("/objekte");
    }
  };

  const canProceedStep1 = true;
  const canProceedStep2 = true;

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="safe-header bg-background/95 border-b border-border/20 sticky top-0 z-40 px-4 pb-4 pt-12">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleCancel}
            aria-label="Abbrechen"
            className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center"
          >
            <X size={16} className="text-muted-foreground" aria-hidden="true" />
          </button>
          <h2 className="text-base font-semibold">Neues Objekt</h2>
          <div className="w-9" />
        </div>
        <StepIndicator current={step} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <InfoStep
              name={name}
              setName={setName}
              customer={customer}
              setCustomer={setCustomer}
              location_={location_}
              setLocation_={setLocation_}
              rateInput={rateInput}
              setRateInput={setRateInput}
              notes={notes}
              setNotes={setNotes}
              hourlyRate={hourlyRate}
            />
          )}

          {step === 2 && (
            <RoomsStep
              rooms={rooms}
              effectiveRate={effectiveRate}
              totals={totals}
              templates={templates}
              onAddRoom={openAddRoom}
              onEditRoom={handleEditRoom}
              onDuplicateRoom={handleDuplicateRoom}
              onDeleteRoom={setDeleteRoomId}
              onApplyTemplate={handleApplyTemplate}
            />
          )}

          {step === 3 && (
            <SummaryStep
              name={name}
              customer={customer}
              location_={location_}
              notes={notes}
              rooms={rooms}
              effectiveRate={effectiveRate}
              parsedRate={parsedRate}
              totals={totals}
            />
          )}
        </AnimatePresence>
      </div>

      <ActionBar
        step={step}
        isSaving={isSaving}
        canProceedStep1={canProceedStep1}
        canProceedStep2={canProceedStep2}
        onBack={() => setStep((step - 1) as WizardStep)}
        onNext={() => setStep((step + 1) as WizardStep)}
        onSave={handleSave}
      />

      <RoomEditorSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingRoom(undefined);
        }}
        onSave={handleAddRoom}
        editRoom={editingRoom}
        hourlyRate={effectiveRate}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        triggerReason={upgradeTrigger}
      />

      <ConfirmDialog
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        onConfirm={() => setLocation("/objekte")}
        title="Wizard abbrechen?"
        description="Alle eingegebenen Daten gehen verloren."
        confirmLabel="Abbrechen"
        destructive
      />

      <ConfirmDialog
        open={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        onConfirm={() => {
          if (deleteRoomId) handleDeleteRoom(deleteRoomId);
        }}
        title="Raum entfernen?"
        description="Der Raum wird aus der Liste entfernt."
        confirmLabel="Entfernen"
        destructive
      />
    </PageTransition>
  );
}
