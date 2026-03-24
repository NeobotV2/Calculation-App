import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useStore, type Room } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { RoomEditorSheet } from "@/components/room-editor-sheet";
import { UpgradeModal } from "@/components/upgrade-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canAddProject, canAddRoom, canUseTemplates, canUsePDF } from "@/lib/feature-gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Edit3, Check, Trash2, Plus, BarChart3, Copy, Archive, FileText, BookOpen, MoreHorizontal, X } from "lucide-react";
import { calcProjectTotals, calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

export default function ObjektDetail() {
  const [, params] = useRoute("/objekte/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const hourlyRate = useStore((s) => s.hourlyRate);
  const plan = useStore((s) => s.plan);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const archiveProject = useStore((s) => s.archiveProject);
  const addRoom = useStore((s) => s.addRoom);
  const updateRoom = useStore((s) => s.updateRoom);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const addTemplate = useStore((s) => s.addTemplate);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

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

  const handleSaveName = () => {
    if (nameInput.trim()) updateProject(project.id, { name: nameInput.trim() });
    setIsEditingName(false);
  };

  const handleSaveInfo = () => {
    updateProject(project.id, {
      customer: customerInput.trim() || undefined,
      location: locationInput.trim() || undefined,
      notes: notesInput.trim() || undefined,
    });
    toast.success("Objektinfo gespeichert");
    setShowInfo(false);
  };

  const handleAddRoom = (room: Omit<Room, "id">) => {
    if (editingRoom) {
      updateRoom(project.id, editingRoom.id, room);
      toast.success("Raum aktualisiert");
    } else {
      addRoom(project.id, room);
      toast.success("Raum hinzugefügt");
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

  const handleSaveAsTemplate = () => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      setUpgradeReason(gate.reason || "");
      setUpgradeOpen(true);
      return;
    }
    addTemplate(project.name, project.rooms.map(({ id, ...rest }) => rest));
    toast.success("Als Vorlage gespeichert");
    setMenuOpen(false);
  };

  return (
    <PageTransition className="min-h-screen bg-background pb-32">
      <div className="bg-background/95 border-b border-border/20 sticky top-0 z-30 px-4 safe-header pb-3 flex items-center justify-between pt-12">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/objekte")} className="-ml-2">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex gap-2">
          <Link href={`/auswertung/${project.id}`}>
            <Button variant="outline" size="sm" className="h-9 px-3 text-xs"><BarChart3 size={14} className="mr-1.5" />Auswertung</Button>
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
            <button onClick={() => { setShowInfo(true); setCustomerInput(project.customer || ""); setLocationInput(project.location || ""); setNotesInput(project.notes || ""); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Edit3 size={16} className="text-muted-foreground" /> Info bearbeiten</button>
            <button onClick={() => { const gate = canAddProject(); if (!gate.allowed) { setUpgradeReason(gate.reason || ""); setUpgradeOpen(true); } else { duplicateProject(project.id); toast.success("Dupliziert"); } setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Copy size={16} className="text-muted-foreground" /> Duplizieren</button>
            <button onClick={handleSaveAsTemplate} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><BookOpen size={16} className="text-muted-foreground" /> Als Vorlage speichern</button>
            <button onClick={() => {
              const gate = canUsePDF();
              if (!gate.allowed) { setUpgradeReason(gate.reason || ""); setUpgradeOpen(true); } else { setLocation(`/print/${project.id}`); }
              setMenuOpen(false);
            }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><FileText size={16} className="text-muted-foreground" /> PDF exportieren {plan === "basic" && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded font-semibold ml-auto">PRO</span>}</button>
            <button onClick={() => { archiveProject(project.id); toast.success("Archiviert"); setLocation("/objekte"); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Archive size={16} className="text-muted-foreground" /> Archivieren</button>
            <button onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10"><Trash2 size={16} /> Löschen</button>
          </div>
        </>
      )}

      <div className="px-6 py-6">
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
            Stundensatz: {formatCurrency(effectiveRate)}/h
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6 snap-x">
          {[
            { label: "Monatspreis", value: formatCurrency(totals.cost), accent: true },
            { label: "Stunden/Mo", value: `${formatNumber(totals.hours, 1)} h` },
            { label: "Fläche", value: `${formatNumber(totals.area, 0)} m²` },
            { label: "€/m²", value: formatCurrency(totals.pricePerSqm) },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border/30 rounded-2xl p-4 shrink-0 w-32 snap-start">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.accent ? "text-primary" : "text-foreground"}`}>{kpi.value}</p>
            </div>
          ))}
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
              {project.rooms.map((room) => {
                const rc = calcRoom(room, effectiveRate);
                return (
                  <div
                    key={room.id}
                    className="glass-card p-4 flex items-center group cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => { setEditingRoom(room); setSheetOpen(true); }}
                  >
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

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <Button onClick={openAddRoom} className="w-full shadow-xl shadow-black/20" size="lg">
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
      <ConfirmDialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} onConfirm={() => { deleteProject(project.id); setLocation("/objekte"); toast.success("Objekt gelöscht"); }} title="Objekt löschen?" description="Alle Räume und Daten werden unwiderruflich gelöscht." confirmLabel="Löschen" destructive />
      <ConfirmDialog open={!!deleteRoomId} onClose={() => setDeleteRoomId(null)} onConfirm={() => { if (deleteRoomId) { deleteRoom(project.id, deleteRoomId); toast.success("Raum gelöscht"); } setDeleteRoomId(null); }} title="Raum löschen?" description="Der Raum wird aus dem Objekt entfernt." confirmLabel="Löschen" destructive />

      {showInfo && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowInfo(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t border-border p-6 pb-safe">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
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
