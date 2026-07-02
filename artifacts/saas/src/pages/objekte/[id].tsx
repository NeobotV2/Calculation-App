import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useStore, type Room } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canAddProject, canAddRoom, canUseTemplates } from "@/lib/feature-gates";
import type { UpgradeTrigger } from "@/lib/billing-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Edit3, Check, Trash2, Plus, BarChart3, MoreHorizontal, X } from "lucide-react";
import { calcProjectTotals } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { getProjectWarnings, getWarningTypeKey } from "@/lib/warnings";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { KpiRow } from "./detail-parts/KpiRow";
import { WirtschaftlichkeitPanel } from "./detail-parts/WirtschaftlichkeitPanel";
import { WarningsPanel } from "./detail-parts/WarningsPanel";
import { calcPriceStrategy, calcSensitivity } from "@/lib/price-strategy";
import { calcRiskScore } from "@/lib/risk-score";
import { RoomRow } from "./detail-parts/RoomRow";
import { OptionsMenu } from "./detail-parts/OptionsMenu";
import { InfoSheet } from "./detail-parts/InfoSheet";
import { PdfPreviewOverlay } from "./detail-parts/PdfPreviewOverlay";

export default function ObjektDetail() {
  const [, params] = useRoute("/objekte/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const targetMargin = useStore((s) => s.targetMargin);
  const plan = useStore((s) => s.plan);
  const reorderRooms = useStore((s) => s.reorderRooms);
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const companyPhone = useStore((s) => s.companyPhone);
  const companyEmail = useStore((s) => s.companyEmail);
  const companyTaxNumber = useStore((s) => s.companyTaxNumber);
  const companyVatId = useStore((s) => s.companyVatId);
  const companyManagingDirector = useStore((s) => s.companyManagingDirector);
  const vatRate = useStore((s) => s.vatRate);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);
  const companyLogo = useStore((s) => s.companyLogo);
  const actions = useStoreActions();

  const [isEditingName, setIsEditingName] = useState(false);
  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <X size={24} className="text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Objekt nicht gefunden</h3>
        <Button variant="outline" onClick={() => setLocation("/objekte")} className="mt-4">Zurück</Button>
      </div>
    );
  }

  const effectiveRate = project.hourlyRate ?? hourlyRate;
  const totals = calcProjectTotals(project, effectiveRate);

  useEffect(() => {
    if (!showInfo && !showPdfPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showPdfPreview) setShowPdfPreview(false);
      else if (showInfo) setShowInfo(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showInfo, showPdfPreview]);

  const breakdown = useMemo(() => calcHourlyRate(hourlyRateConfig), [hourlyRateConfig]);
  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());
  const warnings = useMemo(() => {
    if (!project) return [];
    const disabled = new Set(disabledWarnings);
    return getProjectWarnings(project, hourlyRate, hourlyRateConfig, breakdown, isDefaultRate, targetMargin)
      .filter((w) => !disabled.has(getWarningTypeKey(w.id)));
  }, [project, hourlyRate, hourlyRateConfig, breakdown, isDefaultRate, disabledWarnings, targetMargin]);

  const wirtschaft = useMemo(() => {
    const strategyInput = {
      monthlyHours: totals.hours,
      area: totals.area,
      effectiveRate,
      vollkosten: breakdown.vollkosten,
      targetMarkupPct: targetMargin,
    };
    const strategy = calcPriceStrategy(strategyInput);
    return {
      strategy,
      sensitivity: calcSensitivity(strategyInput),
      risk: calcRiskScore({
        project,
        monthlyHours: totals.hours,
        area: totals.area,
        monthlyCost: totals.cost,
        marginPct: strategy.marginPct,
        // Gleiche Basis wie marginPct: Umsatzmarge (konvertiert aus dem Aufschlag).
        targetMarginPct: strategy.targetMarginPct,
        usesDefaultRate: isDefaultRate && !project.hourlyRate,
      }),
    };
  }, [project, totals, effectiveRate, breakdown, targetMargin, isDefaultRate]);

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      try {
        await actions.updateProject(project.id, { name: nameInput.trim() });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
      }
    }
    setIsEditingName(false);
  };

  const handleSaveInfo = async () => {
    const parsedRate = rateInput ? parseFloat(rateInput.replace(",", ".")) : undefined;
    try {
      await actions.updateProject(project.id, {
        customer: customerInput.trim() || undefined,
        location: locationInput.trim() || undefined,
        notes: notesInput.trim() || undefined,
        hourlyRate: parsedRate && parsedRate > 0 ? parsedRate : undefined,
      });
      toast.success("Objektinfo gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
    setShowInfo(false);
  };

  const handleAddRoom = async (room: Omit<Room, "id">) => {
    try {
      if (editingRoom) {
        await actions.updateRoom(project.id, editingRoom.id, room);
        toast.success("Raum aktualisiert");
      } else {
        await actions.addRoom(project.id, room);
        toast.success("Raum hinzugefügt");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
    setSheetOpen(false);
    setEditingRoom(undefined);
  };

  const showUpgradeGate = (gate: { reason?: string; trigger?: UpgradeTrigger }) => {
    setUpgradeReason(gate.reason || "");
    setUpgradeTrigger(gate.trigger);
    setUpgradeOpen(true);
  };

  const openAddRoom = () => {
    const gate = canAddRoom(project.id);
    if (!gate.allowed) {
      showUpgradeGate(gate);
      return;
    }
    setEditingRoom(undefined);
    setSheetOpen(true);
  };

  const handleDuplicateRoom = async (room: Room) => {
    const gate = canAddRoom(project.id);
    if (!gate.allowed) {
      showUpgradeGate(gate);
      return;
    }
    try {
      const { id: _id, ...roomData } = room;
      await actions.addRoom(project.id, roomData);
      toast.success("Raum dupliziert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Duplizieren");
    }
  };

  const handleSaveAsTemplate = async () => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      showUpgradeGate(gate);
      return;
    }
    try {
      await actions.addTemplate(project.name, project.rooms.map(({ id: _id, ...rest }) => rest));
      toast.success("Als Vorlage gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
    setMenuOpen(false);
  };

  const handleOpenPDF = () => {
    setLocation(`/print/${project.id}`);
    setMenuOpen(false);
  };

  const handleDuplicate = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      showUpgradeGate(gate);
      setMenuOpen(false);
      return;
    }
    try {
      await actions.duplicateProject(project.id);
      toast.success("Dupliziert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Duplizieren");
    }
    setMenuOpen(false);
  };

  const handleArchive = async () => {
    try {
      await actions.archiveProject(project.id);
      toast.success("Archiviert");
      setLocation("/objekte");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Archivieren");
    }
  };

  const handleDeleteProject = async () => {
    try {
      await actions.deleteProject(project.id);
      setLocation("/objekte");
      toast.success("Objekt gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await actions.deleteRoom(project.id, roomId);
      toast.success("Raum gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
    setDeleteRoomId(null);
  };

  const handleMoveRoom = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= project.rooms.length) return;
    reorderRooms(project.id, index, target);
  };

  return (
    <PageTransition className="min-h-screen bg-background pb-32 md:pb-8">
      <div className="bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 safe-header pb-3 flex items-center justify-between pt-12 md:pt-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/objekte")} className="-ml-2" aria-label="Zurück">
          <ArrowLeft size={20} aria-hidden="true" />
        </Button>
        <div className="flex gap-2">
          <Link href={`/kalkulation/${project.id}`}>
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs"><BarChart3 size={14} className="mr-1.5" aria-hidden="true" />Kalkulation</Button>
          </Link>
          <Link href={`/auswertung/${project.id}`}>
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs"><BarChart3 size={14} className="mr-1.5" aria-hidden="true" />Controlling</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="relative" aria-label="Weitere Aktionen" aria-haspopup="menu" aria-expanded={menuOpen}>
            <MoreHorizontal size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <OptionsMenu
          onClose={() => setMenuOpen(false)}
          onEditInfo={() => { setShowInfo(true); setCustomerInput(project.customer || ""); setLocationInput(project.location || ""); setNotesInput(project.notes || ""); setRateInput(project.hourlyRate ? project.hourlyRate.toString().replace(".", ",") : ""); setMenuOpen(false); }}
          onDuplicate={handleDuplicate}
          onSaveAsTemplate={handleSaveAsTemplate}
          onPdfPreview={() => { setShowPdfPreview(true); setMenuOpen(false); }}
          onOpenPDF={handleOpenPDF}
          onArchive={handleArchive}
          onDelete={() => { setMenuOpen(false); setDeleteConfirm(true); }}
        />
      )}

      <div className="px-6 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          {isEditingName ? (
            <div className="flex gap-2 mb-2">
              <Input autoFocus aria-label="Objektname" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="text-xl font-semibold bg-card" onKeyDown={(e) => e.key === "Enter" && handleSaveName()} />
              <Button size="icon" onClick={handleSaveName} aria-label="Namen speichern"><Check size={18} aria-hidden="true" /></Button>
            </div>
          ) : (
            <h1
              className="text-3xl font-semibold tracking-tight mb-1 text-foreground cursor-pointer group flex items-center gap-2"
              onClick={() => { setNameInput(project.name); setIsEditingName(true); }}
            >
              {project.name}
              <Edit3 size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            {project.customer && <>{project.customer} · </>}
            Verrechnungssatz: {formatCurrency(effectiveRate)}/h
          </p>
        </div>

        <WarningsPanel
          warnings={warnings}
          expanded={warningsExpanded}
          onToggle={() => setWarningsExpanded(!warningsExpanded)}
        />

        <KpiRow totals={totals} />

        {project.rooms.length > 0 && (
          <div className="mb-6">
            <WirtschaftlichkeitPanel
              strategy={wirtschaft.strategy}
              sensitivity={wirtschaft.sensitivity}
              risk={wirtschaft.risk}
              targetMarkupPct={targetMargin}
            />
          </div>
        )}

        <div className="bg-card border border-border/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm tracking-tight">Controlling</h3>
            <Link href={`/auswertung/${project.id}`}>
              <span className="text-xs text-primary font-medium">Details →</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Jahreskosten</p>
              <p className="font-semibold text-foreground">{formatCurrency(totals.annualCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Stunden/Monat</p>
              <p className="font-semibold text-foreground">{formatNumber(totals.hours, 1)} h</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Preis pro m²</p>
              <p className="font-semibold text-foreground">{formatCurrency(totals.pricePerSqm)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Gesamtfläche</p>
              <p className="font-semibold text-foreground">{formatNumber(totals.area, 0)} m²</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg tracking-tight">Räume ({project.rooms.length})</h3>
          </div>

          {project.rooms.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl">
              <p className="text-muted-foreground mb-4">Noch keine Räume erfasst.</p>
              <Button onClick={openAddRoom} variant="outline" className="px-6">Ersten Raum hinzufügen</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {project.rooms.map((room, index) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  index={index}
                  total={project.rooms.length}
                  effectiveRate={effectiveRate}
                  onEdit={() => { setEditingRoom(room); setSheetOpen(true); }}
                  onMove={handleMoveRoom}
                  onDuplicate={() => handleDuplicateRoom(room)}
                  onDelete={() => setDeleteRoomId(room.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6 md:static md:max-w-6xl md:mx-auto md:px-6 md:py-4 md:left-auto md:translate-x-0" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <Button onClick={openAddRoom} className="w-full md:w-auto shadow-xl shadow-black/20 md:shadow-none" size="lg">
          <Plus size={20} className="mr-2" aria-hidden="true" /> Raum hinzufügen
        </Button>
      </div>

      <RoomEditorSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingRoom(undefined); }}
        onSave={handleAddRoom}
        editRoom={editingRoom}
        hourlyRate={effectiveRate}
      />

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} triggerReason={upgradeTrigger} />
      <ConfirmDialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} onConfirm={handleDeleteProject} title="Objekt löschen?" description="Alle Räume und Daten werden unwiderruflich gelöscht." confirmLabel="Löschen" destructive />
      <ConfirmDialog open={!!deleteRoomId} onClose={() => setDeleteRoomId(null)} onConfirm={() => { if (deleteRoomId) handleDeleteRoom(deleteRoomId); }} title="Raum löschen?" description="Der Raum wird aus dem Objekt entfernt." confirmLabel="Löschen" destructive />

      {showPdfPreview && (
        <PdfPreviewOverlay
          project={project}
          totals={totals}
          effectiveRate={effectiveRate}
          vatRate={vatRate}
          pdfHeader={pdfHeader}
          pdfFooter={pdfFooter}
          companyName={companyName}
          companyLogo={companyLogo}
          companyStreet={companyStreet}
          companyZip={companyZip}
          companyCity={companyCity}
          companyPhone={companyPhone}
          companyEmail={companyEmail}
          companyTaxNumber={companyTaxNumber}
          companyVatId={companyVatId}
          companyManagingDirector={companyManagingDirector}
          onClose={() => setShowPdfPreview(false)}
          onPrint={() => { setShowPdfPreview(false); setLocation(`/print/${project.id}`); }}
        />
      )}

      {showInfo && (
        <InfoSheet
          hourlyRate={hourlyRate}
          customerInput={customerInput}
          locationInput={locationInput}
          rateInput={rateInput}
          notesInput={notesInput}
          onCustomerChange={setCustomerInput}
          onLocationChange={setLocationInput}
          onRateChange={setRateInput}
          onNotesChange={setNotesInput}
          onClose={() => setShowInfo(false)}
          onSave={handleSaveInfo}
        />
      )}
    </PageTransition>
  );
}
