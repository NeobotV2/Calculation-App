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
      reason: `Im Basic-Plan können Sie maximal ${limits.maxObjects} Objekt verwalten. Für parallele Objekte und effizientere Angebotserstellung wechseln Sie zum Pro-Plan.`,
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
      reason: `Im Basic-Plan sind maximal ${limits.maxRoomsPerProject} Räume pro Objekt enthalten. Für vollständige Kalkulationen ohne Raumlimit wechseln Sie zum Pro-Plan.`,
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
    reason: "Der PDF-Export ist im Pro-Plan verfügbar. Erstellen Sie druckfertige Angebote und senden Sie diese direkt an Ihre Auftraggeber.",
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
    reason: "Professionelle Angebote ohne Fremdbranding sind im Pro-Plan enthalten — für einen seriösen Auftritt bei Ihren Kunden.",
    trigger: "watermark_remove",
  };
}

export function canUseBranding(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "Im Pro-Plan nutzen Sie Ihr Firmenlogo und individuelle Kopf-/Fußzeilen auf allen Dokumenten.",
    trigger: "branding",
  };
}

export function canUseTemplates(): GateResult {
  const plan = getPlan();
  if (isPaidPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "Vorlagen beschleunigen Ihre Angebotserstellung erheblich. Speichern Sie wiederkehrende Leistungsverzeichnisse im Pro-Plan.",
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
    reason: "Individuelle Leistungswerte sorgen für exakte Kalkulationen. Passen Sie Werte an Ihre Erfahrungsdaten an — verfügbar im Pro-Plan.",
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
    room_limit: () => {
      const plan = getPlan();
      if (isPaidPlan(plan)) return { allowed: true };
      return { allowed: false, reason: `Im Basic-Plan sind maximal ${getRoomLimit()} Räume pro Objekt enthalten. Für vollständige Kalkulationen ohne Raumlimit wechseln Sie zum Pro-Plan.`, trigger: "room_limit" as UpgradeTrigger };
    },
    general: () => {
      const plan = getPlan();
      if (isPaidPlan(plan)) return { allowed: true };
      return { allowed: false, reason: "Unbegrenzte Objekte, druckfertige PDF-Angebote und volle Kontrolle über Ihre Leistungswerte — alles im Pro-Plan.", trigger: "general" as UpgradeTrigger };
    },
  };
  return gateMap[trigger]();
}

export { isPaidPlan };
