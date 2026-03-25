import { useState, useMemo, useCallback, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore, type Room, type FrequencyKey, type Project } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { canAddProject, canAddRoom, canUsePDF, getRoomLimit, isPaidPlan } from "@/lib/feature-gates";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS, FREQUENCY_FACTORS, getEffectivePerformance } from "@/lib/calc";
import {
  calcHourlyRate,
  getDefaultConfig,
} from "@/lib/hourly-rate-calc";
import { getProjectWarnings, getWarningTypeKey } from "@/lib/warnings";
import { getSurchargeLabel } from "@/data/surcharges";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
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
  Clock,
  Car,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Objekt",
  2: "Räume",
  3: "Turnus",
  4: "Leistung",
  5: "Rüstzeit",
  6: "Kosten",
  7: "Prüfung",
  8: "Ergebnis",
};

const OBJECT_TYPES = [
  "Büro",
  "Praxis",
  "Schule",
  "Hotel",
  "Einzelhandel",
  "Industrie",
  "Wohnanlage",
  "Öffentlich",
  "Sonstiges",
];

function StepIndicator({ current, onStepClick }: { current: WizardStep; onStepClick: (s: WizardStep) => void }) {
  return (
    <div className="flex items-center gap-0.5 w-full max-w-lg mx-auto px-2">
      {([1, 2, 3, 4, 5, 6, 7, 8] as WizardStep[]).map((step) => {
        const isCompleted = step < current;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center flex-1 gap-0.5">
            <div className="flex flex-col items-center flex-1">
              <button
                onClick={() => onStepClick(step)}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors",
                  isCompleted
                    ? "bg-primary text-primary-foreground cursor-pointer"
                    : isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                      : "bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80"
                )}
              >
                {isCompleted ? <Check size={12} /> : step}
              </button>
              <span
                className={cn(
                  "text-[9px] mt-0.5 font-medium hidden sm:block",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {step < 8 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full -mt-3 sm:-mt-5 min-w-[8px]",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function fmtEuro(v: number) {
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
      setUpgradeReason(`Im Free-Plan sind maximal ${getRoomLimit()} Räume pro Objekt möglich.`);
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

  const frequencyOptions: { key: FrequencyKey; label: string; short: string }[] = [
    { key: "monthly", label: "1x im Monat", short: "1x/Mo" },
    { key: "biweekly", label: "Alle 14 Tage", short: "14-tägig" },
    { key: "1x_week", label: "1x wöchentlich", short: "1x/Wo" },
    { key: "2x_week", label: "2x wöchentlich", short: "2x/Wo" },
    { key: "3x_week", label: "3x wöchentlich", short: "3x/Wo" },
    { key: "5x_week", label: "5x wöchentlich", short: "5x/Wo" },
    { key: "7x_week", label: "Täglich", short: "Täglich" },
  ];

  const marginPercent = effectiveRate > 0
    ? ((effectiveRate - breakdown.vollkosten) / effectiveRate) * 100
    : 0;

  const readinessColor = completenessScore >= 80
    ? "text-emerald-500"
    : completenessScore >= 50
      ? "text-yellow-500"
      : "text-red-500";

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
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-5 max-w-2xl mx-auto"
            >
              <div>
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Objekt & Grunddaten</h3>
                <p className="text-sm text-muted-foreground">Erfasse die Grunddaten des Objekts.</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <Building2 size={14} className="inline mr-1.5 text-muted-foreground" />
                  Objektname *
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
                  <User size={14} className="inline mr-1.5 text-muted-foreground" />
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
                  <MapPin size={14} className="inline mr-1.5 text-muted-foreground" />
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
                <label className="text-sm font-medium mb-2 block">Objektart</label>
                <div className="flex flex-wrap gap-2">
                  {OBJECT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setObjectType(objectType === t ? "" : t)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                        objectType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/40 text-muted-foreground hover:border-border"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ansprechpartner</label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="z.B. Herr Müller"
                  className="bg-card h-12"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  <FileText size={14} className="inline mr-1.5 text-muted-foreground" />
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
              className="p-6 max-w-2xl mx-auto"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Raumgruppen & Flächen</h3>
                <p className="text-sm text-muted-foreground">
                  Erfasse die Räume des Objekts nach Gruppen.
                </p>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl mb-4">
                  <p className="text-muted-foreground mb-4">Noch keine Räume erfasst.</p>
                  <Button onClick={openAddRoom} variant="outline" className="px-6">
                    <Plus size={16} className="mr-2" />
                    Ersten Raum hinzufügen
                  </Button>
                </div>
              ) : (
                <>
                  {Object.entries(groupedRooms).map(([groupId, group]) => {
                    const groupArea = group.rooms.reduce((s, r) => s + r.area, 0);
                    return (
                      <div key={groupId} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-foreground">{group.groupName}</h4>
                          <span className="text-xs text-primary font-medium">{formatNumber(groupArea, 0)} m²</span>
                        </div>
                        <div className="space-y-1.5">
                          {group.rooms.map((room) => {
                            const rc = calcRoom(room, effectiveRate);
                            return (
                              <div
                                key={room.id}
                                className="bg-card border border-border/20 rounded-xl p-3 flex items-center"
                              >
                                <div
                                  className="flex-1 min-w-0 pr-3 cursor-pointer"
                                  onClick={() => { setEditingRoom(room); setSheetOpen(true); }}
                                >
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-medium text-sm text-foreground truncate">
                                      {room.name || room.typeName}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span>{room.area} m²</span>
                                    <span className="w-0.5 h-0.5 rounded-full bg-border" />
                                    <span>{FREQUENCY_LABELS[room.frequency]}</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 pr-2">
                                  <p className="font-bold text-foreground text-sm">{formatCurrency(rc.monthlyCost)}</p>
                                  <p className="text-xs text-primary font-medium">{formatNumber(rc.monthlyHours, 1)} h</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => { setEditingRoom(room); setSheetOpen(true); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                                  >
                                    <Edit3 size={14} className="text-muted-foreground" />
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
                        </div>
                      </div>
                    );
                  })}

                  <Button onClick={openAddRoom} variant="outline" className="w-full mt-3" size="lg">
                    <Plus size={16} className="mr-2" />
                    Weiteren Raum hinzufügen
                  </Button>
                </>
              )}

              {rooms.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Räume</p>
                      <p className="text-lg font-bold text-foreground">{rooms.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Fläche</p>
                      <p className="text-lg font-bold text-foreground">{formatNumber(totals.area, 0)} m²</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monatspreis</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(totals.cost)}</p>
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
              className="p-6 max-w-2xl mx-auto"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Reinigungsturnus</h3>
                <p className="text-sm text-muted-foreground">
                  Wähle die Reinigungsfrequenz — global oder pro Raumgruppe.
                </p>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl">
                  <p className="text-muted-foreground">Füge zuerst Räume hinzu (Schritt 2).</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                      Globaler Turnus (alle Räume)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {frequencyOptions.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setAllFrequencies(f.key)}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                            rooms.every((r) => r.frequency === f.key)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border/40 text-muted-foreground hover:border-border"
                          )}
                        >
                          {f.short}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                      Pro Raumgruppe anpassen
                    </label>
                    {Object.entries(groupedRooms).map(([groupId, group]) => (
                      <div key={groupId} className="bg-card border border-border/20 rounded-2xl p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3">{group.groupName}</h4>
                        {group.rooms.map((room) => (
                          <div key={room.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                            <span className="text-sm text-foreground truncate flex-1 pr-3">
                              {room.name || room.typeName}
                              <span className="text-xs text-muted-foreground ml-1">({room.area} m²)</span>
                            </span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {frequencyOptions.map((f) => (
                                <button
                                  key={f.key}
                                  onClick={() => updateRoomFrequency(room.id, f.key)}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[11px] font-medium transition-colors",
                                    room.frequency === f.key
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-background border border-border/30 text-muted-foreground"
                                  )}
                                >
                                  {f.short}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 max-w-2xl mx-auto"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Leistungsbausteine</h3>
                <p className="text-sm text-muted-foreground">
                  Leistungskennzahlen, Zu-/Abschläge und Reinigungszeit pro Raum.
                </p>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl">
                  <p className="text-muted-foreground">Füge zuerst Räume hinzu (Schritt 2).</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room) => {
                    const rc = calcRoom(room, effectiveRate);
                    const effPerf = getEffectivePerformance(room);
                    const hasSurcharges = room.soilingLevel || room.furnishingLevel || room.floorType;
                    return (
                      <div key={room.id} className="bg-card border border-border/20 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{room.name || room.typeName}</h4>
                            <p className="text-xs text-muted-foreground">{room.groupName} · {room.area} m²</p>
                          </div>
                          <button
                            onClick={() => { setEditingRoom(room); setSheetOpen(true); }}
                            className="text-xs text-primary font-medium hover:underline"
                          >
                            Anpassen
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-background rounded-lg p-2">
                            <span className="text-muted-foreground">Leistungswert</span>
                            <p className="font-semibold text-foreground">
                              {room.customPerformance || room.typePerformance} m²/h
                              {room.customPerformance && (
                                <span className="text-muted-foreground font-normal ml-1">(angepasst)</span>
                              )}
                            </p>
                          </div>
                          <div className="bg-background rounded-lg p-2">
                            <span className="text-muted-foreground">Eff. Leistung</span>
                            <p className="font-semibold text-primary">{formatNumber(effPerf, 0)} m²/h</p>
                          </div>
                          <div className="bg-background rounded-lg p-2">
                            <span className="text-muted-foreground">Zeit / Reinigung</span>
                            <p className="font-semibold text-foreground">{formatNumber(rc.timePerCleaning * 60, 0)} Min.</p>
                          </div>
                          <div className="bg-background rounded-lg p-2">
                            <span className="text-muted-foreground">Stunden / Monat</span>
                            <p className="font-semibold text-foreground">{formatNumber(rc.monthlyHours, 1)} h</p>
                          </div>
                        </div>
                        {hasSurcharges && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {room.soilingLevel && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                                {getSurchargeLabel("soilingLevel", room.soilingLevel)}
                              </span>
                            )}
                            {room.furnishingLevel && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                                {getSurchargeLabel("furnishingLevel", room.furnishingLevel)}
                              </span>
                            )}
                            {room.floorType && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                                {getSurchargeLabel("floorType", room.floorType)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 max-w-2xl mx-auto"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Rüstzeit & Wegezeit</h3>
                <p className="text-sm text-muted-foreground">
                  Zeit für Anfahrt, Material holen, Umziehen — separat kalkuliert.
                </p>
              </div>

              <div className="bg-card border-2 border-primary/20 rounded-2xl p-5 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className="text-primary" />
                    <label className="text-sm font-semibold text-foreground">Rüstzeit pro Einsatz</label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Ankommen, Material holen, Umziehen, Aufräumen am Ende
                  </p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[0, 10, 15, 20, 30].map((v) => (
                      <button
                        key={v}
                        onClick={() => setRuestzeit(v)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border min-w-[60px]",
                          ruestzeit === v
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border/40 text-muted-foreground hover:border-border"
                        )}
                      >
                        {v} Min.
                      </button>
                    ))}
                  </div>
                  <Input
                    inputMode="numeric"
                    value={ruestzeit.toString()}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 0) setRuestzeit(v);
                      else if (e.target.value === "") setRuestzeit(0);
                    }}
                    placeholder="Minuten"
                    className="bg-background h-12 text-lg font-semibold"
                  />
                </div>

                <div className="border-t border-border/20 pt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Car size={18} className="text-primary" />
                    <label className="text-sm font-semibold text-foreground">Wegezeit pro Einsatz</label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Fahrt zum Objekt, ggf. zwischen Etagen oder Gebäudeteilen
                  </p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[0, 10, 15, 20, 30, 45].map((v) => (
                      <button
                        key={v}
                        onClick={() => setWegezeit(v)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border min-w-[60px]",
                          wegezeit === v
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border/40 text-muted-foreground hover:border-border"
                        )}
                      >
                        {v} Min.
                      </button>
                    ))}
                  </div>
                  <Input
                    inputMode="numeric"
                    value={wegezeit.toString()}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 0) setWegezeit(v);
                      else if (e.target.value === "") setWegezeit(0);
                    }}
                    placeholder="Minuten"
                    className="bg-background h-12 text-lg font-semibold"
                  />
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Auswirkung auf Gesamtstunden
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reinigungsstunden / Monat</span>
                    <span className="font-medium text-foreground">
                      {formatNumber(totals.hours - totals.ruestzeitHours - totals.wegezeitHours, 1)} h
                    </span>
                  </div>
                  {ruestzeit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ Rüstzeit / Monat</span>
                      <span className="font-medium text-foreground">
                        {formatNumber(totals.ruestzeitHours, 1)} h
                      </span>
                    </div>
                  )}
                  {wegezeit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ Wegezeit / Monat</span>
                      <span className="font-medium text-foreground">
                        {formatNumber(totals.wegezeitHours, 1)} h
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-primary border-t border-primary/20 pt-2">
                    <span>= Gesamtstunden / Monat</span>
                    <span>{formatNumber(totals.hours, 1)} h</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-foreground">= Monatspreis</span>
                    <span className="text-primary">{formatCurrency(totals.cost)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 max-w-2xl mx-auto"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Verrechnungssatz & Marge</h3>
                <p className="text-sm text-muted-foreground">
                  Nachvollziehbarer Aufbau vom Basislohn zum Verrechnungssatz.
                </p>
              </div>

              <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Kostenaufbau (Wasserfall)
                </h4>
                <div className="space-y-2">
                  {[
                    { label: "Basislohn", value: breakdown.baseLohn, color: "bg-blue-500" },
                    ...(breakdown.schichtzuschlag.totalZuschlag > 0
                      ? [{ label: "+ Schichtzuschläge", value: breakdown.schichtzuschlag.totalZuschlag, color: "bg-indigo-500" }]
                      : []),
                    { label: `+ SV AG-Anteil (${fmtEuro(breakdown.svTotalRate)}%)`, value: breakdown.svBetrag, color: "bg-cyan-500" },
                    { label: `× Ausfallzuschlag`, value: breakdown.lohnkostenMitAusfall - breakdown.lohnkostenProStunde, color: "bg-amber-500" },
                    { label: `+ Gemeinkosten (${fmtEuro(breakdown.overheadTotalRate)}%)`, value: breakdown.overheadBetrag, color: "bg-orange-500" },
                    { label: `+ Gewinn (${fmtEuro(breakdown.gewinnmarge)}%)`, value: breakdown.gewinnBetrag, color: "bg-emerald-500" },
                  ].map((item, idx) => {
                    const maxWidth = breakdown.stundenverrechnungssatz;
                    const widthPct = maxWidth > 0 ? Math.min((item.value / maxWidth) * 100, 100) : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-foreground">{fmtEuro(item.value)} €</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", item.color)}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-between text-sm font-bold text-primary border-t border-border/20 pt-3 mt-3">
                    <span>= Empfohlener Verrechnungssatz</span>
                    <span>{fmtEuro(breakdown.stundenverrechnungssatz)} €/h</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Objektspezifischer Verrechnungssatz
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Optional: Abweichenden Stundensatz für dieses Objekt festlegen.
                </p>
                <Input
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  inputMode="decimal"
                  placeholder={`Standard: ${hourlyRate.toString().replace(".", ",")} €/h`}
                  className="bg-background h-12 text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leer = globaler Standard ({hourlyRate.toString().replace(".", ",")} €/h)
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Empfohlener Satz</span>
                    <span className={cn("font-semibold", effectiveRate >= breakdown.stundenverrechnungssatz ? "text-emerald-500" : "text-red-500")}>
                      {fmtEuro(breakdown.stundenverrechnungssatz)} €/h
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gewählter Satz</span>
                    <span className="font-bold text-foreground">{fmtEuro(effectiveRate)} €/h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vollkosten</span>
                    <span className="font-medium text-foreground">{fmtEuro(breakdown.vollkosten)} €/h</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border/20 pt-2">
                    <span className="text-muted-foreground">Marge</span>
                    <span className={cn("font-bold", marginPercent >= targetMargin ? "text-emerald-500" : marginPercent >= 0 ? "text-yellow-500" : "text-red-500")}>
                      {fmtEuro(marginPercent)} %
                    </span>
                  </div>
                </div>
              </div>

              {effectiveRate < breakdown.vollkosten && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Unter Vollkosten!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Der gewählte Verrechnungssatz liegt unter den Vollkosten. Dieses Objekt wird mit Verlust kalkuliert.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 max-w-2xl mx-auto"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Plausibilitätsprüfung</h3>
                <p className="text-sm text-muted-foreground">
                  Checkliste mit allen Warnungen und Auffälligkeiten.
                </p>
              </div>

              <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold text-foreground">{completenessScore}%</p>
                  <p className={cn("text-sm font-medium mt-1", readinessColor)}>{readinessLabel}</p>
                </div>

                <div className="space-y-3">
                  {completenessChecks.map((check, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                        check.ok ? "bg-emerald-500/20" : "bg-red-500/20"
                      )}>
                        {check.ok ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : (
                          <XCircle size={14} className="text-red-500" />
                        )}
                      </div>
                      <span className={cn(
                        "text-sm",
                        check.ok ? "text-foreground" : "text-red-400"
                      )}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="bg-card border border-border/20 rounded-2xl p-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Hinweise zur Kalkulation
                  </h4>
                  <div className="space-y-3">
                    {warnings.map((w) => (
                      <div key={w.id} className="flex gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          w.severity === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : w.severity === "warning"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-blue-500/20 text-blue-400"
                        )}>
                          {w.severity === "info" ? <Info size={12} /> : <AlertTriangle size={12} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{w.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{w.message}</p>
                          <p className="text-xs text-primary mt-1">{w.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {warnings.length === 0 && rooms.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  <p className="text-sm text-foreground">Keine Warnungen — die Kalkulation sieht gut aus!</p>
                </div>
              )}
            </motion.div>
          )}

          {step === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6 max-w-2xl mx-auto"
            >
              <div className="mb-5">
                <h3 className="text-2xl font-semibold tracking-tight mb-1">Ergebnis & Angebot</h3>
                <p className="text-sm text-muted-foreground">
                  Zusammenfassung der Kalkulation.
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Empfohlener Monatspreis</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(totals.cost)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {formatCurrency(totals.annualCost)} / Jahr
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Stunden / Monat", value: `${formatNumber(totals.hours, 1)} h` },
                  { label: "Stunden / Jahr", value: `${formatNumber(totals.hours * 12, 0)} h` },
                  { label: "Fläche gesamt", value: `${formatNumber(totals.area, 0)} m²` },
                  { label: "Preis / m²", value: formatCurrency(totals.pricePerSqm) },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card border border-border/30 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
                    <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Vollständigkeit</p>
                  <p className="text-lg font-bold text-foreground">{completenessScore}%</p>
                  {completenessChecks.filter((c) => !c.ok).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {completenessChecks.filter((c) => !c.ok).map((c) => c.label).join(", ")}
                    </p>
                  )}
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  completenessScore >= 80 ? "bg-emerald-500/20" : completenessScore >= 50 ? "bg-yellow-500/20" : "bg-red-500/20"
                )}>
                  {completenessScore >= 80 ? (
                    <CheckCircle2 size={24} className="text-emerald-500" />
                  ) : completenessScore >= 50 ? (
                    <AlertTriangle size={24} className="text-yellow-500" />
                  ) : (
                    <XCircle size={24} className="text-red-500" />
                  )}
                </div>
              </div>

              {warnings.length > 0 && (
                <div className={cn(
                  "rounded-2xl border p-4 mb-4",
                  warnings.some((w) => w.severity === "critical")
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-yellow-500/30 bg-yellow-500/5"
                )}>
                  <p className="text-sm font-medium text-foreground mb-2">
                    {warnings.length} Hinweis{warnings.length > 1 ? "e" : ""}
                  </p>
                  {warnings.map((w) => (
                    <p key={w.id} className="text-xs text-muted-foreground">• {w.title}</p>
                  ))}
                </div>
              )}

              <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Leistungsverzeichnis
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-2 font-medium text-muted-foreground">Raum</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">m²</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Turnus</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">h/Mo</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">€/Mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => {
                        const rc = calcRoom(room, effectiveRate);
                        return (
                          <tr key={room.id} className="border-b border-border/10">
                            <td className="py-2 text-foreground">{room.name || room.typeName}</td>
                            <td className="py-2 text-right text-foreground">{room.area}</td>
                            <td className="py-2 text-right text-muted-foreground">{FREQUENCY_LABELS[room.frequency]}</td>
                            <td className="py-2 text-right text-foreground">{formatNumber(rc.monthlyHours, 1)}</td>
                            <td className="py-2 text-right font-medium text-foreground">{formatCurrency(rc.monthlyCost)}</td>
                          </tr>
                        );
                      })}
                      {(ruestzeit > 0 || wegezeit > 0) && (
                        <tr className="border-b border-border/10">
                          <td className="py-2 text-muted-foreground" colSpan={3}>
                            Rüst- & Wegezeit
                          </td>
                          <td className="py-2 text-right text-foreground">
                            {formatNumber(totals.ruestzeitHours + totals.wegezeitHours, 1)}
                          </td>
                          <td className="py-2 text-right font-medium text-foreground">
                            {formatCurrency((totals.ruestzeitHours + totals.wegezeitHours) * effectiveRate)}
                          </td>
                        </tr>
                      )}
                      <tr className="font-bold">
                        <td className="py-2 text-primary">Gesamt</td>
                        <td className="py-2 text-right text-foreground">{formatNumber(totals.area, 0)}</td>
                        <td />
                        <td className="py-2 text-right text-foreground">{formatNumber(totals.hours, 1)}</td>
                        <td className="py-2 text-right text-primary">{formatCurrency(totals.cost)}</td>
                      </tr>
                    </tbody>
                  </table>
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

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />

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
