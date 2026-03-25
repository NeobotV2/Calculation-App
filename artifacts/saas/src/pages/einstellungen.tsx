import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useStore, type FrequencyKey, type CustomRoomType } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREQUENCY_LABELS } from "@/lib/calc";
import { DEFAULT_ROOM_GROUPS } from "@/data/room-types";
import { Building2, Save, FileText, Lock, Clock, Plus, Trash2, Download, Upload, RotateCcw, Layers, Edit3, Calculator, ChevronRight, MapPin, Phone, Mail, FileCheck, AlertTriangle, ImagePlus, X } from "lucide-react";
import { WARNING_TYPES } from "@/lib/warnings";
import { toast } from "sonner";
import { AppFooter } from "@/components/layout/AppFooter";

export default function Einstellungen() {
  const [, setLocation] = useLocation();
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const companyPhone = useStore((s) => s.companyPhone);
  const companyEmail = useStore((s) => s.companyEmail);
  const companyTaxNumber = useStore((s) => s.companyTaxNumber);
  const companyVatId = useStore((s) => s.companyVatId);
  const companyManagingDirector = useStore((s) => s.companyManagingDirector);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const vatRate = useStore((s) => s.vatRate);
  const defaultFrequency = useStore((s) => s.defaultFrequency);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);
  const customRoomTypes = useStore((s) => s.customRoomTypes);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const setDisabledWarnings = useStore((s) => s.setDisabledWarnings);
  const targetMarginStore = useStore((s) => s.targetMargin);
  const setTargetMarginAction = useStore((s) => s.setTargetMargin);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetToDefaults = useStore((s) => s.resetToDefaults);
  const plan = useStore((s) => s.plan);
  const actions = useStoreActions();
  const { isAuthenticated } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const companyLogo = useStore((s) => s.companyLogo);

  const [company, setCompany] = useState(companyName);
  const [street, setStreet] = useState(companyStreet);
  const [zip, setZip] = useState(companyZip);
  const [city, setCity] = useState(companyCity);
  const [phone, setPhone] = useState(companyPhone);
  const [email, setEmail] = useState(companyEmail);
  const [taxNumber, setTaxNumber] = useState(companyTaxNumber);
  const [vatId, setVatId] = useState(companyVatId);
  const [managingDirector, setManagingDirector] = useState(companyManagingDirector);
  const [rate, setRate] = useState(hourlyRate.toString().replace(".", ","));
  const [vat, setVat] = useState(vatRate.toString().replace(".", ","));
  const [freq, setFreq] = useState<FrequencyKey>(defaultFrequency);
  const [header, setHeader] = useState(pdfHeader);
  const [footer, setFooter] = useState(pdfFooter);
  const [isSaving, setIsSaving] = useState(false);

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [deleteRoomTypeConfirm, setDeleteRoomTypeConfirm] = useState<string | null>(null);
  const [editingRoomType, setEditingRoomType] = useState<CustomRoomType | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomGroup, setNewRoomGroup] = useState(DEFAULT_ROOM_GROUPS[0].id);
  const [newRoomPerf, setNewRoomPerf] = useState("");
  const [showResetDefaults, setShowResetDefaults] = useState(false);
  const [targetMarginLocal, setTargetMarginLocal] = useState(String(targetMarginStore));

  const handleSaveCompanyData = async () => {
    setIsSaving(true);
    try {
      await actions.updateSettings({
        companyName: company.trim() || "Meine Reinigungsfirma",
        companyStreet: street.trim(),
        companyZip: zip.trim(),
        companyCity: city.trim(),
        companyPhone: phone.trim(),
        companyEmail: email.trim(),
        companyTaxNumber: taxNumber.trim(),
        companyVatId: vatId.trim(),
        companyManagingDirector: managingDirector.trim(),
      });
      toast.success("Firmenstammdaten gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await actions.updateSettings({
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei aus.");
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error("Das Bild ist zu groß (max. 500 KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      actions.updateSettings({ companyLogo: base64 });
      toast.success("Logo hochgeladen");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveLogo = () => {
    actions.updateSettings({ companyLogo: "" });
    toast.success("Logo entfernt");
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
    setDeleteRoomTypeConfirm(null);
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
        const s = useStore.getState();
        setCompany(s.companyName);
        setStreet(s.companyStreet);
        setZip(s.companyZip);
        setCity(s.companyCity);
        setPhone(s.companyPhone);
        setEmail(s.companyEmail);
        setTaxNumber(s.companyTaxNumber);
        setVatId(s.companyVatId);
        setManagingDirector(s.companyManagingDirector);
        setRate(s.hourlyRate.toString().replace(".", ","));
        setVat(s.vatRate.toString().replace(".", ","));
        setFreq(s.defaultFrequency);
        setHeader(s.pdfHeader);
        setFooter(s.pdfFooter);
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
        companyStreet: "",
        companyZip: "",
        companyCity: "",
        companyPhone: "",
        companyEmail: "",
        companyTaxNumber: "",
        companyVatId: "",
        companyManagingDirector: "",
        hourlyRate: 22.5,
        vatRate: 0,
        defaultFrequency: "5x_week",
        pdfHeader: "",
        pdfFooter: "",
        companyLogo: "",
      });
      if (!isAuthenticated) {
        resetToDefaults();
      }
      setCompany("Meine Reinigungsfirma");
      setStreet("");
      setZip("");
      setCity("");
      setPhone("");
      setEmail("");
      setTaxNumber("");
      setVatId("");
      setManagingDirector("");
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
    <PageTransition className="min-h-screen pb-28 md:pb-8 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20 md:pt-6">
        <h1 className="text-4xl font-semibold tracking-tight mt-2 max-w-5xl mx-auto">Einstellungen</h1>
      </div>

      <div className="p-6 space-y-8 max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Building2 size={16} /> Firmenstammdaten
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Firmenname</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="bg-background border-border/50 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <MapPin size={14} /> Adresse
              </label>
              <div className="space-y-3">
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Straße und Hausnummer" className="bg-background border-border/50 h-12" />
                <div className="flex gap-3">
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="PLZ" className="bg-background border-border/50 h-12 w-28" />
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ort" className="bg-background border-border/50 h-12 flex-1" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Phone size={14} /> Telefon
              </label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="z.B. +49 123 456789" type="tel" className="bg-background border-border/50 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Mail size={14} /> E-Mail
              </label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@firma.de" type="email" className="bg-background border-border/50 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <FileCheck size={14} /> Steuerliche Angaben
              </label>
              <div className="space-y-3">
                <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder="Steuernummer" className="bg-background border-border/50 h-12" />
                <Input value={vatId} onChange={(e) => setVatId(e.target.value)} placeholder="USt-IdNr. (z.B. DE123456789)" className="bg-background border-border/50 h-12" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Geschäftsführer</label>
              <Input value={managingDirector} onChange={(e) => setManagingDirector(e.target.value)} placeholder="Vor- und Nachname" className="bg-background border-border/50 h-12" />
            </div>
            <div className="pt-2">
              <Button onClick={handleSaveCompanyData} className="w-full" disabled={isSaving}>
                <Save size={18} className="mr-2" /> Firmenstammdaten speichern
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Calculator size={16} /> Kalkulation
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Standard-Verrechnungssatz (€/h)</label>
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
                Nutze den Kalkulator für eine professionelle Verrechnungssatz-Berechnung.
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
            <Layers size={16} /> Raumarten
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
                        <button onClick={() => setDeleteRoomTypeConfirm(rt.id)} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center">
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
            <AlertTriangle size={16} /> Warnhinweise
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ziel-Marge (%)</label>
              <p className="text-xs text-muted-foreground">Objekte mit einer Marge unter diesem Wert erhalten eine Warnung.</p>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.5}
                value={targetMarginLocal}
                onChange={(e) => setTargetMarginLocal(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(targetMarginLocal);
                  if (!isNaN(val) && val >= 0 && val <= 100) {
                    setTargetMarginAction(val);
                  } else {
                    setTargetMarginLocal(String(targetMarginStore));
                  }
                }}
                className="bg-background h-11 w-32"
              />
            </div>
            <div className="border-t border-border/30 pt-3">
              <p className="text-xs text-muted-foreground mb-2">Einzelne Warnhinweise deaktivieren. Deaktivierte Warnungen werden nicht mehr angezeigt.</p>
            </div>
            {WARNING_TYPES.map((wt) => {
              const isDisabled = disabledWarnings.includes(wt.key);
              return (
                <label key={wt.key} className="flex items-center justify-between py-2 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wt.severity === "critical" ? "bg-red-500" : wt.severity === "warning" ? "bg-yellow-500" : "bg-blue-400"}`} />
                    <span className="text-sm text-foreground">{wt.label}</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isDisabled}
                    onClick={() => {
                      if (isDisabled) {
                        setDisabledWarnings(disabledWarnings.filter((k) => k !== wt.key));
                      } else {
                        setDisabledWarnings([...disabledWarnings, wt.key]);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!isDisabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isDisabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </label>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <FileText size={16} /> PDF & Branding
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
            <div className={`space-y-5 ${plan === "basic" ? "opacity-30 select-none pointer-events-none" : ""}`}>
              <p className="text-xs text-muted-foreground">
                Firmenstammdaten werden automatisch im PDF-Briefkopf und -Fuß verwendet. Hier kannst du optionale Zusatzzeilen eintragen.
              </p>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Firmenlogo</label>
                {companyLogo ? (
                  <div className="flex items-center gap-4">
                    <img src={companyLogo} alt="Logo" className="h-14 w-auto object-contain rounded-lg border border-border/30 bg-white p-1" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={plan === "basic"}>
                        Ändern
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleRemoveLogo} disabled={plan === "basic"} className="text-destructive hover:bg-destructive/10">
                        <X size={14} className="mr-1" /> Entfernen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => logoInputRef.current?.click()} className="w-full h-20 border-dashed flex flex-col items-center gap-1" disabled={plan === "basic"}>
                    <ImagePlus size={20} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Logo hochladen (max. 500 KB)</span>
                  </Button>
                )}
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <p className="text-xs text-muted-foreground mt-1.5 ml-1">Wird im PDF-Briefkopf neben dem Firmennamen angezeigt.</p>
              </div>
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
                  placeholder="Bankverbindung, HRB, etc."
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
            <Building2 size={16} /> Branding
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
            <div className={`space-y-5 ${plan === "basic" ? "opacity-30 select-none pointer-events-none" : ""}`}>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Firmenlogo (für PDF)</label>
                <div className="w-full h-24 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center text-sm text-muted-foreground bg-background">
                  Logo-Upload (demnächst verfügbar)
                </div>
              </div>
            </div>
            {plan === "basic" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm">
                <div className="w-12 h-12 bg-background border border-border/50 rounded-full flex items-center justify-center mb-3">
                  <Lock size={20} className="text-foreground" />
                </div>
                <p className="font-semibold text-foreground mb-1">Nur im Pro Plan</p>
                <p className="text-xs text-muted-foreground mb-4">Eigenes Logo & Branding.</p>
                <Button variant="outline" size="sm" onClick={() => setLocation("/upgrade")}>Upgrade ansehen</Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Download size={16} /> Daten & Sicherung
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
        open={!!deleteRoomTypeConfirm}
        onClose={() => setDeleteRoomTypeConfirm(null)}
        onConfirm={() => { if (deleteRoomTypeConfirm) handleDeleteRoomType(deleteRoomTypeConfirm); }}
        title="Raumart löschen?"
        description="Die eigene Raumart wird unwiderruflich entfernt. Bestehende Räume, die diese Raumart verwenden, bleiben erhalten."
        confirmLabel="Löschen"
        destructive
      />

      <ConfirmDialog
        open={showResetDefaults}
        onClose={() => setShowResetDefaults(false)}
        onConfirm={handleResetDefaults}
        title="Einstellungen zurücksetzen?"
        description="Firmenstammdaten, Verrechnungssatz, MwSt., Häufigkeit, PDF-Einstellungen und eigene Raumarten werden auf Standard zurückgesetzt. Objekte und Vorlagen bleiben erhalten."
        confirmLabel="Zurücksetzen"
        destructive
      />

      <div className="max-w-5xl mx-auto">
        <AppFooter />
      </div>
    </PageTransition>
  );
}
