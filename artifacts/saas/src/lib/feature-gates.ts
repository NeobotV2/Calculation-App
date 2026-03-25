import { useStore } from "@/store/use-store";
import { type PlanId, type UpgradeTrigger, getPlanLimits, isPaidPlan } from "@/lib/billing-config";

export interface GateResult {
  allowed: boolean;
  reason?: string;
  trigger?: UpgradeTrigger;
}

function getPlan(): PlanId {
  return useStore.getState().plan;
}

export function canAddProject(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  const limits = getPlanLimits(plan);
  const { projects } = useStore.getState();
  const activeCount = projects.filter(p => p.status !== "archived").length;
  if (activeCount >= limits.maxObjects) {
    return {
      allowed: false,
      reason: `Im Free-Plan ist maximal ${limits.maxObjects} Objekt möglich.`,
      trigger: "second_object",
    };
  }
  return { allowed: true };
}

export function canAddRoom(projectId: string): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  const limits = getPlanLimits(plan);
  const { projects } = useStore.getState();
  const project = projects.find(p => p.id === projectId);
  if (project && project.rooms.length >= limits.maxRoomsPerProject) {
    return {
      allowed: false,
      reason: `Im Free-Plan sind maximal ${limits.maxRoomsPerProject} Räume pro Objekt möglich.`,
      trigger: "general",
    };
  }
  return { allowed: true };
}

export function canUsePDF(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "PDF-Export ist ein Pro-Feature. Im Free-Plan kannst du die Vorschau sehen, aber nicht exportieren.",
    trigger: "pdf_export",
  };
}

export function canExportPDF(): GateResult {
  return canUsePDF();
}

export function canRemoveWatermark(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "Dokumente ohne Wasserzeichen sind ein Pro-Feature.",
    trigger: "watermark_remove",
  };
}

export function canUseBranding(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "Eigenes Branding ist ein Pro-Feature.",
    trigger: "branding",
  };
}

export function canUseTemplates(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "Vorlagen sind ein Pro-Feature.",
    trigger: "template_save",
  };
}

export function canSaveTemplate(): GateResult {
  return canUseTemplates();
}

export function canOverridePerformance(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "Individuelle Leistungswerte sind ein Pro-Feature.",
    trigger: "performance_override",
  };
}

export function getActiveObjectCount(): number {
  const { projects } = useStore.getState();
  return projects.filter(p => p.status !== "archived").length;
}

export function getObjectLimit(): number {
  const plan = getPlan();
  return getPlanLimits(plan).maxObjects;
}

export function getRoomLimit(): number {
  const plan = getPlan();
  return getPlanLimits(plan).maxRoomsPerProject;
}

export function isFreePlan(): boolean {
  return !isPaidPlan(getPlan());
}

export function getUpgradeTriggerReason(trigger: UpgradeTrigger): GateResult {
  const gateMap: Record<UpgradeTrigger, () => GateResult> = {
    second_object: canAddProject,
    pdf_export: canUsePDF,
    template_save: canUseTemplates,
    watermark_remove: canRemoveWatermark,
    branding: canUseBranding,
    performance_override: canOverridePerformance,
    general: () => {
      const plan = getPlan();
      if (isPaidPlan(plan)) return { allowed: true };
      return { allowed: false, reason: "Dieses Feature erfordert ein Pro-Upgrade.", trigger: "general" as UpgradeTrigger };
    },
  };
  return gateMap[trigger]();
}

export { isPaidPlan };
