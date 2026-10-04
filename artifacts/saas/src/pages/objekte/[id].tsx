import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { FileText, LayoutDashboard, Pencil, Plus, RotateCcw, type LucideIcon } from "lucide-react";
import { useStore } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";
import { useInitialLoading, useSyncStatus } from "@/hooks/use-sync-status";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DetailSkeleton } from "@/components/list-skeleton";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import { MODULE_META, type ServiceModule } from "@/components/ui/module-badge";
import { StateView } from "@/components/ui/state-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RoomsEditorHandle } from "@/components/calc/RoomsEditor";
import { OfferPreviewDialog } from "@/components/offer/OfferPreviewDialog";
import { useOfferAction } from "@/components/offer/use-offer-action";
import { createDefaultWinterdienst } from "@/data/winterdienst";
import { createDefaultHms } from "@/data/hausmeisterservice";
import { canAddProject, canRestoreProject, canUseTemplates, type GateResult } from "@/lib/feature-gates";
import type { UpgradeTrigger } from "@/lib/billing-config";
import { getNextStep, getObjectStatus } from "@/lib/offer-readiness";
import type { HmsConfig, WinterdienstConfig } from "@/lib/service-modules/types";
import { AddServiceMenu } from "./detail-parts/AddServiceMenu";
import { ArchivedBanner } from "./detail-parts/ArchivedBanner";
import { CleaningTab } from "./detail-parts/CleaningTab";
import { EconomicsCockpit } from "./detail-parts/EconomicsCockpit";
import { HmsEditorSheet, HmsTab } from "./detail-parts/HmsTab";
import { InfoSheet, type InfoSheetValues } from "./detail-parts/InfoSheet";
import { KpiStrip } from "./detail-parts/KpiStrip";
import { NachkalkulationSheet, useNachkalkulationSummary } from "./detail-parts/NachkalkulationSheet";
import { ObjectHeader } from "./detail-parts/ObjectHeader";
import { OverviewTab } from "./detail-parts/OverviewTab";
import { WinterdienstEditorSheet, WinterdienstTab } from "./detail-parts/WinterdienstTab";
import {
  WORKSPACE_TAB_LABELS,
  WORKSPACE_TAB_SHORT_LABELS,
  isCleaningTabVisible,
  isWorkspaceTab,
  resolveTab,
  tabHasWarnings,
  tabHref,
  visibleTabs,
  type WorkspaceTab,
} from "./detail-parts/workspace-tabs";

const TAB_ICON: Record<WorkspaceTab, LucideIcon> = {
  uebersicht: LayoutDashboard,
  reinigung: MODULE_META.unterhalt.icon,
  winterdienst: MODULE_META.winterdienst.icon,
  hms: MODULE_META.hms.icon,
};

type ModuleEditorState =
  | { module: "winterdienst"; initial: WinterdienstConfig; isNew: boolean; key: number }
  | { module: "hms"; initial: HmsConfig; isNew: boolean; key: number };

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/**
 * Objekt-Arbeitsbereich `/objekte/:id/:tab?` (§8): Kopf, Kennzahlen,
 * Wirtschaftlichkeits-Cockpit und je Leistungsmodul ein Tab. Kleine Änderungen
 * werden sofort gespeichert; der Flow dient dem Hinzufügen und Gesamtprüfen.
 */
