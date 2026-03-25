import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useStore, type Room } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canAddProject, BASIC_LIMITS } from "@/lib/feature-gates";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Edit3,
  Building2,
  MapPin,
  User,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

type WizardStep = 1 | 2 | 3;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Basisdaten",
  2: "Räume",
  3: "Zusammenfassung",
};

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-2 w-full max-w-xs mx-auto">
      {([1, 2, 3] as WizardStep[]).map((step) => {
        const isCompleted = step < current;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center flex-1 gap-2">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check size={14} /> : step}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${
                  isCurrent ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {step < 3 && (
              <div
                className={`h-0.5 flex-1 rounded-full -mt-4 ${
                  isCompleted ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ObjektWizard() {
  const [, setLocation] = useLocation();
  const hourlyRate = useStore((s) => s.hourlyRate);
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
    if (plan !== "pro" && rooms.length >= BASIC_LIMITS.maxRoomsPerProject) {
      setUpgradeReason(`Im Basic-Plan sind maximal ${BASIC_LIMITS.maxRoomsPerProject} Räume pro Objekt möglich.`);
      setUpgradeOpen(true);
      return;
    }
    setEditingRoom(undefined);
    setSheetOpen(true);
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setDeleteRoomId(null);
  };

  const handleSave = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const projectName = name.trim() || "Neues Objekt";
      const id = await actions.addProject(
        projectName,
        customer.trim() || undefined,
      );

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
            className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
          <h2 className="text-base font-semibold">Neues Objekt</h2>
          <div className="w-9" />
        </div>
        <StepIndicator current={step} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-5"
            >
              <div>
                <h3 className="text-2xl font-semibold tracking-tight mb-1">
                  Basisdaten
                </h3>
                <p className="text-sm text-muted-foreground">
                  Erfasse die Grunddaten des Objekts.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <Building2
                    size={14}
                    className="inline mr-1.5 text-muted-foreground"
                  />
                  Objektname
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Bürogebäude Musterstraße"
                  className="bg-card h-12"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <User
                    size={14}
                    className="inline mr-1.5 text-muted-foreground"
                  />
                  Kunde
                </label>
                <Input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="z.B. Muster GmbH"
                  className="bg-card h-12"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <MapPin
                    size={14}
                    className="inline mr-1.5 text-muted-foreground"
                  />
                  Standort / Adresse
                </label>
                <Input
                  value={location_}
                  onChange={(e) => setLocation_(e.target.value)}
                  placeholder="z.B. Berlin, Musterstraße 1"
                  className="bg-card h-12"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Stundensatz (€/h)
                </label>
                <Input
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  inputMode="decimal"
                  placeholder={`Standard: ${hourlyRate.toString().replace(".", ",")} €/h`}
                  className="bg-card h-12"
                />
                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  Leer = globaler Standard (
                  {hourlyRate.toString().replace(".", ",")} €/h)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <FileText
                    size={14}
                    className="inline mr-1.5 text-muted-foreground"
                  />
                  Notizen
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optionale Notizen zur Begehung"
                  className="bg-card h-12"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">
                  Räume & Erschwernisse
                </h3>
                <p className="text-sm text-muted-foreground">
                  Füge die Räume des Objekts hinzu.
                </p>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl mb-4">
                  <p className="text-muted-foreground mb-4">
                    Noch keine Räume erfasst.
                  </p>
                  <Button
                    onClick={openAddRoom}
                    variant="outline"
                    className="px-6"
                  >
                    <Plus size={16} className="mr-2" />
                    Ersten Raum hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {rooms.map((room) => {
                    const rc = calcRoom(room, effectiveRate);
                    return (
                      <div
                        key={room.id}
                        className="bg-card border border-border/20 rounded-2xl p-4 flex items-center group"
                      >
                        <div
                          className="flex-1 min-w-0 pr-3 cursor-pointer"
                          onClick={() => {
                            setEditingRoom(room);
                            setSheetOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground truncate">
                              {room.name || room.typeName}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                              {room.groupName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{room.area} m²</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-border" />
                            <span>{FREQUENCY_LABELS[room.frequency]}</span>
                            {(room.soilingLevel ||
                              room.furnishingLevel ||
                              room.floorType) && (
                              <>
                                <span className="w-0.5 h-0.5 rounded-full bg-border" />
                                <span className="text-primary">
                                  Zu-/Abschläge
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 pr-2">
                          <p className="font-bold text-foreground text-sm">
                            {formatCurrency(rc.monthlyCost)}
                          </p>
                          <p className="text-xs text-primary font-medium">
                            {formatNumber(rc.monthlyHours, 1)} h
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingRoom(room);
                              setSheetOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                          >
                            <Edit3
                              size={14}
                              className="text-muted-foreground"
                            />
                          </button>
                          <button
                            onClick={() => setDeleteRoomId(room.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    onClick={openAddRoom}
                    variant="outline"
                    className="w-full mt-3"
                    size="lg"
                  >
                    <Plus size={16} className="mr-2" />
                    Weiteren Raum hinzufügen
                  </Button>
                </div>
              )}

              {rooms.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Räume
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {rooms.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Fläche
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {formatNumber(totals.area, 0)} m²
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Monatspreis
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(totals.cost)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">
                  Zusammenfassung
                </h3>
                <p className="text-sm text-muted-foreground">
                  Prüfe die Daten und speichere das Objekt.
                </p>
              </div>

              <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">
                  Objektdaten
                </h4>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Projektname</span>
                    <span className="font-medium text-foreground">
                      {name.trim() || "Neues Objekt"}
                    </span>
                  </div>
                  {customer.trim() && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kunde</span>
                      <span className="font-medium text-foreground">
                        {customer.trim()}
                      </span>
                    </div>
                  )}
                  {location_.trim() && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Standort</span>
                      <span className="font-medium text-foreground">
                        {location_.trim()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stundensatz</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(effectiveRate)}/h
                      {!parsedRate && (
                        <span className="text-muted-foreground ml-1">
                          (Standard)
                        </span>
                      )}
                    </span>
                  </div>
                  {notes.trim() && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Notizen</span>
                      <span className="font-medium text-foreground max-w-[60%] text-right">
                        {notes.trim()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">
                  Räume ({rooms.length})
                </h4>
                {rooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Keine Räume hinzugefügt
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rooms.map((room) => {
                      const rc = calcRoom(room, effectiveRate);
                      return (
                        <div
                          key={room.id}
                          className="flex items-center justify-between py-2 border-b border-border/10 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {room.name || room.typeName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {room.area} m² ·{" "}
                              {FREQUENCY_LABELS[room.frequency]}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">
                              {formatCurrency(rc.monthlyCost)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(rc.monthlyHours, 1)} h/Mo
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">
                  Gesamtkalkulation
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Monatspreis
                    </p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(totals.cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Jahreskosten
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(totals.annualCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Stunden/Monat
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatNumber(totals.hours, 1)} h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Gesamtfläche
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatNumber(totals.area, 0)} m²
                    </p>
                  </div>
                  {totals.area > 0 && (
                    <div className="col-span-2 pt-2 border-t border-primary/20">
                      <div className="flex justify-between">
                        <p className="text-xs text-muted-foreground">
                          Preis pro m²
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(totals.pricePerSqm)}/m²
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="sticky bottom-0 bg-background/95 border-t border-border/20 px-6 py-4 z-30"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
      >
        <div className="flex gap-3">
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
          {step < 3 ? (
            <Button
              onClick={() => setStep((step + 1) as WizardStep)}
              className="flex-1 h-12"
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Weiter
              <ArrowRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              className="flex-1 h-12"
              disabled={isSaving}
            >
              <Check size={16} className="mr-1" />
              {isSaving ? "Wird gespeichert…" : "Objekt speichern"}
            </Button>
          )}
        </div>
      </div>

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
