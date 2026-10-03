import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useEconomicsSettings } from "@/hooks/use-object-economics";
import { useAuth } from "@/lib/auth-context";
import { useMediaQuery } from "@/lib/theme";
import { MEDIA } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { AppFooter } from "@/components/layout/AppFooter";
import { OFFLINE_MESSAGE, useCloudOffline } from "@/components/layout/SyncBanner";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { StateView } from "@/components/ui/state-view";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { calcRateImpact } from "@/pages/auswertung/portfolio";
import { CompanyDataSection } from "./einstellungen/CompanyDataSection";
import { CalculationSection } from "./einstellungen/CalculationSection";
import { RoomTypesSection } from "./einstellungen/RoomTypesSection";
import { WarningsSection } from "./einstellungen/WarningsSection";
import { PdfBrandingSection } from "./einstellungen/PdfBrandingSection";
import { AppearanceSection } from "./einstellungen/AppearanceSection";
import { DataBackupSection } from "./einstellungen/DataBackupSection";
import { SettingsNav, SettingsSectionList } from "./einstellungen/SettingsNav";
import { SaveBar } from "./einstellungen/SaveBar";
import { useLeaveGuard, useSettingsForm, type SettingsFieldKey } from "./einstellungen/use-settings-form";
import {
  DEFAULT_SETTINGS_SECTION,
  getSettingsSection,
  isSettingsSectionId,
  settingsHref,
  type SettingsSectionId,
} from "./einstellungen/settings-sections";

/** In welchem Bereich ein Formularfeld steht (für Hinweise auf Fehler anderswo). */
const FIELD_SECTION: Record<SettingsFieldKey, SettingsSectionId> = {
  companyName: "firma",
  companyStreet: "firma",
  companyZip: "firma",
  companyCity: "firma",
  companyPhone: "firma",
  companyEmail: "firma",
  companyTaxNumber: "firma",
  companyVatId: "firma",
  companyManagingDirector: "firma",
  vatRate: "firma",
  pdfHeader: "firma",
  pdfFooter: "firma",
  hourlyRate: "kalkulation",
  defaultFrequency: "kalkulation",
  targetMargin: "pruefregeln",
};

const isSettingsPath = (path: string) => path === "/einstellungen" || path.startsWith("/einstellungen/");

