import { supabase } from "@/lib/supabase";

export type PlanType = "basic" | "pro";

export interface Subscription {
  plan: PlanType;
  status: string;
}

export async function getSubscription(): Promise<Subscription | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .single();
  if (error) return null;
  return { plan: data.plan as PlanType, status: data.status };
}

export const BASIC_LIMITS = {
  maxProjects: 3,
  maxRoomsPerProject: 20,
} as const;

export interface LimitCheck {
  allowed: boolean;
  reason?: string;
}

export async function checkObjectLimit(currentActiveCount: number, plan: PlanType): Promise<LimitCheck> {
  if (plan === "pro") return { allowed: true };
  if (currentActiveCount >= BASIC_LIMITS.maxProjects) {
    return { allowed: false, reason: `Im Basic-Plan sind maximal ${BASIC_LIMITS.maxProjects} Objekte möglich.` };
  }
  return { allowed: true };
}

export async function checkRoomLimit(currentRoomCount: number, plan: PlanType): Promise<LimitCheck> {
  if (plan === "pro") return { allowed: true };
  if (currentRoomCount >= BASIC_LIMITS.maxRoomsPerProject) {
    return { allowed: false, reason: `Im Basic-Plan sind maximal ${BASIC_LIMITS.maxRoomsPerProject} Räume pro Objekt möglich.` };
  }
  return { allowed: true };
}

export function checkTemplateAccess(plan: PlanType): LimitCheck {
  if (plan === "pro") return { allowed: true };
  return { allowed: false, reason: "Vorlagen sind ein Pro-Feature." };
}

export function checkPDFAccess(plan: PlanType): LimitCheck {
  if (plan === "pro") return { allowed: true };
  return { allowed: false, reason: "PDF-Export ist ein Pro-Feature." };
}

export function checkPerformanceOverride(plan: PlanType): LimitCheck {
  if (plan === "pro") return { allowed: true };
  return { allowed: false, reason: "Individuelle Leistungswerte sind ein Pro-Feature." };
}
