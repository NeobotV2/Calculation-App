import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { CircleCheck, Crown, WifiOff } from "lucide-react";
import { useStore, type Project, type Template } from "@/store/use-store";
import { useEconomicsSettings } from "@/hooks/use-object-economics";
import { useInitialLoading, useSyncStatus } from "@/hooks/use-sync-status";
import { PageContainer } from "@/components/layout/PageContainer";
import { OFFLINE_MESSAGE, useCloudOffline } from "@/components/layout/SyncBanner";
import { TemplatePicker } from "@/components/calc/TemplatePicker";
import { useOfferAction } from "@/components/offer/use-offer-action";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { StateView } from "@/components/ui/state-view";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DetailSkeleton } from "@/components/list-skeleton";
import { UpgradeModal } from "@/components/upgrade-modal";
import type { UpgradeTrigger } from "@/lib/billing-config";
import { canAddProject, canUseTemplates, type GateResult } from "@/lib/feature-gates";
import { draftToProject, isCalcDraftEmpty, type CalcDraft } from "@/lib/drafts";
import { computeObjectEconomics } from "@/lib/object-economics";
import { buildOfferPositions } from "@/lib/offer-positions";
import { getOfferReadiness, type CompanyInfo, type FlowStepId } from "@/lib/offer-readiness";
import { strategyLabel, strategyTone, type Tone } from "@/lib/status";
import {
  FLOW_STEP_LABELS,
  adjacentStep,
  canSelectStep,
  formatDraftTime,
  isFlowStepId,
  isStepVisible,
  resolveStep,
  shouldReopenSavedFlow,
  stepBlock,
  stepStatus,
  type FlowMode,
} from "./kalkulation-wizard/flow-state";
import { getFlowStep } from "./kalkulation-wizard/flow-steps";
import { useFlowDraft } from "./kalkulation-wizard/use-flow-draft";
import { useFlowSave } from "./kalkulation-wizard/use-flow-save";
import { FlowHeader } from "./kalkulation-wizard/FlowHeader";
import { FlowStepper, FlowStepperCompact } from "./kalkulation-wizard/FlowStepper";
import { FlowFooter, type FlowSavingKind } from "./kalkulation-wizard/FlowFooter";
import { LiveSummary } from "./kalkulation-wizard/LiveSummary";

/* ── Fokus-Helfer ─────────────────────────────────────────────────────── */

const FIELDS = "input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
const FOCUSABLE = `${FIELDS}, button:not([disabled])`;

/** Fokussiert #id (bzw. das erste Eingabefeld darin) und scrollt es in den Blick. */
function focusFieldById(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const target = el.matches(FOCUSABLE)
    ? el
    : (el.querySelector<HTMLElement>(FIELDS) ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el);
  target.focus({ preventScroll: true });
  el.scrollIntoView({ block: "center" });
  return true;
}

/** Fokussiert die sichtbare Schrittüberschrift (Desktop bzw. kompakter Stepper). */
function focusStepTitle() {
  const titles = Array.from(document.querySelectorAll<HTMLElement>("[data-step-title]"));
  const visible = titles.find((t) => t.getClientRects().length > 0);
  window.scrollTo({ top: 0 });
  visible?.focus({ preventScroll: true });
}

function useCompanyInfo(): CompanyInfo {
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  return useMemo(
    () => ({ companyName, companyStreet, companyZip, companyCity }),
    [companyName, companyStreet, companyZip, companyCity],
  );
}

interface UpgradeState {
  open: boolean;
  reason?: string;
  trigger?: UpgradeTrigger;
}

/* ── Rahmen für Zustände ohne Entwurf ─────────────────────────────────── */

function FlowStateFrame({ mode, onClose, children }: { mode: FlowMode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <FlowHeader mode={mode} name="" savedAt={null} onClose={onClose} />
      <main id="main" className="flex-1">
        <PageContainer width="narrow" className="pt-6 pb-safe">
          {children}
        </PageContainer>
      </main>
    </div>
  );
}

