import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ResponsiveSheet, ResponsiveSheetCancel } from "@/components/ui/responsive-sheet";
import { WinterdienstEditor } from "@/components/calc/WinterdienstEditor";
import { WinterdienstOverview } from "@/components/calc/WinterdienstOverview";
import { WinterNachkalkulationCard } from "@/components/controlling/WinterNachkalkulationCard";
import { useEconomicsSettings } from "@/hooks/use-object-economics";
import { computeObjectEconomics, type ObjectEconomics } from "@/lib/object-economics";
import { calcWinterdienst } from "@/lib/service-modules/winterdienst";
import type { WinterdienstConfig } from "@/lib/service-modules/types";
import type { Project } from "@/store/use-store";
import { MonthlyPriceChange } from "./MonthlyPriceChange";

/* ── Gemeinsamer Rahmen für Modul-Editoren (Winterdienst, Hausmeisterservice) ── */

export interface ModuleEditorSheetProps<T extends { enabled: boolean }> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Ausgangskonfiguration (gespeichert oder Vorbelegung bei `isNew`). */
  initial: T;
  /** Neues Modul: Speichern schreibt `enabled: true`. */
  isNew: boolean;
  /** Aktueller Monatspreis netto (vor der Änderung). */
  priceBefore: number;
  /** Monatspreis netto mit dem Entwurf (so, wie er gespeichert würde). */
  priceAfter: (next: T) => number;
  onSave: (next: T) => Promise<void>;
  /** Editor auf der lokalen Kopie. */
  children: (draft: T, setDraft: (next: T) => void) => ReactNode;
}

/**
 * Editor-Sheet (`ResponsiveSheet size="lg"`) auf einer lokalen Kopie: Änderungen
 * werden erst mit [Speichern] übernommen; Schließen mit Änderungen fragt nach.
 * Der Aufrufer vergibt bei jedem Öffnen einen neuen `key` (frische Kopie).
 */
export function ModuleEditorSheet<T extends { enabled: boolean }>({
  open,
  onOpenChange,
  title,
  description,
  initial,
  isNew,
  priceBefore,
  priceAfter,
  onSave,
  children,
}: ModuleEditorSheetProps<T>) {
  const [draft, setDraft] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toSave = useMemo<T>(() => (isNew ? { ...draft, enabled: true } : draft), [draft, isNew]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const after = useMemo(() => priceAfter(toSave), [priceAfter, toSave]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(toSave);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die Änderungen konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o);
      }}
      title={title}
      description={description}
      size="lg"
      dirty={dirty}
      footer={
        <>
          <ResponsiveSheetCancel disabled={saving} />
          <Button type="button" onClick={() => void save()} loading={saving}>
            Speichern
          </Button>
          <MonthlyPriceChange before={priceBefore} after={after} />
        </>
      }
      bodyClassName="space-y-4"
    >
      {error && (
        <Callout tone="critical" live title="Speichern fehlgeschlagen">
          {error}
        </Callout>
      )}
      {children(draft, setDraft)}
    </ResponsiveSheet>
  );
}

/* ── Winterdienst ─────────────────────────────────────────────────────── */

export interface WinterdienstEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  economics: ObjectEconomics;
  initial: WinterdienstConfig;
  isNew: boolean;
  onSave: (next: WinterdienstConfig) => Promise<void>;
}

/** Winterdienst bearbeiten bzw. hinzufügen (§8.3) – Editor auf lokaler Kopie. */
export function WinterdienstEditorSheet({
  open,
  onOpenChange,
  project,
  economics,
  initial,
  isNew,
  onSave,
}: WinterdienstEditorSheetProps) {
  const settings = useEconomicsSettings();
  const priceAfter = useMemo(
    () => (next: WinterdienstConfig) => computeObjectEconomics({ ...project, winterdienst: next }, settings).totals.priceMonthly,
    [project, settings],
  );
  return (
    <ModuleEditorSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isNew ? "Winterdienst hinzufügen" : "Winterdienst bearbeiten"}
      description={isNew ? "Vorbelegt mit Richtwerten Ihrer Region – passen Sie Flächen und Preise an." : undefined}
      initial={initial}
      isNew={isNew}
      priceBefore={economics.totals.priceMonthly}
      priceAfter={priceAfter}
      onSave={onSave}
    >
      {(draft, setDraft) => (
        <DraftWinterdienstEditor project={project} economics={economics} draft={draft} onChange={setDraft} />
      )}
    </ModuleEditorSheet>
  );
}

/** Befunde zum Entwurf (nicht zum gespeicherten Stand), damit Hinweise live reagieren. */
function DraftWinterdienstEditor({
  project,
  economics,
  draft,
  onChange,
}: {
  project: Project;
  economics: ObjectEconomics;
  draft: WinterdienstConfig;
  onChange: (next: WinterdienstConfig) => void;
}) {
  const settings = useEconomicsSettings();
  const findings = useMemo(
    () => computeObjectEconomics({ ...project, winterdienst: { ...draft, enabled: true } }, settings).moduleFindings,
    [project, draft, settings],
  );
  return (
    <WinterdienstEditor
      value={draft}
      onChange={onChange}
      rates={economics.rates}
      findings={findings}
      layout="sheet"
      targetMarginPct={economics.strategy.targetMarginPct}
    />
  );
}

/* ── Tab ──────────────────────────────────────────────────────────────── */

export interface WinterdienstTabProps {
  project: Project;
  economics: ObjectEconomics;
  readOnly?: boolean;
  /** Öffnet den Editor (Sheet auf Seitenebene). */
  onEdit: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onRemove: () => void;
}

/** Tab „Winterdienst“ (§8.3): Übersicht des Moduls und Nachkalkulation der Saison. */
export function WinterdienstTab({ project, economics, readOnly = false, onEdit, onToggleEnabled, onRemove }: WinterdienstTabProps) {
  const config = project.winterdienst;
  const { rates, totals, moduleFindings, strategy } = economics;
  const result = useMemo(
    () => (config ? totals.winterdienst ?? calcWinterdienst(config, rates) : null),
    [config, totals.winterdienst, rates],
  );
  if (!config || !result) return null;
  return (
    <div className="space-y-6">
      <WinterdienstOverview
        project={project}
        config={config}
        result={result}
        findings={moduleFindings}
        rates={rates}
        targetMarginPct={strategy.targetMarginPct}
        readOnly={readOnly}
        onEdit={readOnly ? undefined : onEdit}
        onToggleEnabled={readOnly ? undefined : onToggleEnabled}
        onRemove={readOnly ? undefined : onRemove}
      />
      <WinterNachkalkulationCard
        project={project}
        result={result}
        readOnly={readOnly}
        targetMarginPct={strategy.targetMarginPct}
      />
    </div>
  );
}
