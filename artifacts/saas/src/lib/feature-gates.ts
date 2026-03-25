import { useStore } from "@/store/use-store";

export const BASIC_LIMITS = {
  maxProjects: 3,
  maxRoomsPerProject: 20,
} as const;

export function canAddProject(): { allowed: boolean; reason?: string } {
  const { plan, projects } = useStore.getState();
  if (plan === "pro") return { allowed: true };
  const activeCount = projects.filter(p => p.status !== "archived").length;
  if (activeCount >= BASIC_LIMITS.maxProjects) {
    return { allowed: false, reason: `Im Basic-Plan sind maximal ${BASIC_LIMITS.maxProjects} Objekte möglich.` };
  }
  return { allowed: true };
}

export function canAddRoom(projectId: string): { allowed: boolean; reason?: string } {
  const { plan, projects } = useStore.getState();
  if (plan === "pro") return { allowed: true };
  const project = projects.find(p => p.id === projectId);
  if (project && project.rooms.length >= BASIC_LIMITS.maxRoomsPerProject) {
    return { allowed: false, reason: `Im Basic-Plan sind maximal ${BASIC_LIMITS.maxRoomsPerProject} Räume pro Objekt möglich.` };
  }
  return { allowed: true };
}

export function canUsePDF(): { allowed: boolean; reason?: string } {
  return { allowed: true };
}

export function canUseTemplates(): { allowed: boolean; reason?: string } {
  const { plan } = useStore.getState();
  if (plan === "pro") return { allowed: true };
  return { allowed: false, reason: "Vorlagen sind ein Pro-Feature." };
}

export function canOverridePerformance(): { allowed: boolean; reason?: string } {
  const { plan } = useStore.getState();
  if (plan === "pro") return { allowed: true };
  return { allowed: false, reason: "Individuelle Leistungswerte sind ein Pro-Feature." };
}
