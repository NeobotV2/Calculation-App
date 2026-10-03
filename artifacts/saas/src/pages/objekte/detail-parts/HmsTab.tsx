import { useMemo } from "react";
import { HmsEditor } from "@/components/calc/HmsEditor";
import { HmsOverview } from "@/components/calc/HmsOverview";
import { HmsNachkalkulationCard } from "@/components/controlling/HmsNachkalkulationCard";
import { useEconomicsSettings } from "@/hooks/use-object-economics";
import { computeObjectEconomics, type ObjectEconomics } from "@/lib/object-economics";
import { calcHms } from "@/lib/service-modules/hms";
import type { HmsConfig } from "@/lib/service-modules/types";
import type { Project } from "@/store/use-store";
import { ModuleEditorSheet } from "./WinterdienstTab";

export interface HmsEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  economics: ObjectEconomics;
  initial: HmsConfig;
  isNew: boolean;
  onSave: (next: HmsConfig) => Promise<void>;
}

/** Hausmeisterservice bearbeiten bzw. hinzufügen (§8.3) – Editor auf lokaler Kopie. */
export function HmsEditorSheet({ open, onOpenChange, project, economics, initial, isNew, onSave }: HmsEditorSheetProps) {
  const settings = useEconomicsSettings();
  const priceAfter = useMemo(
    () => (next: HmsConfig) => computeObjectEconomics({ ...project, hms: next }, settings).totals.priceMonthly,
    [project, settings],
  );
  return (
    <ModuleEditorSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isNew ? "Hausmeisterservice hinzufügen" : "Hausmeisterservice bearbeiten"}
      description={
        isNew ? "Vorschlag passend zur Objektart – übernehmen, anpassen oder eigene Leistungen ergänzen." : undefined
      }
      initial={initial}
      isNew={isNew}
      priceBefore={economics.totals.priceMonthly}
      priceAfter={priceAfter}
      onSave={onSave}
    >
      {(draft, setDraft) => (
        <DraftHmsEditor project={project} economics={economics} draft={draft} onChange={setDraft} />
      )}
    </ModuleEditorSheet>
  );
}

/** Befunde zum Entwurf (nicht zum gespeicherten Stand). */
function DraftHmsEditor({
  project,
  economics,
  draft,
  onChange,
}: {
  project: Project;
  economics: ObjectEconomics;
  draft: HmsConfig;
  onChange: (next: HmsConfig) => void;
}) {
  const settings = useEconomicsSettings();
  const findings = useMemo(
    () => computeObjectEconomics({ ...project, hms: { ...draft, enabled: true } }, settings).moduleFindings,
    [project, draft, settings],
  );
  return (
    <HmsEditor
      value={draft}
      onChange={onChange}
      rates={economics.rates}
      findings={findings}
      objectType={project.objectType}
      layout="sheet"
      targetMarginPct={economics.strategy.targetMarginPct}
    />
  );
}

export interface HmsTabProps {
  project: Project;
  economics: ObjectEconomics;
  readOnly?: boolean;
  /** Öffnet den Editor (Sheet auf Seitenebene). */
  onEdit: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onRemove: () => void;
}

/** Tab „Hausmeisterservice“ (§8.3): Übersicht des Moduls und Nachkalkulation des Jahres. */
export function HmsTab({ project, economics, readOnly = false, onEdit, onToggleEnabled, onRemove }: HmsTabProps) {
  const config = project.hms;
  const { rates, totals, moduleFindings, strategy } = economics;
  const result = useMemo(() => (config ? totals.hms ?? calcHms(config, rates) : null), [config, totals.hms, rates]);
  if (!config || !result) return null;
  return (
    <div className="space-y-6">
      <HmsOverview
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
      <HmsNachkalkulationCard project={project} result={result} readOnly={readOnly} targetMarginPct={strategy.targetMarginPct} />
    </div>
  );
}
