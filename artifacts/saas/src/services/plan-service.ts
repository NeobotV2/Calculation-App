import { supabase } from "@/lib/supabase";
import { type PlanId, getPlanLimits, isPaidPlan } from "@/lib/billing-config";

export type { PlanId };

export interface Subscription {
  plan: PlanId;
  status: string;
  storeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

const PLAN_DB_MAP: Record<string, PlanId> = {
  basic: "free",
  free: "free",
  pro: "pro_monthly",
  pro_monthly: "pro_monthly",
  pro_annual: "pro_annual",
  founding_annual: "founding_annual",
  business: "business",
};

function mapDbPlan(dbPlan: string): PlanId {
  return PLAN_DB_MAP[dbPlan] ?? "free";
}

export async function getSubscription(): Promise<Subscription | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, store_subscription_id, current_period_end")
    .single();
  if (error || !data) return null;
  return {
    plan: mapDbPlan(data.plan),
    status: data.status,
    storeSubscriptionId: data.store_subscription_id ?? undefined,
    currentPeriodEnd: data.current_period_end ?? undefined,
  };
}

export interface LimitCheck {
  allowed: boolean;
  reason?: string;
}

export function checkObjectLimit(currentActiveCount: number, plan: PlanId): LimitCheck {
  if (isPaidPlan(plan)) return { allowed: true };
  const limits = getPlanLimits(plan);
  if (currentActiveCount >= limits.maxObjects) {
    return { allowed: false, reason: `Im Basic-Plan können Sie maximal ${limits.maxObjects} Objekt verwalten. Für parallele Objekte und effizientere Angebotserstellung wechseln Sie zum Pro-Plan.` };
  }
  return { allowed: true };
}

export function checkRoomLimit(currentRoomCount: number, plan: PlanId): LimitCheck {
  if (isPaidPlan(plan)) return { allowed: true };
  const limits = getPlanLimits(plan);
  if (currentRoomCount >= limits.maxRoomsPerProject) {
    return { allowed: false, reason: `Im Basic-Plan sind maximal ${limits.maxRoomsPerProject} Räume pro Objekt enthalten. Für vollständige Kalkulationen ohne Raumlimit wechseln Sie zum Pro-Plan.` };
  }
  return { allowed: true };
}

export function checkTemplateAccess(plan: PlanId): LimitCheck {
  if (isPaidPlan(plan)) return { allowed: true };
  return { allowed: false, reason: "Vorlagen beschleunigen Ihre Angebotserstellung erheblich. Speichern Sie wiederkehrende Leistungsverzeichnisse im Pro-Plan." };
}

export function checkPDFAccess(plan: PlanId): LimitCheck {
  if (isPaidPlan(plan)) return { allowed: true };
  return { allowed: false, reason: "Der PDF-Export ist im Pro-Plan verfügbar. Erstellen Sie druckfertige Angebote und senden Sie diese direkt an Ihre Auftraggeber." };
}

export function checkPerformanceOverride(plan: PlanId): LimitCheck {
  if (isPaidPlan(plan)) return { allowed: true };
  return { allowed: false, reason: "Individuelle Leistungswerte sorgen für exakte Kalkulationen. Passen Sie Werte an Ihre Erfahrungsdaten an — verfügbar im Pro-Plan." };
}
