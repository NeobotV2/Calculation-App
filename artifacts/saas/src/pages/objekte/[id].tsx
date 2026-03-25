import { useState, useMemo } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useStore, type Room } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canAddProject, canAddRoom, canUseTemplates, canUsePDF } from "@/lib/feature-gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Edit3, Check, Trash2, Plus, BarChart3, Copy, Archive, FileText, BookOpen, MoreHorizontal, X, AlertTriangle, ChevronDown, ChevronUp, Info, Eye, Printer, Share2 } from "lucide-react";
import { sharePrintView } from "@/lib/native-share";
import { isNative } from "@/lib/capacitor";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { calcHourlyRate, getDefaultConfig } from "@/lib/hourly-rate-calc";
import { getProjectWarnings, getWarningTypeKey, type Warning } from "@/lib/warnings";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <X size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Objekt nicht gefunden</h3>
        <Button variant="outline" onClick={() => setLocation("/objekte")} className="mt-4">Zurück</Button>
      </div>
    );
  }

  const effectiveRate = project.hourlyRate ?? hourlyRate;
  const totals = calcProjectTotals(project, effectiveRate);

  const breakdown = useMemo(() => calcHourlyRate(hourlyRateConfig), [hourlyRateConfig]);
  const isDefaultRate = hourlyRate === 22.50 && JSON.stringify(hourlyRateConfig) === JSON.stringify(getDefaultConfig());
  const warnings = useMemo(() => {
    if (!project) return [];
    const disabled = new Set(disabledWarnings);
    return getProjectWarnings(project, hourlyRate, hourlyRateConfig, breakdown, isDefaultRate, targetMargin)
      .filter((w) => !disabled.has(getWarningTypeKey(w.id)));
  }, [project, hourlyRate, hourlyRateConfig, breakdown, isDefaultRate, disabledWarnings, targetMargin]);

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

  const openAddRoom = () => {
    const gate = canAddRoom(project.id);
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      return;
    }
    setEditingRoom(undefined);
    setSheetOpen(true);
  };

  const handleSaveAsTemplate = async () => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
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
    const gate = canUsePDF();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      setMenuOpen(false);
      return;
    }
    setLocation(`/print/${project.id}`);
    setMenuOpen(false);
  };

  const handleDuplicate = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
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
        <Button variant="ghost" size="icon" onClick={() => setLocation("/objekte")} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex gap-2">
          <Link href={`/kalkulation/${project.id}`}>
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs"><BarChart3 size={14} className="mr-1.5" />Kalkulation</Button>
          </Link>
          <Link href={`/auswertung/${project.id}`}>
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs"><BarChart3 size={14} className="mr-1.5" />Controlling</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} className="relative">
            <MoreHorizontal size={18} />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-24 right-4 z-30 bg-card border border-border/40 rounded-xl shadow-xl shadow-black/20 overflow-hidden min-w-[200px]">
            <button onClick={() => { setShowInfo(true); setCustomerInput(project.customer || ""); setLocationInput(project.location || ""); setNotesInput(project.notes || ""); setRateInput(project.hourlyRate ? project.hourlyRate.toString().replace(".", ",") : ""); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Edit3 size={16} className="text-muted-foreground" /> Info bearbeiten</button>
            <button onClick={handleDuplicate} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Copy size={16} className="text-muted-foreground" /> Duplizieren</button>
            <button onClick={handleSaveAsTemplate} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><BookOpen size={16} className="text-muted-foreground" /> Als Vorlage speichern</button>
            <button onClick={() => {
              const gate = canUsePDF();
              if (!gate.allowed) { setUpgradeReason(gate.reason || ""); setUpgradeOpen(true); setMenuOpen(false); return; }
              setShowPdfPreview(true); setMenuOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Eye size={16} className="text-muted-foreground" /> PDF-Vorschau</button>
            <button onClick={handleOpenPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><FileText size={16} className="text-muted-foreground" /> Angebot als PDF</button>
            <button onClick={handleArchive} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Archive size={16} className="text-muted-foreground" /> Archivieren</button>
            <button onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10"><Trash2 size={16} /> Löschen</button>
          </div>
        </>
      )}

      <div className="px-6 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          {isEditingName ? (
            <div className="flex gap-2 mb-2">
              <Input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="text-xl font-semibold bg-card" onKeyDown={(e) => e.key === "Enter" && handleSaveName()} />
              <Button size="icon" onClick={handleSaveName}><Check size={18} /></Button>
            </div>
          ) : (
            <h1
              className="text-3xl font-semibold tracking-tight mb-1 text-foreground cursor-pointer group flex items-center gap-2"
              onClick={() => { setNameInput(project.name); setIsEditingName(true); }}
            >
              {project.name}
              <Edit3 size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
          )}
          <p className="text-sm text-muted-foreground">
            {project.customer && <>{project.customer} · </>}
            Verrechnungssatz: {formatCurrency(effectiveRate)}/h
          </p>
        </div>

        {warnings.length > 0 && (
          <div className={`rounded-2xl border mb-6 overflow-hidden ${
            warnings.some((w) => w.severity === "critical")
              ? "border-destructive/30 bg-destructive/5"
              : warnings.some((w) => w.severity === "warning")
                ? "border-warning/30 bg-warning/5"
                : "border-info/30 bg-info/5"
          }`}>
            <button
              onClick={() => setWarningsExpanded(!warningsExpanded)}
              className="w-full flex items-center gap-3 p-4"
            >
              <AlertTriangle size={18} className={
                warnings.some((w) => w.severity === "critical")
                  ? "text-destructive"
                  : warnings.some((w) => w.severity === "warning")
                    ? "text-warning"
                    : "text-info"
              } />
              <span className="font-medium text-sm text-foreground flex-1 text-left">
                {warnings.length} Hinweis{warnings.length > 1 ? "e" : ""} zur Kalkulation
              </span>
              {warningsExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>
            {warningsExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {warnings.map((w) => (
                  <div key={w.id} className="flex gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      w.severity === "critical"
                        ? "bg-destructive/20 text-destructive"
                        : w.severity === "warning"
                          ? "bg-warning/20 text-warning"
                          : "bg-info/20 text-info"
                    }`}>
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
            )}
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 snap-x md:mx-0 md:px-0 md:flex-wrap">
          {[
            { label: "Monatspreis", value: formatCurrency(totals.cost), accent: true },
            { label: "Stunden/Mo", value: `${formatNumber(totals.hours, 1)} h` },
            { label: "Fläche", value: `${formatNumber(totals.area, 0)} m²` },
            { label: "€/m²", value: formatCurrency(totals.pricePerSqm) },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border/30 rounded-2xl p-4 shrink-0 w-32 md:w-auto md:flex-1 md:min-w-[140px] snap-start">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.accent ? "text-primary" : "text-foreground"}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

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
              {project.rooms.map((room, index) => {
                const rc = calcRoom(room, effectiveRate);
                return (
                  <div
                    key={room.id}
                    className="glass-card p-4 flex items-center group cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => { setEditingRoom(room); setSheetOpen(true); }}
                  >
                    <div className="flex flex-col gap-0.5 mr-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveRoom(index, "up"); }}
                        disabled={index === 0}
                        className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${index === 0 ? "opacity-20" : "hover:bg-muted"}`}
                      >
                        <ChevronUp size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveRoom(index, "down"); }}
                        disabled={index === project.rooms.length - 1}
                        className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${index === project.rooms.length - 1 ? "opacity-20" : "hover:bg-muted"}`}
                      >
                        <ChevronDown size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-foreground truncate">{room.name || room.typeName}</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide whitespace-nowrap">{room.groupName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{room.area} m²</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-border" />
                        <span>{FREQUENCY_LABELS[room.frequency]}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pr-2">
                      <p className="font-bold text-foreground">{formatCurrency(rc.monthlyCost)}</p>
                      <p className="text-xs text-primary font-medium">{formatNumber(rc.monthlyHours, 1)} h</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteRoomId(room.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6 md:static md:max-w-6xl md:mx-auto md:px-6 md:py-4 md:left-auto md:translate-x-0" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <Button onClick={openAddRoom} className="w-full md:w-auto shadow-xl shadow-black/20 md:shadow-none" size="lg">
          <Plus size={20} className="mr-2" /> Raum hinzufügen
        </Button>
      </div>

      <RoomEditorSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingRoom(undefined); }}
        onSave={handleAddRoom}
        editRoom={editingRoom}
        hourlyRate={effectiveRate}
      />

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
      <ConfirmDialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} onConfirm={handleDeleteProject} title="Objekt löschen?" description="Alle Räume und Daten werden unwiderruflich gelöscht." confirmLabel="Löschen" destructive />
      <ConfirmDialog open={!!deleteRoomId} onClose={() => setDeleteRoomId(null)} onConfirm={() => { if (deleteRoomId) handleDeleteRoom(deleteRoomId); }} title="Raum löschen?" description="Der Raum wird aus dem Objekt entfernt." confirmLabel="Löschen" destructive />

      {showPdfPreview && (() => {
        const vatAmount = vatRate > 0 ? totals.cost * (vatRate / 100) : 0;
        const hasAddress = companyStreet || companyZip || companyCity;
        const hasContact = companyPhone || companyEmail;
        const hasFooterData = companyTaxNumber || companyVatId || companyManagingDirector || pdfFooter;
        return (
          <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]" onClick={() => setShowPdfPreview(false)} />
            <div className="fixed inset-0 z-[80] flex flex-col">
              <div className="bg-background/95 border-b border-border/20 px-4 py-3 flex items-center justify-between safe-header">
                <Button variant="ghost" size="icon" onClick={() => setShowPdfPreview(false)}>
                  <X size={20} />
                </Button>
                <h3 className="font-semibold text-sm">PDF-Vorschau</h3>
                <Button size="sm" className="gap-2" onClick={() => { setShowPdfPreview(false); setLocation(`/print/${project.id}`); }}>
                  {isNative ? <Share2 size={14} /> : <Printer size={14} />}
                  {isNative ? "Teilen" : "Drucken"}
                </Button>
              </div>
              <div className="flex-1 overflow-auto bg-white p-6">
                <div className="max-w-2xl mx-auto text-black">
                  {pdfHeader && <p className="text-sm text-gray-600 mb-4">{pdfHeader}</p>}
                  <div className="mb-8 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {companyLogo && <img src={companyLogo} alt="Logo" className="h-12 w-auto object-contain" />}
                      <div>
                        <h1 className="text-3xl font-bold tracking-tight text-black">{companyName}</h1>
                        {hasAddress && (
                          <p className="text-sm text-gray-500 mt-1">
                            {companyStreet}{companyStreet && (companyZip || companyCity) ? ", " : ""}{companyZip} {companyCity}
                          </p>
                        )}
                      </div>
                    </div>
                    {hasContact && (
                      <div className="text-right text-sm text-gray-500 mt-1">
                        {companyPhone && <p>{companyPhone}</p>}
                        {companyEmail && <p>{companyEmail}</p>}
                      </div>
                    )}
                  </div>
                  <div className="mb-2">
                    <p className="text-gray-500 text-lg font-medium">Angebot</p>
                  </div>
                  <div className="mb-8 space-y-1">
                    <h2 className="text-xl font-semibold text-black">{project.name}</h2>
                    {project.customer && <p className="text-gray-600">Kunde: {project.customer}</p>}
                    {project.location && <p className="text-gray-600">Standort: {project.location}</p>}
                  </div>
                  <table className="w-full text-sm mb-8">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 font-semibold text-black">Raum</th>
                        <th className="text-right py-2 font-semibold text-black">m²</th>
                        <th className="text-right py-2 font-semibold text-black">Häufigkeit</th>
                        <th className="text-right py-2 font-semibold text-black">h/Mo</th>
                        <th className="text-right py-2 font-semibold text-black">€/Mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.rooms.map((r) => {
                        const rc = calcRoom(r, effectiveRate);
                        return (
                          <tr key={r.id} className="border-b border-gray-200">
                            <td className="py-2 text-black">{r.name || r.typeName}</td>
                            <td className="py-2 text-right tabular-nums text-black">{formatNumber(r.area, 1)}</td>
                            <td className="py-2 text-right text-black">{FREQUENCY_LABELS[r.frequency]}</td>
                            <td className="py-2 text-right tabular-nums text-black">{formatNumber(rc.monthlyHours, 1)}</td>
                            <td className="py-2 text-right tabular-nums font-medium text-black">{formatCurrency(rc.monthlyCost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="border-t-2 border-gray-300 pt-4 space-y-2">
                    <div className="flex justify-between text-base text-black">
                      <span>Gesamtfläche</span>
                      <span className="font-medium">{formatNumber(totals.area, 0)} m²</span>
                    </div>
                    <div className="flex justify-between text-base text-black">
                      <span>Stunden / Monat</span>
                      <span className="font-medium">{formatNumber(totals.hours, 1)} h</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-black">
                      <span>Monatspreis (netto)</span>
                      <span>{formatCurrency(totals.cost)}</span>
                    </div>
                    {vatRate > 0 && (
                      <>
                        <div className="flex justify-between text-base text-gray-500">
                          <span>MwSt. ({vatRate}%)</span>
                          <span>{formatCurrency(vatAmount)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-black">
                          <span>Monatspreis (brutto)</span>
                          <span>{formatCurrency(totals.cost + vatAmount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 text-black">
                      <span>Jahrespreis {vatRate > 0 ? "(brutto)" : "(netto)"}</span>
                      <span>{formatCurrency((totals.cost + vatAmount) * 12)}</span>
                    </div>
                  </div>
                  {hasFooterData && (
                    <div className="mt-12 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                        {companyManagingDirector && <span>Geschäftsführer: {companyManagingDirector}</span>}
                        {companyTaxNumber && <span>Steuernummer: {companyTaxNumber}</span>}
                        {companyVatId && <span>USt-IdNr.: {companyVatId}</span>}
                      </div>
                      {pdfFooter && <p className="text-xs text-gray-500 mt-2">{pdfFooter}</p>}
                    </div>
                  )}
                  <p className="mt-8 text-xs text-gray-400">
                    Erstellt mit CleanCalc Pro · {new Date().toLocaleDateString("de-DE")}
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {showInfo && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowInfo(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t border-border p-6 pb-safe md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:max-w-lg md:w-full">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 md:hidden" />
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Objektinfo</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Kunde</label>
                <Input value={customerInput} onChange={(e) => setCustomerInput(e.target.value)} placeholder="z.B. Muster GmbH" className="bg-card h-11" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Standort</label>
                <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="z.B. Berlin, Musterstraße 1" className="bg-card h-11" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Verrechnungssatz (€/h)</label>
                <Input value={rateInput} onChange={(e) => setRateInput(e.target.value)} inputMode="decimal" placeholder={`Standard: ${hourlyRate.toString().replace(".", ",")} €/h`} className="bg-card h-11" />
                <p className="text-xs text-muted-foreground mt-1 ml-1">Leer = globaler Standard ({hourlyRate.toString().replace(".", ",")} €/h)</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notizen</label>
                <Input value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Optionale Notizen" className="bg-card h-11" />
              </div>
              <Button onClick={handleSaveInfo} className="w-full" size="lg">Speichern</Button>
            </div>
          </div>
        </>
      )}
    </PageTransition>
  );
}