/* ── Flow ─────────────────────────────────────────────────────────────── */

interface FlowEditorProps {
  mode: FlowMode;
  /** Bearbeiten: gespeichertes Objekt. */
  project?: Project;
  /** Schritt aus der URL. */
  stepParam?: string;
  /** "neu" oder die Objekt-ID (Pfadsegment). */
  routeId: string;
  /** Flow mit dem gespeicherten Objekt neu öffnen (nach „Speichern & Angebot öffnen“ → „Beheben“). */
  onReopen: () => void;
}

function FlowEditor({ mode, project, stepParam, routeId, onReopen }: FlowEditorProps) {
  const [, navigate] = useLocation();
  const settings = useEconomicsSettings();
  const company = useCompanyInfo();
  const offline = useCloudOffline();
  const plan = useStore((s) => s.plan);
  const templatesAllowed = useMemo(() => canUseTemplates().allowed, [plan]);

  // Startschritt aus der URL (einmalig, mit Schrittstatus des Startentwurfs).
  const resolveInitial = useCallback(
    (d: CalcDraft) => resolveStep(stepParam, d, computeObjectEconomics(draftToProject(d), settings)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const flow = useFlowDraft({ mode, project, resolveStep: resolveInitial });
  const { draft, dispatch } = flow;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  /* ── Live-Berechnung (§6.1) ── */
  const tempProject = useMemo(
    () => draftToProject(draft, { id: draft.editingId ?? "flow-draft", createdAt: project?.createdAt }),
    [draft, project?.createdAt],
  );
  const econ = useMemo(() => computeObjectEconomics(tempProject, settings), [tempProject, settings]);
  const positions = useMemo(() => buildOfferPositions(tempProject, econ.totals, econ.effectiveRate), [tempProject, econ]);
  const readiness = useMemo(() => getOfferReadiness(tempProject, econ, company), [tempProject, econ, company]);
  const steps = useMemo(() => stepStatus(draft, econ), [draft, econ]);
  const current = draft.stepId;
  const stepDef = getFlowStep(current);
  const StepComponent = stepDef.Component;
  const isFirst = steps[0]?.id === current;
  const isLast = steps[steps.length - 1]?.id === current;

  /* ── Overlays ── */
  const [upgrade, setUpgrade] = useState<UpgradeState>({ open: false });
  const openUpgrade = useCallback(
    (gate: GateResult) => setUpgrade({ open: true, reason: gate.reason, trigger: gate.trigger }),
    [],
  );
  const [templateOpen, setTemplateOpen] = useState(false);
  const openTemplatePicker = useCallback(() => {
    const gate = canUseTemplates();
    if (!gate.allowed) {
      openUpgrade(gate);
      return;
    }
    setTemplateOpen(true);
  }, [openUpgrade]);
  const pickTemplate = useCallback(
    (t: Template) => {
      const rooms = t.rooms.map((r) => ({ ...r, id: uuidv4() }));
      dispatch({ type: "addRooms", rooms, template: { name: t.name } });
      toast.success(`Vorlage „${t.name}“ geladen (${rooms.length} ${rooms.length === 1 ? "Raum" : "Räume"})`);
    },
    [dispatch],
  );

  /* ── Navigation zwischen Schritten ── */
  const [attempted, setAttempted] = useState<ReadonlySet<FlowStepId>>(() => new Set());
  const markAttempted = useCallback((step: FlowStepId) => {
    setAttempted((prev) => (prev.has(step) ? prev : new Set(prev).add(step)));
  }, []);
  const pendingFocusRef = useRef<{ field?: string } | null>(null);

  const goTo = useCallback(
    (step: FlowStepId, opts?: { focusField?: string }) => {
      const target = isStepVisible(step, draftRef.current) ? step : "leistungen";
      if (target === draftRef.current.stepId) {
        if (opts?.focusField) requestAnimationFrame(() => focusFieldById(opts.focusField!));
        return;
      }
      pendingFocusRef.current = { field: opts?.focusField };
      dispatch({ type: "goToStep", step: target });
    },
    [dispatch],
  );

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    const raf = requestAnimationFrame(() => {
      if (pending.field && focusFieldById(pending.field)) return;
      focusStepTitle();
    });
    return () => cancelAnimationFrame(raf);
  }, [current]);

  // URL ⇄ Schritt: Schrittwechsel ersetzen die URL; geänderte URL (z. B. „Beheben“-Link) wechselt den Schritt.
  const prevRef = useRef({ param: stepParam, step: current });
  useEffect(() => {
    const prev = prevRef.current;
    const paramChanged = prev.param !== stepParam;
    prevRef.current = { param: stepParam, step: current };
    if (stepParam === current) return;
    if (paramChanged && isFlowStepId(stepParam) && isStepVisible(stepParam, draftRef.current)) {
      pendingFocusRef.current = {};
      dispatch({ type: "goToStep", step: stepParam });
      return;
    }
    navigate(`/kalkulation/${routeId}/${current}`, { replace: true });
  }, [stepParam, current, routeId, navigate, dispatch]);

  const goNext = () => {
    const block = stepBlock(current, draft);
    if (block) {
      markAttempted(current);
      requestAnimationFrame(() => focusFieldById(block === "name_missing" ? "name" : "leistungen"));
      return;
    }
    const next = adjacentStep(draft, current, 1);
    if (next) goTo(next);
  };
  const goBack = () => {
    const prev = adjacentStep(draft, current, -1);
    if (prev) goTo(prev);
  };

  /* ── Speichern (§6.5) ── */
  const save = useFlowSave({ draft, mode, onGateBlocked: openUpgrade, onSaved: flow.close });
  const offer = useOfferAction(undefined);
  const [savedId, setSavedId] = useState<string | null>(null);
  /** URL-Schritt beim Speichern; ein späterer Wechsel (z. B. „Beheben“) öffnet den Flow neu. */
  const savedStepParamRef = useRef<string | undefined>(undefined);
  const [savingKind, setSavingKind] = useState<FlowSavingKind>(null);

  const nameMissing = draft.base.name.trim() === "";
  const saveBlockers = mode === "create" ? readiness.blockers : readiness.blockers.filter((b) => b.id === "name_missing");
  const saveHint = offline
    ? OFFLINE_MESSAGE
    : saveBlockers.length > 0
      ? `Bitte beheben Sie zuerst: ${saveBlockers.map((b) => b.title).join(", ")}.`
      : null;

  const runSave = async (withOffer: boolean) => {
    if (offline || save.saving) return;
    if (nameMissing) {
      markAttempted("objekt");
      goTo("objekt", { focusField: "name" });
      return;
    }
    if (saveBlockers.length > 0) {
      goTo("pruefen");
      return;
    }
    setSavingKind(withOffer ? "offer" : "save");
    const id = await save.save({ navigate: !withOffer });
    setSavingKind(null);
    if (id && withOffer) {
      savedStepParamRef.current = stepParam;
      setSavedId(id);
      const saved = useStore.getState().projects.find((p) => p.id === id) ?? draftToProject(draft, { id });
      offer.trigger(saved);
    }
  };

  // Bearbeiten: „Beheben“ im Angebots-Check bleibt auf derselben Objekt-Route und
  // wechselt nur den Schritt — dann den gespeicherten Rahmen verlassen und den Flow
  // mit dem frisch gespeicherten Objekt im Ziel-Schritt neu öffnen.
  useEffect(() => {
    if (shouldReopenSavedFlow(mode, savedId, savedStepParamRef.current, stepParam)) onReopen();
  }, [mode, savedId, stepParam, onReopen]);

  /* ── Schließen ── */
  const [leaveOpen, setLeaveOpen] = useState(false);
  const closeTarget = savedId
    ? `/objekte/${savedId}`
    : mode === "create"
      ? "/objekte"
      : `/objekte/${draft.editingId ?? routeId}`;
  const needsLeaveConfirm = !savedId && (flow.isDirty || (mode === "create" && !isCalcDraftEmpty(draft)));
  const handleClose = () => {
    if (needsLeaveConfirm) setLeaveOpen(true);
    else navigate(closeTarget);
  };

  /* ── Zusammenfassung ── */
  const hasPrice = econ.totals.priceMonthly > 0;
  const footerStatus: { tone: Tone; label: string } = hasPrice
    ? { tone: strategyTone(econ.strategy.status), label: strategyLabel(econ.strategy.status) }
    : { tone: "neutral", label: "Noch kein Preis" };
  const reviewHints = useCallback(() => goTo("pruefen"), [goTo]);

  const titleId = React.useId();

  /* ── Gespeichert, Angebot noch nicht bereit ── */
  if (savedId) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <FlowHeader mode={mode} name={draft.base.name} savedAt={null} onClose={() => navigate(closeTarget)} />
        <main id="main" className="flex-1">
          <PageContainer width="narrow" className="pt-6 pb-safe">
            <StateView
              kind="empty"
              icon={CircleCheck}
              title={mode === "create" ? "Objekt gespeichert" : "Änderungen gespeichert"}
              description="Für das Angebot sind noch Punkte offen. Prüfen Sie diese im Angebots-Check oder öffnen Sie das Objekt."
              action={{ label: "Angebot prüfen", onClick: () => offer.trigger(savedId) }}
              secondaryAction={{ label: "Zum Objekt", href: `/objekte/${savedId}` }}
            />
          </PageContainer>
        </main>
        {offer.element}
      </div>
    );
  }

  const stepProps = {
    mode,
    draft,
    dispatch,
    tempProject,
    econ,
    readiness,
    positions,
    settings,
    existing: project,
    showValidation: attempted.has(current),
    goToStep: goTo,
    openUpgrade,
    openTemplatePicker,
    templatesAllowed,
  };

  const banner = flow.banner;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <FlowHeader
        mode={mode}
        name={draft.base.name || project?.name || ""}
        savedAt={flow.savedAt}
        saving={save.saving}
        onSave={mode === "edit" ? () => void runSave(false) : undefined}
        saveDisabled={offline}
        saveDisabledReason={offline ? OFFLINE_MESSAGE : undefined}
        onClose={handleClose}
      />

      <PageContainer width="wide" className="flex-1">
        <div className="pt-4 pb-8 md:pt-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)_20rem] lg:gap-8">
          <aside className="hidden lg:block" aria-label="Fortschritt">
            <div className="sticky top-[calc(var(--safe-top)+5rem)] -m-1 max-h-[calc(100dvh-var(--safe-top)-11rem)] overflow-y-auto overscroll-contain p-1">
              <FlowStepper
                steps={steps}
                current={current}
                canSelect={(s) => canSelectStep(s, draft, mode)}
                onSelect={goTo}
              />
            </div>
          </aside>

          <main id="main" className="min-w-0">
            <div className="mx-auto max-w-3xl space-y-6">
              <FlowStepperCompact
                className="lg:hidden"
                steps={steps}
                current={current}
                canSelect={(s) => canSelectStep(s, draft, mode)}
                onSelect={goTo}
              />
              <div className="hidden space-y-1 lg:block">
                <h2 id={titleId} data-step-title tabIndex={-1} className="text-h2 text-foreground outline-none">
                  {FLOW_STEP_LABELS[current]}
                </h2>
                <p className="text-sm text-muted-foreground">{stepDef.description}</p>
              </div>
              <p className="text-sm text-muted-foreground lg:hidden">{stepDef.description}</p>

              {/* Fokus-Modus ohne AppShell/SyncBanner: Offline-Hinweis hier, auf jedem Schritt (§11). */}
              {offline && (
                <Callout tone="warning" icon={WifiOff} live>
                  {OFFLINE_MESSAGE}
                </Callout>
              )}
              {banner?.kind === "resumed" && (
                <Callout
                  tone="info"
                  title={`Entwurf vom ${formatDraftTime(banner.savedAt)} fortgesetzt`}
                  action={
                    <Button type="button" variant="secondary" size="sm" onClick={flow.startOver}>
                      Neu beginnen
                    </Button>
                  }
                >
                  Ihre Eingaben wurden automatisch gesichert.
                </Callout>
              )}
              {banner?.kind === "restore" && (
                <Callout
                  tone="info"
                  title={`Ungespeicherte Änderungen vom ${formatDraftTime(banner.savedAt)} gefunden`}
                  action={
                    <>
                      <Button type="button" size="sm" onClick={flow.restore}>
                        Wiederherstellen
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={flow.dismissStored}>
                        Verwerfen
                      </Button>
                    </>
                  }
                >
                  {banner.conflict
                    ? "Das Objekt wurde seitdem geändert. Beim Wiederherstellen werden nur Ihre damaligen Änderungen übernommen – neuere Änderungen am Objekt bleiben erhalten."
                    : "Diese Änderungen sind noch nicht im Objekt gespeichert."}
                </Callout>
              )}
              {flow.storedConflict && (
                <Callout
                  tone="warning"
                  live
                  title="Vorhandenen Entwurf ersetzen?"
                  action={
                    <>
                      <Button type="button" size="sm" onClick={flow.replaceStored}>
                        Entwurf ersetzen
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={flow.keepStored}>
                        Vorhandenen behalten
                      </Button>
                    </>
                  }
                >
                  Es gibt bereits einen nicht abgeschlossenen Entwurf ({flow.storedConflict.name}, gesichert am{" "}
                  {formatDraftTime(flow.storedConflict.savedAt)}). Es kann nur ein Entwurf automatisch gesichert werden – Ihre
                  Änderungen hier werden erst nach Ihrer Entscheidung gesichert.
                </Callout>
              )}
              {save.error && (
                <Callout
                  tone="critical"
                  live
                  title={`Speichern fehlgeschlagen: ${save.error}`}
                  action={
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={save.saving}
                      disabled={offline}
                      onClick={() => void save.retry()}
                    >
                      Erneut versuchen
                    </Button>
                  }
                >
                  Ihr Entwurf bleibt erhalten.
                </Callout>
              )}

              <StepComponent {...stepProps} />
            </div>
          </main>

          {/* Höhe begrenzt: Kopf (5rem) + fixierte Fußleiste (≤ 6rem) dürfen nichts verdecken (WCAG 2.4.11). */}
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--safe-top)+5rem)] max-h-[calc(100dvh-var(--safe-top)-11rem)] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-4 shadow-surface">
              <LiveSummary draft={draft} econ={econ} readiness={readiness} onReviewHints={current === "pruefen" ? undefined : reviewHints} />
            </div>
          </aside>
        </div>
      </PageContainer>

      <FlowFooter
        mode={mode}
        isFirst={isFirst}
        isLast={isLast}
        onBack={goBack}
        onNext={goNext}
        onSave={() => void runSave(false)}
        onSaveAndOffer={() => void runSave(true)}
        savingKind={savingKind}
        saveDisabled={offline || saveBlockers.length > 0}
        saveHint={saveHint}
        priceMonthly={econ.totals.priceMonthly}
        status={footerStatus}
        details={(close) => (
          <LiveSummary
            heading={null}
            draft={draft}
            econ={econ}
            readiness={readiness}
            onReviewHints={
              current === "pruefen"
                ? undefined
                : () => {
                    close();
                    reviewHints();
                  }
            }
          />
        )}
      />

      <TemplatePicker open={templateOpen} onOpenChange={setTemplateOpen} onPick={pickTemplate} />
      <UpgradeModal
        open={upgrade.open}
        onClose={() => setUpgrade((u) => ({ ...u, open: false }))}
        reason={upgrade.reason}
        triggerReason={upgrade.trigger}
      />
      {flow.autosaveBlocked ? (
        <ConfirmDialog
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          onConfirm={() => {
            flow.discard();
            navigate(closeTarget);
          }}
          title="Kalkulation verlassen?"
          description="Ihre Änderungen sind nicht gesichert, weil bereits ein anderer Entwurf gespeichert ist. Beim Verlassen gehen sie verloren – oder Sie ersetzen den vorhandenen Entwurf."
          confirmLabel="Änderungen verwerfen"
          destructive
          cancelLabel="Weiter bearbeiten"
          secondaryLabel="Entwurf ersetzen"
          onSecondary={() => {
            flow.replaceStored();
            navigate(closeTarget);
          }}
        />
      ) : (
        <ConfirmDialog
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          onConfirm={() => {
            flow.flush();
            navigate(closeTarget);
          }}
          title="Kalkulation verlassen?"
          description="Ihr Entwurf bleibt gespeichert."
          confirmLabel="Entwurf behalten"
          cancelLabel="Weiter bearbeiten"
          secondaryLabel="Entwurf verwerfen"
          onSecondary={() => {
            flow.discard();
            navigate(closeTarget);
          }}
        />
      )}
      {offer.element}
    </div>
  );
}