export default function Einstellungen() {
  const [, params] = useRoute("/einstellungen/:bereich?");
  const bereich = params?.bereich;
  const isLg = useMediaQuery(MEDIA.lg);

  const projects = useStore((s) => s.projects);
  const customRoomTypes = useStore((s) => s.customRoomTypes);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const setDisabledWarnings = useStore((s) => s.setDisabledWarnings);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetToDefaults = useStore((s) => s.resetToDefaults);
  const plan = useStore((s) => s.plan);
  const companyLogo = useStore((s) => s.companyLogo);
  const actions = useStoreActions();
  const settings = useEconomicsSettings();
  const { isAuthenticated } = useAuth();
  const offline = useCloudOffline();

  const form = useSettingsForm();
  const guard = useLeaveGuard(form.dirty, isSettingsPath);
  const [showResetDefaults, setShowResetDefaults] = useState(false);

  const unknownSection = bereich !== undefined && !isSettingsSectionId(bereich);
  const active: SettingsSectionId | null = isSettingsSectionId(bereich) ? bereich : isLg ? DEFAULT_SETTINGS_SECTION : null;
  const activeMeta = active ? getSettingsSection(active) : null;

  // Auswirkung eines geänderten Standard-Verrechnungssatzes (vor dem Speichern).
  const rateChanged = form.changedKeys.includes("hourlyRate");
  const newRate = form.values.hourlyRate;
  const rateImpact = useMemo(
    () =>
      rateChanged && newRate !== undefined && newRate > 0
        ? calcRateImpact(projects, settings, { ...settings, hourlyRate: newRate })
        : null,
    [rateChanged, newRate, projects, settings],
  );

  const errorSections = Array.from(
    new Set((Object.keys(form.errors) as SettingsFieldKey[]).map((k) => FIELD_SECTION[k])),
  ).filter((s) => s !== active);

  const handleSave = async () => {
    const ok = await form.save();
    if (ok) toast.success("Einstellungen gespeichert");
    return ok;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
      actions
        .updateSettings({ companyLogo: base64 })
        .then(() => toast.success("Logo hochgeladen"))
        .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Das Logo konnte nicht gespeichert werden."));
    };
    reader.onerror = () => toast.error("Die Datei konnte nicht gelesen werden.");
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    actions
      .updateSettings({ companyLogo: "" })
      .then(() => toast.success("Logo entfernt"))
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Das Logo konnte nicht entfernt werden."));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (isAuthenticated) {
      toast.error("Im Cloud-Modus ist der Datenimport nicht verfügbar.");
      return;
    }
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (importData(text)) {
        form.reset();
        toast.success("Daten importiert");
      } else {
        toast.error("Die Datei ist ungültig und wurde nicht importiert.");
      }
    };
    reader.onerror = () => toast.error("Die Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
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
      form.reset();
      toast.success("Einstellungen zurückgesetzt");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Die Einstellungen konnten nicht zurückgesetzt werden.");
    }
  };

  const renderSection = (id: SettingsSectionId) => {
    switch (id) {
      case "firma":
        return (
          <>
            <CompanyDataSection form={form} />
            <PdfBrandingSection
              plan={plan}
              companyLogo={companyLogo}
              onLogoUpload={handleLogoUpload}
              onRemoveLogo={handleRemoveLogo}
              form={form}
            />
          </>
        );
      case "kalkulation":
        return <CalculationSection form={form} rateImpact={rateImpact} />;
      case "pruefregeln":
        return (
          <WarningsSection form={form} disabledWarnings={disabledWarnings} setDisabledWarnings={setDisabledWarnings} />
        );
      case "raumarten":
        return <RoomTypesSection plan={plan} customRoomTypes={customRoomTypes} />;
      case "darstellung":
        return <AppearanceSection theme={theme} setTheme={setTheme} />;
      case "daten":
        return (
          <DataBackupSection
            isAuthenticated={isAuthenticated}
            onExport={handleExport}
            onFileChange={handleFileChange}
            onRequestReset={() => setShowResetDefaults(true)}
          />
        );
    }
  };

  const sectionContent = activeMeta && (
    <section aria-labelledby="settings-section-title" className="min-w-0 space-y-4">
      <div className={cn("space-y-1", !isLg && "sr-only")}>
        <h2 id="settings-section-title" className="text-h2 text-foreground">
          {activeMeta.label}
        </h2>
        <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
      </div>
      {form.saveError && (
        <Callout
          tone="critical"
          live
          title="Speichern fehlgeschlagen"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => void handleSave()}>
              <RotateCcw aria-hidden="true" />
              Erneut versuchen
            </Button>
          }
        >
          {form.saveError}
        </Callout>
      )}
      {errorSections.length > 0 && (
        <Callout tone="warning" live title="Bitte prüfen Sie Ihre Eingaben">
          Ungültige Werte in:{" "}
          {errorSections.map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              <Link href={settingsHref(s)} className="font-medium text-primary underline underline-offset-4">
                {getSettingsSection(s).label}
              </Link>
            </span>
          ))}
        </Callout>
      )}
      {renderSection(activeMeta.id)}
    </section>
  );

  const header =
    !isLg && activeMeta ? (
      <PageHeader title={activeMeta.label} back={{ href: settingsHref(), label: "Einstellungen" }} width="narrow" />
    ) : (
      <PageHeader title="Einstellungen" width={isLg ? "default" : "narrow"} />
    );

  let body: React.ReactNode;
  if (unknownSection) {
    body = (
      <StateView
        kind="not-found"
        title="Bereich nicht gefunden"
        description="Diesen Einstellungsbereich gibt es nicht."
        action={{ label: "Zu den Einstellungen", href: settingsHref() }}
      />
    );
  } else if (isLg && activeMeta) {
    body = (
      <div className="grid grid-cols-[13rem_minmax(0,1fr)] gap-8">
        <div>
          <SettingsNav active={activeMeta.id} className="sticky top-[calc(var(--safe-top)+1.5rem)]" />
        </div>
        <div className="min-w-0 max-w-3xl">{sectionContent}</div>
      </div>
    );
  } else if (activeMeta) {
    body = sectionContent;
  } else {
    body = (
      <>
        <SettingsSectionList />
        <AppFooter />
      </>
    );
  }

  return (
    <PageTransition>
      <PageShell width={isLg ? "default" : "narrow"} header={header}>
        {body}
      </PageShell>

      <SaveBar
        dirty={form.dirty}
        saving={form.saving}
        onSave={() => void handleSave()}
        onDiscard={form.reset}
        offlineMessage={offline ? OFFLINE_MESSAGE : null}
        width={isLg ? "default" : "narrow"}
      />

      <ConfirmDialog
        open={!!guard.pendingHref}
        onClose={guard.cancel}
        onConfirm={() => {
          form.reset();
          guard.proceed();
        }}
        title="Änderungen verwerfen?"
        description="Sie haben ungespeicherte Änderungen in den Einstellungen. Wenn Sie die Seite verlassen, gehen sie verloren."
        confirmLabel="Verwerfen"
        destructive
        cancelLabel="Weiter bearbeiten"
        secondaryLabel={offline ? undefined : "Speichern und verlassen"}
        onSecondary={() => {
          void handleSave().then((ok) => {
            if (ok) guard.proceed();
            else guard.cancel();
          });
        }}
      />

      <ConfirmDialog
        open={showResetDefaults}
        onClose={() => setShowResetDefaults(false)}
        onConfirm={() => void handleResetDefaults()}
        title="Einstellungen zurücksetzen?"
        description="Firmendaten, Verrechnungssatz, MwSt., Turnus, Angebots-Layout und eigene Raumarten werden auf Standard zurückgesetzt. Objekte und Vorlagen bleiben erhalten."
        confirmLabel="Zurücksetzen"
        destructive
      />
    </PageTransition>
  );
}