export default function ObjektDetail() {
  // ── Alle Hooks vor jedem early return ──
  const [, params] = useRoute("/objekte/:id/:tab?");
  const [, navigate] = useLocation();
  const id = params?.id;
  const tabParam = params?.tab;

  const project = useStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined));
  const globalRate = useStore((s) => s.hourlyRate);
  const { status: syncStatus, hasLoadedOnce, reload } = useSyncStatus();
  const initialLoading = useInitialLoading();
  const actions = useStoreActions();

  const offer = useOfferAction(project);
  const econ = offer.economics;
  const readiness = offer.readiness;
  const nachkalkulation = useNachkalkulationSummary(project);

  const objectStatus = useMemo(
    () => (project && readiness ? getObjectStatus(project, readiness) : null),
    [project, readiness],
  );
  const nextStep = useMemo(
    () => (project && readiness ? getNextStep(project, readiness, { hasNachkalkulation: nachkalkulation.hasAny }) : null),
    [project, readiness, nachkalkulation.hasAny],
  );

  const [forceCleaningFor, setForceCleaningFor] = useState<string | null>(null);
  const forceCleaning = !!id && forceCleaningFor === id;
  const tab: WorkspaceTab = project ? resolveTab(tabParam, project, { forceCleaning }) : "uebersicht";

  const [infoOpen, setInfoOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nachkalkOpen, setNachkalkOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason?: string; trigger?: UpgradeTrigger }>({ open: false });
  const [editor, setEditor] = useState<ModuleEditorState | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const roomsEditorRef = useRef<RoomsEditorHandle>(null);

  const goTab = useCallback(
    (next: WorkspaceTab) => {
      if (id) navigate(tabHref(id, next), { replace: true });
    },
    [id, navigate],
  );

  // Unbekannter oder ausgeblendeter Tab in der URL ⇒ kanonische Adresse.
  useEffect(() => {
    if (!id || !project) return;
    if (tabParam !== undefined && tabParam !== tab) navigate(tabHref(id, tab), { replace: true });
  }, [id, project, tabParam, tab, navigate]);

  // Overlays gehören zum Objekt: beim Objektwechsel schließen.
  useEffect(() => {
    setInfoOpen(false);
    setPreviewOpen(false);
    setNachkalkOpen(false);
    setDeleteOpen(false);
    setEditorOpen(false);
  }, [id]);

  const showUpgrade = useCallback((gate: GateResult) => {
    setUpgrade({ open: true, reason: gate.reason, trigger: gate.trigger });
  }, []);

  // ── Laden / nicht gefunden ──
  if (!project || !econ) {
    if (deletedId !== null && deletedId === id) return null;
    if (!hasLoadedOnce) {
      return (
        <PageTransition>
          <PageShell width="wide" className="pt-safe">
            {syncStatus === "error" ? (
              <StateView
                kind="error"
                titleAs="h1"
                title="Objekt konnte nicht geladen werden"
                description="Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
                action={{ label: "Erneut versuchen", icon: RotateCcw, onClick: reload }}
                secondaryAction={{ label: "Zur Objektliste", href: "/objekte" }}
              />
            ) : initialLoading ? (
              <DetailSkeleton />
            ) : (
              <div className="min-h-64" aria-busy="true" />
            )}
          </PageShell>
        </PageTransition>
      );
    }
    return (
      <PageTransition>
        <PageShell width="wide" className="pt-safe">
          <StateView
            kind="not-found"
            titleAs="h1"
            title="Objekt nicht gefunden"
            description="Das Objekt wurde möglicherweise gelöscht oder ist nicht mehr verfügbar."
            action={{ label: "Zur Objektliste", href: "/objekte" }}
          />
        </PageShell>
      </PageTransition>
    );
  }

  const projectId = project.id;
  const archived = project.status === "archived";
  const tabs = visibleTabs(project, { forceCleaning });
  const refreshing = syncStatus === "loading" && hasLoadedOnce;

  /* ── Objekt-Aktionen ── */

  const handleRename = async (name: string) => {
    try {
      await actions.updateProject(projectId, { name });
      toast.success("Objekt umbenannt");
    } catch (err) {
      toast.error(errorMessage(err, "Der Name konnte nicht gespeichert werden."));
      throw err;
    }
  };

  const handleSaveInfo = async (v: InfoSheetValues) => {
    await actions.updateProject(projectId, {
      name: v.name,
      customer: v.customer,
      location: v.location,
      objectType: v.objectType,
      rpiContactName: v.contactName,
      hourlyRate: v.hourlyRate,
      notes: v.notes,
    });
    toast.success("Objektdaten gespeichert");
  };

  const handleDuplicate = async () => {
    const gate = canAddProject();
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    try {
      const newId = await actions.duplicateProject(projectId);
      toast.success("Objekt dupliziert");
      navigate(`/objekte/${newId}`);
    } catch (err) {
      toast.error(errorMessage(err, "Das Objekt konnte nicht dupliziert werden."));
    }
  };

  const handleSaveTemplate = async () => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    if (project.rooms.length === 0) {
      toast.info("Vorlagen enthalten nur Räume – dieses Objekt hat keine Räume.");
      return;
    }
    try {
      await actions.addTemplate(
        project.name,
        project.rooms.map(({ id: _id, ...rest }) => rest),
      );
      toast.success("Als Vorlage gespeichert (nur Räume)");
    } catch (err) {
      toast.error(errorMessage(err, "Die Vorlage konnte nicht gespeichert werden."));
    }
  };

  const handleRestore = async () => {
    const gate = canRestoreProject(projectId);
    if (!gate.allowed) {
      showUpgrade(gate);
      return;
    }
    try {
      await actions.restoreProject(projectId);
      toast.success("Objekt wiederhergestellt");
    } catch (err) {
      toast.error(errorMessage(err, "Das Objekt konnte nicht wiederhergestellt werden."));
    }
  };

  const handleArchive = async () => {
    try {
      await actions.archiveProject(projectId);
      toast.success("Archiviert", {
        action: { label: "Rückgängig", onClick: () => void handleRestore() },
      });
    } catch (err) {
      toast.error(errorMessage(err, "Das Objekt konnte nicht archiviert werden."));
    }
  };

  const handleDelete = async () => {
    setDeletedId(projectId);
    try {
      await actions.deleteProject(projectId);
      toast.success("Objekt gelöscht");
      // Ersetzen statt anhängen: „Zurück“ führt nicht auf das gelöschte Objekt.
      navigate("/objekte", { replace: true });
    } catch (err) {
      setDeletedId(null);
      toast.error(errorMessage(err, "Das Objekt konnte nicht gelöscht werden."));
    }
  };

  /* ── Leistungsmodule ── */

  const openEditor = (module: "winterdienst" | "hms", isNew = false) => {
    if (archived) return;
    if (module === "winterdienst") {
      const initial = isNew || !project.winterdienst ? createDefaultWinterdienst() : project.winterdienst;
      setEditor({ module, initial, isNew: isNew || !project.winterdienst, key: Date.now() });
    } else {
      const initial = isNew || !project.hms ? createDefaultHms(project.objectType, uuidv4) : project.hms;
      setEditor({ module, initial, isNew: isNew || !project.hms, key: Date.now() });
    }
    setEditorOpen(true);
  };

  const handleAddService = (module: ServiceModule) => {
    if (module === "unterhalt") {
      setForceCleaningFor(projectId);
      goTab("reinigung");
      return;
    }
    openEditor(module, true);
  };

  const saveWinterdienst = async (next: WinterdienstConfig, isNew: boolean) => {
    await actions.updateProject(projectId, { winterdienst: next });
    toast.success(isNew ? "Winterdienst hinzugefügt" : "Winterdienst gespeichert");
    if (isNew) goTab("winterdienst");
  };

  const saveHms = async (next: HmsConfig, isNew: boolean) => {
    await actions.updateProject(projectId, { hms: next });
    toast.success(isNew ? "Hausmeisterservice hinzugefügt" : "Hausmeisterservice gespeichert");
    if (isNew) goTab("hms");
  };

  const toggleWinterdienst = async (enabled: boolean) => {
    const cfg = project.winterdienst;
    if (!cfg) return;
    try {
      await actions.updateProject(projectId, { winterdienst: { ...cfg, enabled } });
      toast.success(enabled ? "Winterdienst aktiviert" : "Winterdienst pausiert");
    } catch (err) {
      toast.error(errorMessage(err, "Der Winterdienst konnte nicht geändert werden."));
    }
  };

  const toggleHms = async (enabled: boolean) => {
    const cfg = project.hms;
    if (!cfg) return;
    try {
      await actions.updateProject(projectId, { hms: { ...cfg, enabled } });
      toast.success(enabled ? "Hausmeisterservice aktiviert" : "Hausmeisterservice pausiert");
    } catch (err) {
      toast.error(errorMessage(err, "Der Hausmeisterservice konnte nicht geändert werden."));
    }
  };

  const removeWinterdienst = async () => {
    try {
      await actions.updateProject(projectId, { winterdienst: undefined });
      toast.success("Winterdienst entfernt");
      goTab("uebersicht");
    } catch (err) {
      toast.error(errorMessage(err, "Der Winterdienst konnte nicht entfernt werden."));
    }
  };

  const removeHms = async () => {
    try {
      await actions.updateProject(projectId, { hms: undefined });
      toast.success("Hausmeisterservice entfernt");
      goTab("uebersicht");
    } catch (err) {
      toast.error(errorMessage(err, "Der Hausmeisterservice konnte nicht entfernt werden."));
    }
  };

  /* ── Mobile Aktionsleiste (§8.5) ── */

  let stickyAction: { label: string; icon: LucideIcon; onClick: () => void } | null = null;
  if (!archived) {
    if (tab === "uebersicht") stickyAction = { label: "Angebot erstellen", icon: FileText, onClick: () => offer.trigger() };
    else if (tab === "reinigung") stickyAction = { label: "Raum hinzufügen", icon: Plus, onClick: () => roomsEditorRef.current?.openAdd() };
    else stickyAction = { label: "Bearbeiten", icon: Pencil, onClick: () => openEditor(tab) };
  }

  const cockpitProps = {
    project,
    economics: econ,
    onOpenNachkalkulation: archived ? undefined : () => setNachkalkOpen(true),
  };

  return (
    <PageTransition>
      <PageShell
        width="wide"
        bodyClassName="space-y-6"
        header={
          <ObjectHeader
            project={project}
            status={objectStatus}
            tab={tab}
            refreshing={refreshing}
            onRename={handleRename}
            onOffer={() => offer.trigger()}
            onEditInfo={() => setInfoOpen(true)}
            onPreview={() => setPreviewOpen(true)}
            onNachkalkulation={() => setNachkalkOpen(true)}
            onDuplicate={() => void handleDuplicate()}
            onSaveTemplate={() => void handleSaveTemplate()}
            onArchive={() => void handleArchive()}
            onRestore={() => void handleRestore()}
            onDelete={() => setDeleteOpen(true)}
          />
        }
        rail={
          // Kleiner Abstand: Die Rail klebt unter dem (höheren) Objektkopf.
          <div className="xl:pt-3">
            <EconomicsCockpit
              {...cockpitProps}
              variant="rail"
              nextStep={archived ? null : nextStep}
              onOffer={() => offer.trigger()}
            />
          </div>
        }
        railLabel="Wirtschaftlichkeit"
        railBelowLg="hidden"
        railFrom="xl"
      >
        {archived && <ArchivedBanner onRestore={handleRestore} />}

        <KpiStrip economics={econ} />
        <EconomicsCockpit {...cockpitProps} variant="compact" className="xl:hidden" />

        <Tabs value={tab} onValueChange={(v) => isWorkspaceTab(v) && goTab(v)}>
          {/* Container-Query: volle Tab-Namen erst ab 48rem Spaltenbreite, sonst Kurzlabels. */}
          <div className="@container/tabs flex items-end gap-2">
            <TabsList aria-label="Bereiche des Objekts" className="min-w-0 flex-1">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  icon={TAB_ICON[t]}
                  count={t === "reinigung" ? project.rooms.length : undefined}
                  warning={tabHasWarnings(t, econ.warnings, projectId) ? "Hinweise vorhanden" : undefined}
                >
                  <span className="hidden @3xl/tabs:inline">{WORKSPACE_TAB_LABELS[t]}</span>
                  {/* Kurzlabel bleibt Teil des Namens (WCAG 2.5.3), der volle Name folgt für Screenreader. */}
                  <span className="@3xl/tabs:hidden">
                    {WORKSPACE_TAB_SHORT_LABELS[t]}
                    {WORKSPACE_TAB_SHORT_LABELS[t] !== WORKSPACE_TAB_LABELS[t] && (
                      <span className="sr-only"> – {WORKSPACE_TAB_LABELS[t]}</span>
                    )}
                  </span>
                  {t === "reinigung" && <span className="sr-only"> Räume:</span>}
                </TabsTrigger>
              ))}
            </TabsList>
            {!archived && (
              <div className="shrink-0 border-b border-border pb-1">
                <AddServiceMenu
                  project={project}
                  cleaningVisible={isCleaningTabVisible(project, { forceCleaning })}
                  onAdd={handleAddService}
                />
              </div>
            )}
          </div>

          <TabsContent value="uebersicht">
            <OverviewTab
              project={project}
              economics={econ}
              nextStep={nextStep}
              onOffer={() => offer.trigger()}
              onOpenTab={goTab}
              onEditInfo={() => setInfoOpen(true)}
              onOpenNachkalkulation={() => setNachkalkOpen(true)}
              forceCleaning={forceCleaning}
              readOnly={archived}
            />
          </TabsContent>
          {tabs.includes("reinigung") && (
            <TabsContent value="reinigung">
              <CleaningTab
                project={project}
                economics={econ}
                readOnly={archived}
                editorRef={roomsEditorRef}
                onGateBlocked={showUpgrade}
              />
            </TabsContent>
          )}
          {tabs.includes("winterdienst") && (
            <TabsContent value="winterdienst">
              <WinterdienstTab
                project={project}
                economics={econ}
                readOnly={archived}
                onEdit={() => openEditor("winterdienst")}
                onToggleEnabled={(enabled) => void toggleWinterdienst(enabled)}
                onRemove={() => void removeWinterdienst()}
              />
            </TabsContent>
          )}
          {tabs.includes("hms") && (
            <TabsContent value="hms">
              <HmsTab
                project={project}
                economics={econ}
                readOnly={archived}
                onEdit={() => openEditor("hms")}
                onToggleEnabled={(enabled) => void toggleHms(enabled)}
                onRemove={() => void removeHms()}
              />
            </TabsContent>
          )}
        </Tabs>

        {stickyAction && (
          <StickyActionBar chrome="app" width="wide" label="Aktionen für dieses Objekt" className="md:hidden">
            <Button type="button" size="lg" className="w-full" onClick={stickyAction.onClick}>
              <stickyAction.icon aria-hidden="true" />
              {stickyAction.label}
            </Button>
          </StickyActionBar>
        )}
      </PageShell>

      {offer.element}

      <InfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        project={project}
        defaultRate={globalRate}
        onSave={handleSaveInfo}
      />
      <OfferPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} project={project} />
      <NachkalkulationSheet
        open={nachkalkOpen}
        onOpenChange={setNachkalkOpen}
        project={project}
        economics={econ}
        readOnly={archived}
      />
      {editor?.module === "winterdienst" && (
        <WinterdienstEditorSheet
          key={editor.key}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          project={project}
          economics={econ}
          initial={editor.initial}
          isNew={editor.isNew}
          onSave={(next) => saveWinterdienst(next, editor.isNew)}
        />
      )}
      {editor?.module === "hms" && (
        <HmsEditorSheet
          key={editor.key}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          project={project}
          economics={econ}
          initial={editor.initial}
          isNew={editor.isNew}
          onSave={(next) => saveHms(next, editor.isNew)}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        title="Objekt löschen?"
        description={`„${project.name || "Objekt"}“ mit allen Räumen, Leistungen und Daten wird unwiderruflich gelöscht.`}
        confirmLabel="Löschen"
        destructive
      />
      <UpgradeModal
        open={upgrade.open}
        onClose={() => setUpgrade({ open: false })}
        reason={upgrade.reason}
        triggerReason={upgrade.trigger}
      />
    </PageTransition>
  );
}