/* ── Route ────────────────────────────────────────────────────────────── */

/**
 * Einheitlicher Kalkulations-Flow „Neue Kalkulation“ / „Kalkulation
 * bearbeiten“ (UX §6). Route `/kalkulation/:id/:schritt?`, id „neu“ = Neuanlage.
 */
export default function KalkulationWizard() {
  const [, params] = useRoute<{ id: string; schritt?: string }>("/kalkulation/:id/:schritt?");
  const [, navigate] = useLocation();
  const routeId = params?.id ?? "neu";
  const stepParam = params?.schritt;
  const isCreate = routeId === "neu";
  const project = useStore((s) => (isCreate ? undefined : s.projects.find((p) => p.id === routeId)));
  // Bleibt nach einem kurzzeitigen Verschwinden (Cloud-Reload) erhalten.
  const lastProjectRef = useRef<Project | undefined>(project);
  if (project) lastProjectRef.current = project;
  const existing = project ?? lastProjectRef.current;

  const { hasLoadedOnce } = useSyncStatus();
  const showSkeleton = useInitialLoading();
  const [entryGate] = useState<GateResult>(() => (isCreate ? canAddProject() : { allowed: true }));
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // Erhöht ⇒ FlowEditor startet neu (frischer Entwurf aus dem gespeicherten Objekt).
  const [flowEpoch, setFlowEpoch] = useState(0);
  const reopenFlow = useCallback(() => setFlowEpoch((n) => n + 1), []);

  if (isCreate && !entryGate.allowed) {
    return (
      <FlowStateFrame mode="create" onClose={() => navigate("/objekte")}>
        <StateView
          kind="empty"
          icon={Crown}
          title="Objektlimit erreicht"
          description={entryGate.reason}
          action={{ label: "Upgrade", icon: Crown, onClick: () => setUpgradeOpen(true) }}
          secondaryAction={{ label: "Zu den Objekten", href: "/objekte" }}
        />
        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          reason={entryGate.reason}
          triggerReason={entryGate.trigger}
        />
      </FlowStateFrame>
    );
  }

  if (!isCreate && !existing) {
    return (
      <FlowStateFrame mode="edit" onClose={() => navigate("/objekte")}>
        {!hasLoadedOnce ? (
          showSkeleton ? <DetailSkeleton /> : <span className="sr-only" role="status">Wird geladen…</span>
        ) : (
          <StateView
            kind="not-found"
            title="Objekt nicht gefunden – möglicherweise gelöscht"
            description="Das Objekt ist nicht (mehr) vorhanden. Wählen Sie ein anderes Objekt aus der Liste."
            action={{ label: "Zur Objektliste", href: "/objekte" }}
          />
        )}
      </FlowStateFrame>
    );
  }

  return (
    <FlowEditor
      key={`${routeId}:${flowEpoch}`}
      mode={isCreate ? "create" : "edit"}
      project={existing}
      stepParam={stepParam}
      routeId={routeId}
      onReopen={reopenFlow}
    />
  );
}
