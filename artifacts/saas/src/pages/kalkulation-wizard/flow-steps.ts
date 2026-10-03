/* ─────────────────────────────────────────────────────────────────────────
   Schritt-Registry des Kalkulations-Flows (UX §6.2). Sichtbarkeit und
   Vollständigkeit kommen aus flow-state.ts (rein, getestet).
   ───────────────────────────────────────────────────────────────────────── */
import type { ComponentType, Dispatch } from "react";
import type { Project } from "@/store/use-store";
import type { CalcDraft } from "@/lib/drafts";
import type { EconomicsSettings, ObjectEconomics } from "@/lib/object-economics";
import type { FlowStepId, OfferReadiness } from "@/lib/offer-readiness";
import type { OfferPositionGroup } from "@/lib/offer-positions";
import type { GateResult } from "@/lib/feature-gates";
import {
  FLOW_STEP_LABELS,
  isStepVisible,
  stepCompletion,
  type FlowAction,
  type FlowMode,
  type StepEconomics,
} from "./flow-state";
import { StepLeistungen } from "./steps/StepLeistungen";
import { StepObjekt } from "./steps/StepObjekt";
import { StepRaeume } from "./steps/StepRaeume";
import { StepWinterdienst } from "./steps/StepWinterdienst";
import { StepHms } from "./steps/StepHms";
import { StepPreis } from "./steps/StepPreis";
import { StepPruefen } from "./steps/StepPruefen";

/** Props, die jeder Schritt vom Flow erhält. */
export interface FlowStepProps {
  mode: FlowMode;
  draft: CalcDraft;
  dispatch: Dispatch<FlowAction>;
  /** Projekt-Sicht des Entwurfs (draftToProject). */
  tempProject: Project;
  econ: ObjectEconomics;
  readiness: OfferReadiness;
  positions: OfferPositionGroup[];
  settings: EconomicsSettings;
  /** Bearbeiten: gespeicherter Stand des Objekts. */
  existing?: Project;
  /** „Weiter“ wurde in diesem Schritt versucht ⇒ Pflichtfehler anzeigen. */
  showValidation: boolean;
  /** Zu einem Schritt wechseln und optional ein Feld (#id) fokussieren. */
  goToStep: (step: FlowStepId, opts?: { focusField?: string }) => void;
  /** Plan-Gate gesperrt ⇒ UpgradeModal. */
  openUpgrade: (gate: GateResult) => void;
  /** Vorlage wählen (inkl. canUseTemplates-Gate). */
  openTemplatePicker: () => void;
  /** Vorlagen sind im Plan enthalten (sonst Pro-Hinweis). */
  templatesAllowed: boolean;
}

export interface FlowStepDef {
  id: FlowStepId;
  label: string;
  /** Einleitungssatz unter der Schrittüberschrift. */
  description: string;
  isVisible: (draft: CalcDraft) => boolean;
  /** null = ohne Vollständigkeitsregel (Prüfen & Abschließen). */
  isComplete: (draft: CalcDraft, econ: StepEconomics) => boolean | null;
  Component: ComponentType<FlowStepProps>;
}

const complete = (id: FlowStepId) => (draft: CalcDraft, econ: StepEconomics) => {
  const c = stepCompletion(id, draft, econ);
  return c === "none" ? null : c === "complete";
};

function def(id: FlowStepId, description: string, Component: ComponentType<FlowStepProps>): FlowStepDef {
  return {
    id,
    label: FLOW_STEP_LABELS[id],
    description,
    isVisible: (draft) => isStepVisible(id, draft),
    isComplete: complete(id),
    Component,
  };
}

export const FLOW_STEPS: readonly FlowStepDef[] = [
  def("leistungen", "Wählen Sie die Leistungen, die Sie für dieses Objekt kalkulieren.", StepLeistungen),
  def("objekt", "Erfassen Sie die Grunddaten des Objekts.", StepObjekt),
  def("raeume", "Erfassen Sie Räume mit Raumart, Fläche und Turnus sowie Rüst- und Wegezeit.", StepRaeume),
  def("winterdienst", "Flächen, Saison, Streugut und Abrechnung des Winterdienstes.", StepWinterdienst),
  def("hms", "Leistungen, Turnus und Einstellungen des Hausmeisterservice.", StepHms),
  def("preis", "Verrechnungssatz, Kosten und Marge im Überblick.", StepPreis),
  def("pruefen", "Prüfen Sie Preis, offene Punkte und Positionen und speichern Sie die Kalkulation.", StepPruefen),
];

const BY_ID = new Map(FLOW_STEPS.map((s) => [s.id, s]));

export function getFlowStep(id: FlowStepId): FlowStepDef {
  return BY_ID.get(id) ?? FLOW_STEPS[0];
}
