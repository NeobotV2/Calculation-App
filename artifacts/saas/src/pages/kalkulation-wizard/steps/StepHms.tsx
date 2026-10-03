import { v4 as uuidv4 } from "uuid";
import { Plus, Sparkles } from "lucide-react";
import { HmsEditor } from "@/components/calc/HmsEditor";
import { presetTargetLabel } from "@/components/calc/hms/hms-ui";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { StateView } from "@/components/ui/state-view";
import { createDefaultHms, HMS_PRESET_FALLBACK, HMS_PRESETS_BY_OBJECT_TYPE } from "@/data/hausmeisterservice";
import type { FlowStepProps } from "../flow-steps";

/** Anzahl der Leistungen im Vorschlag der Objektart (wie createDefaultHms). */
function presetTaskCount(objectType: string | undefined): number {
  return ((objectType && HMS_PRESETS_BY_OBJECT_TYPE[objectType]) || HMS_PRESET_FALLBACK).length;
}

/** Schritt 5 · Hausmeisterservice (§7.3) mit Vorschlag der Objektart. */
export function StepHms({ draft, dispatch, econ }: FlowStepProps) {
  const hms = draft.hms;
  const objectType = draft.base.objectType.trim() || undefined;

  if (!hms) {
    return (
      <StateView
        kind="empty"
        compact
        titleAs="h3"
        title="Hausmeisterservice ist noch nicht angelegt"
        description="Legen Sie den Hausmeisterservice an und übernehmen Sie anschließend den Vorschlag für die Objektart."
        action={{
          label: "Hausmeisterservice anlegen",
          icon: Plus,
          onClick: () => dispatch({ type: "toggleModule", module: "hms", on: true }),
        }}
        className="rounded-lg border border-dashed border-border-strong bg-card"
      />
    );
  }

  const showPreset = !draft.hmsPresetApplied && hms.tasks.length === 0;
  const count = presetTaskCount(objectType);

  return (
    <div className="space-y-6">
      {showPreset && (
        <Callout
          tone="info"
          icon={Sparkles}
          title={`Vorschlag für ${presetTargetLabel(objectType)} übernehmen (${count} Leistungen)`}
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => dispatch({ type: "applyHmsPreset", tasks: createDefaultHms(objectType, uuidv4).tasks })}
            >
              Übernehmen
            </Button>
          }
        >
          Typische Leistungen mit Richtwerten für Menge, Zeit und Turnus – alle Werte bleiben anpassbar.
          {!objectType && " Wählen Sie im Schritt Objekt eine Objektart für einen passenderen Vorschlag."}
        </Callout>
      )}
      <HmsEditor
        layout="flow"
        value={hms}
        onChange={(config) => dispatch({ type: "setHms", config })}
        rates={econ.rates}
        findings={econ.moduleFindings}
        objectType={objectType}
        targetMarginPct={econ.strategy.targetMarginPct}
      />
    </div>
  );
}
