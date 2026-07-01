import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useStore, type Room } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { AppFooter } from "@/components/layout/AppFooter";
import { canAddProject } from "@/lib/feature-gates";
import type { UpgradeTrigger } from "@/lib/billing-config";
import { parseLvFile } from "@/lib/lv-import";
import { calcTenderScenarios, type ScenarioKey } from "@/lib/tender-calc";
import { FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { trackTenderImported, trackTenderConverted } from "@/services/analytics-service";
import { toast } from "sonner";
import {
  FileUp,
  Landmark,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  ArrowRight,
  Info,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Ausschreibungs-Kalkulation: LV-Datei (CSV/JSON) importieren und eine
   Bieterspanne (Mindest-/Mittel-/Höchstwert) berechnen. Der Mittelwert kann
   als reguläres Objekt übernommen werden.
   ───────────────────────────────────────────────────────────────────────── */

const newId = () => `tender-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SCENARIO_STYLES: Record<ScenarioKey, { card: string; value: string; note: string }> = {
  min: { card: "border-warning/30 bg-warning/5", value: "text-warning", note: "Aggressiv — knappe Reserven" },
  mid: { card: "border-primary/40 bg-primary/5 ring-1 ring-primary/30", value: "text-primary", note: "Kalkulatorische Empfehlung" },
  max: { card: "border-border/40 bg-card", value: "text-foreground", note: "Konservativ — volle Reserven" },
};

export default function Ausschreibung() {
  const [, setLocation] = useLocation();
  const hourlyRate = useStore((s) => s.hourlyRate);
  const defaultFrequency = useStore((s) => s.defaultFrequency);
  const actions = useStoreActions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tenderName, setTenderName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [perfSpread, setPerfSpread] = useState("15");
  const [rateSpread, setRateSpread] = useState("10");
  const [dragOver, setDragOver] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | undefined>(undefined);

  const baseRate = useMemo(() => {
    const parsed = parseFloat(rateInput.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : hourlyRate;
  }, [rateInput, hourlyRate]);

  const result = useMemo(
    () =>
      calcTenderScenarios(rooms, baseRate, {
        perfSpreadPct: parseFloat(perfSpread.replace(",", ".")),
        rateSpreadPct: parseFloat(rateSpread.replace(",", ".")),
      }),
    [rooms, baseRate, perfSpread, rateSpread],
  );

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseLvFile(text, file.name, defaultFrequency);
      if (parsed.rooms.length === 0) {
        toast.error(parsed.warnings[0] || "Keine Räume in der Datei gefunden.");
        setWarnings(parsed.warnings);
        return;
      }
      setRooms(parsed.rooms.map((r) => ({ ...r, id: newId() })));
      setWarnings(parsed.warnings);
      setFileName(file.name);
      if (!tenderName.trim()) {
        setTenderName(file.name.replace(/\.(csv|json|txt)$/i, ""));
      }
      trackTenderImported(parsed.rooms.length);
      toast.success(`${parsed.rooms.length} Räume importiert`);
    };
    reader.onerror = () => toast.error("Die Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleSaveRoom = (room: Omit<Room, "id">) => {
    if (editingRoom) {
      setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? { ...room, id: r.id } : r)));
    } else {
      setRooms((prev) => [...prev, { ...room, id: newId() }]);
    }
    setSheetOpen(false);
    setEditingRoom(undefined);
  };

  const handleConvert = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeTrigger(gate.trigger);
      setUpgradeOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      const name = tenderName.trim() || "Ausschreibung";
      const id = await actions.addProject(name);
      const updates: Record<string, unknown> = { notes: "Aus Ausschreibungs-Kalkulation übernommen" };
      if (rateInput.trim() && baseRate !== hourlyRate) updates.hourlyRate = baseRate;
      await actions.updateProject(id, updates);
      for (const room of rooms) {
        const { id: _rid, ...roomData } = room;
        await actions.addRoom(id, roomData);
      }
      trackTenderConverted(rooms.length);
      toast.success("Als Objekt übernommen");
      setLocation(`/objekte/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Übernehmen");
    } finally {
      setIsSaving(false);
    }
  };

  const scenarioOrder: ScenarioKey[] = ["min", "mid", "max"];

  return (
    <PageTransition className="min-h-screen pb-24 md:pb-8 bg-background">
      <PageHeader
        title="Ausschreibung"
        subtitle="LV importieren und Bieterspanne berechnen"
        className="max-w-5xl mx-auto"
      />

      <div className="px-6 space-y-6 max-w-5xl mx-auto">
        {/* ── Import ──────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Leistungsverzeichnis</SectionHeading>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "rounded-2xl border border-dashed p-6 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border/50 bg-card",
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <FileUp size={22} className="text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {fileName ? fileName : "LV-Datei hierher ziehen oder auswählen"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              CSV (Excel-Export: Bezeichnung; Fläche; Häufigkeit) oder JSON
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileChange}
              className="sr-only"
              id="tender-file"
              aria-label="LV-Datei auswählen"
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileUp size={15} aria-hidden="true" /> Datei wählen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditingRoom(undefined); setSheetOpen(true); }}
              >
                <Plus size={15} aria-hidden="true" /> Räume manuell erfassen
              </Button>
            </div>
          </div>

          {warnings.length > 0 && (
            <div role="status" className="mt-3 rounded-2xl border border-warning/30 bg-warning/5 p-4 space-y-1.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-foreground flex items-start gap-2">
                  <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{w}</span>
                </p>
              ))}
            </div>
          )}
        </section>

        {/* ── Raumliste ───────────────────────────────────────────── */}
        {rooms.length > 0 && (
          <section>
            <SectionHeading
              action={
                <button onClick={() => { setEditingRoom(undefined); setSheetOpen(true); }} className="text-xs text-primary font-medium">
                  + Raum hinzufügen
                </button>
              }
            >
              Räume ({rooms.length} · {formatNumber(result.area, 0)} m²)
            </SectionHeading>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div key={room.id} className="bg-card border border-border/20 rounded-2xl p-4 flex items-center">
                  <div className="flex-1 min-w-0 pr-3 cursor-pointer" onClick={() => { setEditingRoom(room); setSheetOpen(true); }}>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-foreground truncate">{room.name || room.typeName}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {room.groupName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(room.area, 0)} m² · {FREQUENCY_LABELS[room.frequency]} · {room.typeName}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingRoom(room); setSheetOpen(true); }}
                      aria-label={`Raum „${room.name || room.typeName}" bearbeiten`}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                    >
                      <Edit3 size={14} className="text-muted-foreground" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleteRoomId(room.id)}
                      aria-label={`Raum „${room.name || room.typeName}" entfernen`}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} className="text-destructive" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Parameter ───────────────────────────────────────────── */}
        {rooms.length > 0 && (
          <section>
            <SectionHeading>Kalkulationsparameter</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField id="tender-rate" label="Verrechnungssatz (€/h)" hint={`Leer = Standard (${formatNumber(hourlyRate)} €/h)`}>
                <Input
                  inputMode="decimal"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder={formatNumber(hourlyRate)}
                  className="bg-card h-12"
                />
              </FormField>
              <FormField id="tender-perf-spread" label="Leistungsspanne (±%)" hint="Unsicherheit der Leistungswerte">
                <Input
                  inputMode="decimal"
                  value={perfSpread}
                  onChange={(e) => setPerfSpread(e.target.value)}
                  placeholder="15"
                  className="bg-card h-12"
                />
              </FormField>
              <FormField id="tender-rate-spread" label="Satzspanne (±%)" hint="Spielraum beim Verrechnungssatz">
                <Input
                  inputMode="decimal"
                  value={rateSpread}
                  onChange={(e) => setRateSpread(e.target.value)}
                  placeholder="10"
                  className="bg-card h-12"
                />
              </FormField>
            </div>
          </section>
        )}

        {/* ── Bieterspanne ────────────────────────────────────────── */}
        {rooms.length > 0 && (
          <section>
            <SectionHeading>Bieterspanne (monatlich)</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {scenarioOrder.map((key) => {
                const s = result.scenarios[key];
                const style = SCENARIO_STYLES[key];
                return (
                  <div key={key} className={cn("rounded-2xl border p-4", style.card)}>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                    <p className={cn("text-2xl font-bold tabular-nums", style.value)}>{formatCurrency(s.cost)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatNumber(s.hours, 1)} h/Monat · {formatCurrency(s.pricePerSqm)}/m²
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Satz {formatCurrency(s.rate)}/h · {formatCurrency(s.annualCost)}/Jahr
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-2">{style.note}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Mindestwert: Leistungswerte +{perfSpread || "15"} %, Satz −{rateSpread || "10"} %. Höchstwert entsprechend
                umgekehrt. Der Mittelwert entspricht Ihrer regulären Kalkulation.
              </span>
            </p>
          </section>
        )}

        {/* ── Übernehmen ──────────────────────────────────────────── */}
        {rooms.length > 0 && (
          <section className="pb-4">
            <SectionHeading>Als Objekt übernehmen</SectionHeading>
            <div className="bg-card border border-border/30 rounded-2xl p-4 space-y-3">
              <FormField id="tender-name" label="Objektname">
                <Input
                  value={tenderName}
                  onChange={(e) => setTenderName(e.target.value)}
                  placeholder="z.B. Ausschreibung Rathaus 2026"
                  className="bg-background h-12"
                />
              </FormField>
              <Button onClick={handleConvert} disabled={isSaving} className="w-full h-12">
                {isSaving ? "Wird übernommen…" : "Als Objekt übernehmen"}
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Übernimmt alle Räume mit dem Mittelwert-Szenario als reguläres Objekt — inklusive
                Plausibilitätsprüfung und PDF-Angebot.
              </p>
            </div>
          </section>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Landmark size={24} className="text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Importieren Sie das Leistungsverzeichnis einer öffentlichen Ausschreibung — die App
              ordnet Raumarten automatisch zu und berechnet Ihre Bieterspanne.
            </p>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto">
        <AppFooter />
      </div>

      <RoomEditorSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingRoom(undefined); }}
        onSave={handleSaveRoom}
        editRoom={editingRoom}
        hourlyRate={baseRate}
      />
      <ConfirmDialog
        open={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        onConfirm={() => {
          if (deleteRoomId) setRooms((prev) => prev.filter((r) => r.id !== deleteRoomId));
          setDeleteRoomId(null);
        }}
        title="Raum entfernen?"
        description="Der Raum wird aus der Ausschreibungs-Kalkulation entfernt."
        confirmLabel="Entfernen"
        destructive
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} triggerReason={upgradeTrigger} />
    </PageTransition>
  );
}
