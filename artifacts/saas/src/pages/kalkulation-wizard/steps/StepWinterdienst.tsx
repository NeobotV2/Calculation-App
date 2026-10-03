import { Plus } from "lucide-react";
import { WinterdienstEditor } from "@/components/calc/WinterdienstEditor";
import { StateView } from "@/components/ui/state-view";
import type { FlowStepProps } from "../flow-steps";

/** Schritt 4 · Winterdienst (§7.2). Befunde kommen ungefiltert aus econ.moduleFindings. */
export function StepWinterdienst({ draft, dispatch, econ }: FlowStepProps) {
  if (!draft.winterdienst) {
    return (
      <StateView
        kind="empty"
        compact
        titleAs="h3"
        title="Winterdienst ist noch nicht angelegt"
        description="Legen Sie den Winterdienst mit Richtwerten für die Region Flachland an."
        action={{
          label: "Winterdienst anlegen",
          icon: Plus,
          onClick: () => dispatch({ type: "toggleModule", module: "winterdienst", on: true }),
        }}
        className="rounded-lg border border-dashed border-border-strong bg-card"
      />
    );
  }
  return (
    <WinterdienstEditor
      layout="flow"
      value={draft.winterdienst}
      onChange={(config) => dispatch({ type: "setWinterdienst", config })}
      rates={econ.rates}
      findings={econ.moduleFindings}
      targetMarginPct={econ.strategy.targetMarginPct}
    />
  );
}
