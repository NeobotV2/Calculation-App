import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useStore, type FrequencyKey, type CustomRoomType } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DEFAULT_ROOM_GROUPS } from "@/data/room-types";
import { toast } from "sonner";
import { AppFooter } from "@/components/layout/AppFooter";
import { CompanyDataSection } from "./einstellungen/CompanyDataSection";
import { CalculationSection } from "./einstellungen/CalculationSection";
import { RoomTypesSection } from "./einstellungen/RoomTypesSection";
import { WarningsSection } from "./einstellungen/WarningsSection";
import { PdfBrandingSection } from "./einstellungen/PdfBrandingSection";
import { BrandingPlaceholderSection } from "./einstellungen/BrandingPlaceholderSection";
import { AppearanceSection } from "./einstellungen/AppearanceSection";
import { DataBackupSection } from "./einstellungen/DataBackupSection";

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
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
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
      toast.error("Bitte wählen Sie eine Bilddatei aus.");
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
        <CompanyDataSection
          company={company}
          setCompany={setCompany}
          street={street}
          setStreet={setStreet}
          zip={zip}
          setZip={setZip}
          city={city}
          setCity={setCity}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          taxNumber={taxNumber}
          setTaxNumber={setTaxNumber}
          vatId={vatId}
          setVatId={setVatId}
          managingDirector={managingDirector}
          setManagingDirector={setManagingDirector}
          isSaving={isSaving}
          onSave={handleSaveCompanyData}
        />

        <CalculationSection
          rate={rate}
          setRate={setRate}
          vat={vat}
          setVat={setVat}
          freq={freq}
          setFreq={setFreq}
          isSaving={isSaving}
          onSave={handleSave}
          onOpenRateCalculator={() => setLocation("/stundensatz")}
        />

        <RoomTypesSection
          plan={plan}
          customRoomTypes={customRoomTypes}
          showAddRoom={showAddRoom}
          setShowAddRoom={setShowAddRoom}
          editingRoomType={editingRoomType}
          setEditingRoomType={setEditingRoomType}
          newRoomName={newRoomName}
          setNewRoomName={setNewRoomName}
          newRoomGroup={newRoomGroup}
          setNewRoomGroup={setNewRoomGroup}
          newRoomPerf={newRoomPerf}
          setNewRoomPerf={setNewRoomPerf}
          onSaveRoomType={handleSaveRoomType}
          onStartEditRoomType={startEditRoomType}
          onRequestDeleteRoomType={setDeleteRoomTypeConfirm}
          onUpgrade={() => setLocation("/upgrade")}
        />

        <WarningsSection
          targetMarginLocal={targetMarginLocal}
          setTargetMarginLocal={setTargetMarginLocal}
          targetMarginStore={targetMarginStore}
          setTargetMarginAction={setTargetMarginAction}
          disabledWarnings={disabledWarnings}
          setDisabledWarnings={setDisabledWarnings}
        />

        <PdfBrandingSection
          plan={plan}
          companyLogo={companyLogo}
          logoInputRef={logoInputRef}
          onLogoUpload={handleLogoUpload}
          onRemoveLogo={handleRemoveLogo}
          header={header}
          setHeader={setHeader}
          footer={footer}
          setFooter={setFooter}
          isSaving={isSaving}
          onSave={handleSavePDF}
          onUpgrade={() => setLocation("/upgrade")}
        />

        <BrandingPlaceholderSection plan={plan} onUpgrade={() => setLocation("/upgrade")} />

        <AppearanceSection theme={theme} setTheme={setTheme} />

        <DataBackupSection
          isAuthenticated={isAuthenticated}
          fileInputRef={fileInputRef}
          onExport={handleExport}
          onImport={handleImport}
          onFileChange={handleFileChange}
          onRequestReset={() => setShowResetDefaults(true)}
        />
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
