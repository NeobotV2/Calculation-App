import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useStore, type FrequencyKey, type CustomRoomType } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREQUENCY_LABELS } from "@/lib/calc";
import { DEFAULT_ROOM_GROUPS } from "@/data/room-types";
import { Building2, Save, FileText, Lock, Clock, Plus, Trash2, Download, Upload, RotateCcw, Layers, Edit3, Calculator, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppFooter } from "@/components/layout/AppFooter";

export default function Einstellungen() {
  const [, setLocation] = useLocation();
  const companyName = useStore((s) => s.companyName);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const vatRate = useStore((s) => s.vatRate);
  const defaultFrequency = useStore((s) => s.defaultFrequency);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);
  const customRoomTypes = useStore((s) => s.customRoomTypes);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetToDefaults = useStore((s) => s.resetToDefaults);
  const plan = useStore((s) => s.plan);
  const actions = useStoreActions();
  const { isAuthenticated } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [company, setCompany] = useState(companyName);
  const [rate, setRate] = useState(hourlyRate.toString().replace(".", ","));
  const [vat, setVat] = useState(vatRate.toString().replace(".", ","));
  const [freq, setFreq] = useState<FrequencyKey>(defaultFrequency);
  const [header, setHeader] = useState(pdfHeader);
  const [footer, setFooter] = useState(pdfFooter);
  const [isSaving, setIsSaving] = useState(false);

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<CustomRoomType | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomGroup, setNewRoomGroup] = useState(DEFAULT_ROOM_GROUPS[0].id);
  const [newRoomPerf, setNewRoomPerf] = useState("");
  const [showResetDefaults, setShowResetDefaults] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await actions.updateSettings({
        companyName: company.trim() || "Meine Reinigungsfirma",
        hourlyRate: parseFloat(rate.replace(",", ".")) || 22.5,
        vatRate: parseFloat(vat.replace(",", ".")) || 0,
        defaultFrequency: freq,
      });
      toast.success("Einstellungen gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePDF = async () => {
    setIsSaving(true);
    try {
      await actions.updateSettings({
        pdfHeader: header.trim(),
        pdfFooter: footer.trim(),
      });
      toast.success("PDF-Einstellungen gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRoomType = async () => {
    const perfVal = parseFloat(newRoomPerf.replace(",", "."));
    if (!newRoomName.trim() || !perfVal || perfVal <= 0) {
      toast.error("Name und Leistungswert erforderlich");
      return;
    }
    const group = DEFAULT_ROOM_GROUPS.find(g => g.id === newRoomGroup) || DEFAULT_ROOM_GROUPS[0];
    try {
      if (editingRoomType) {
        await actions.updateCustomRoomType(editingRoomType.id, {
          name: newRoomName.trim(),
          groupId: group.id,
          groupName: group.name,
          performanceValue: perfVal,
        });
        toast.success("Raumart aktualisiert");
      } else {
        await actions.addCustomRoomType({
          name: newRoomName.trim(),
          groupId: group.id,
          groupName: group.name,
          performanceValue: perfVal,
        });
        toast.success("Raumart hinzugefügt");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
    setNewRoomName("");
    setNewRoomPerf("");
    setEditingRoomType(null);
    setShowAddRoom(false);
  };

  const handleDeleteRoomType = async (id: string) => {
    try {
      await actions.deleteCustomRoomType(id);
      toast.success("Raumart entfernt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  };

  const startEditRoomType = (rt: CustomRoomType) => {
    setEditingRoomType(rt);
    setNewRoomName(rt.name);
    setNewRoomGroup(rt.groupId);
    setNewRoomPerf(rt.performanceValue.toString());
    setShowAddRoom(true);
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleancalc-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Daten exportiert");
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAuthenticated) {
      toast.error("Im Cloud-Modus ist der Datenimport nicht verfügbar.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (importData(text)) {
        toast.success("Daten importiert");
        setCompany(useStore.getState().companyName);
        setRate(useStore.getState().hourlyRate.toString().replace(".", ","));
        setVat(useStore.getState().vatRate.toString().replace(".", ","));
        setFreq(useStore.getState().defaultFrequency);
        setHeader(useStore.getState().pdfHeader);
        setFooter(useStore.getState().pdfFooter);
      } else {
        toast.error("Ungültige Datei");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetDefaults = async () => {
    try {
      await actions.updateSettings({
        companyName: "Meine Reinigungsfirma",
        hourlyRate: 22.5,
        vatRate: 0,
        defaultFrequency: "5x_week",
        pdfHeader: "",
        pdfFooter: "",
      });
      if (!isAuthenticated) {
        resetToDefaults();
      }
      setCompany("Meine Reinigungsfirma");
      setRate("22,5");
      setVat("0");
      setFreq("5x_week");
      setHeader("");
      setFooter("");
      toast.success("Einstellungen zurückgesetzt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Zurücksetzen");
    }
  };

  return (
    <PageTransition className="min-h-screen pb-28 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <h1 className="text-4xl font-semibold tracking-tight mt-2">Einstellungen</h1>
      </div>

      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Building2 size={16} /> Allgemein
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Firmenname</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="bg-background border-border/50 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Standard-Stundensatz (€/h)</label>
              <div className="flex gap-2">
                <Input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className="bg-background border-border/50 h-12 flex-1" />
                <button
                  onClick={() => setLocation("/stundensatz")}
                  className="h-12 px-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2 text-primary hover:bg-primary/15 transition-colors shrink-0"
                >
                  <Calculator size={16} />
                  <span className="text-sm font-medium">Kalkulieren</span>
                  <ChevronRight size={14} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                Nutze den Kalkulator für eine professionelle Stundensatz-Berechnung.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">MwSt.-Satz (%)</label>
              <Input value={vat} onChange={(e) => setVat(e.target.value)} inputMode="decimal" placeholder="0 = ohne MwSt." className="bg-background border-border/50 h-12" />
              <p className="text-xs text-muted-foreground mt-1.5 ml-1">Wird auf dem PDF-Angebot ausgewiesen. 0 = keine MwSt.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Clock size={14} /> Standard-Reinigungshäufigkeit
              </label>
              <select
                value={freq}
                onChange={(e) => setFreq(e.target.value as FrequencyKey)}
                className="w-full h-12 rounded-xl border border-border/50 bg-background px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="pt-2">
              <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                <Save size={18} className="mr-2" /> Änderungen speichern
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Layers size={16} /> Eigene Raumarten
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
            <div className={plan === "basic" ? "opacity-30 select-none pointer-events-none" : ""}>
              {customRoomTypes.length === 0 && plan === "pro" && (
                <p className="text-sm text-muted-foreground mb-4">Noch keine eigenen Raumarten definiert.</p>
              )}
              {customRoomTypes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {customRoomTypes.map((rt) => (
                    <div key={rt.id} className="flex items-center justify-between bg-background rounded-xl px-4 py-3 border border-border/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">{rt.name}</p>
                        <p className="text-xs text-muted-foreground">{rt.groupName} · {rt.performanceValue} m²/h</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditRoomType(rt)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
                          <Edit3 size={14} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDeleteRoomType(rt.id)} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center">
                          <Trash2 size={14} className="text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showAddRoom ? (
                <div className="space-y-3 bg-background rounded-xl p-4 border border-border/30">
                  <Input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Raumart-Name" className="bg-card h-11" />
                  <select value={newRoomGroup} onChange={(e) => setNewRoomGroup(e.target.value)} className="w-full h-11 rounded-xl border border-border/40 bg-card px-4 text-sm text-foreground focus:outline-none appearance-none">
                    {DEFAULT_ROOM_GROUPS.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <Input value={newRoomPerf} onChange={(e) => setNewRoomPerf(e.target.value)} inputMode="decimal" placeholder="Leistungswert (m²/h)" className="bg-card h-11" />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setShowAddRoom(false); setEditingRoomType(null); setNewRoomName(""); setNewRoomPerf(""); }} className="flex-1">Abbrechen</Button>
                    <Button onClick={handleSaveRoomType} className="flex-1">{editingRoomType ? "Speichern" : "Hinzufügen"}</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowAddRoom(true)} className="w-full">
                  <Plus size={16} className="mr-2" /> Raumart hinzufügen
                </Button>
              )}
            </div>
            {plan === "basic" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm">
                <div className="w-12 h-12 bg-background border border-border/50 rounded-full flex items-center justify-center mb-3">
                  <Lock size={20} className="text-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">Nur im Pro Plan</p>
                <p className="text-xs text-muted-foreground mb-4">Erstelle eigene Raumarten.</p>
                <Button variant="outline" size="sm" onClick={() => setLocation("/upgrade")}>Upgrade ansehen</Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <FileText size={16} /> PDF-Angebote
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
            <div className={`space-y-5 ${plan === "basic" ? "opacity-30 select-none pointer-events-none" : ""}`}>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Kopfzeile (optional)</label>
                <Input
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="z.B. Angebots-Nr., Datum, Adresse"
                  disabled={plan === "basic"}
                  className="bg-background border-border/50 h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Fußzeile (optional)</label>
                <Input
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="Bankverbindung, HRB, Steuernr., etc."
                  disabled={plan === "basic"}
                  className="bg-background border-border/50 h-12"
                />
              </div>
              <Button onClick={handleSavePDF} className="w-full" disabled={plan === "basic" || isSaving}>
                <Save size={18} className="mr-2" /> PDF-Einstellungen speichern
              </Button>
            </div>

            {plan === "basic" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm">
                <div className="w-12 h-12 bg-background border border-border/50 rounded-full flex items-center justify-center mb-3">
                  <Lock size={20} className="text-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">Nur im Pro Plan</p>
                <p className="text-xs text-muted-foreground mb-4">Individualisiere deine PDF-Angebote.</p>
                <Button variant="outline" size="sm" onClick={() => setLocation("/upgrade")}>Upgrade ansehen</Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Download size={16} /> Daten
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            <Button variant="outline" onClick={handleExport} className="w-full justify-start h-12 text-sm bg-background">
              <Download size={16} className="mr-3 text-muted-foreground" /> Alle Daten exportieren (JSON)
            </Button>
            {!isAuthenticated && (
              <Button variant="outline" onClick={handleImport} className="w-full justify-start h-12 text-sm bg-background">
                <Upload size={16} className="mr-3 text-muted-foreground" /> Daten importieren (JSON)
              </Button>
            )}
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
            <Button variant="outline" onClick={() => setShowResetDefaults(true)} className="w-full justify-start h-12 text-sm bg-background border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10">
              <RotateCcw size={16} className="mr-3" /> Einstellungen zurücksetzen
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={showResetDefaults}
        onClose={() => setShowResetDefaults(false)}
        onConfirm={handleResetDefaults}
        title="Einstellungen zurücksetzen?"
        description="Firmenname, Stundensatz, MwSt., Häufigkeit, PDF-Einstellungen und eigene Raumarten werden auf Standard zurückgesetzt. Objekte und Vorlagen bleiben erhalten."
        confirmLabel="Zurücksetzen"
        destructive
      />

      <AppFooter />

      <BottomNav />
    </PageTransition>
  );
}
