export type PlanId = "free" | "pro_monthly" | "pro_annual" | "founding_annual" | "business";

export type UpgradeTrigger =
  | "second_object"
  | "pdf_export"
  | "template_save"
  | "watermark_remove"
  | "branding"
  | "performance_override"
  | "general";

export interface PlanLimits {
  maxObjects: number;
  maxRoomsPerProject: number;
  maxTemplates: number;
  pdfExport: boolean;
  pdfWatermark: boolean;
  whiteLabel: boolean;
  templateSaving: boolean;
  brandingOptions: boolean;
  plausibilityFull: boolean;
  documentExport: boolean;
  performanceOverride: boolean;
  cloudSync: boolean;
}

export interface PlanMeta {
  id: PlanId;
  label: string;
  shortLabel: string;
  isPaid: boolean;
  isFounder: boolean;
}

export interface PricingInfo {
  monthlyPriceCents: number;
  annualPriceCents: number;
  effectiveMonthlyFromAnnualCents: number;
}

const FREE_LIMITS: PlanLimits = {
  maxObjects: 1,
  maxRoomsPerProject: 50,
  maxTemplates: 0,
  pdfExport: false,
  pdfWatermark: true,
  whiteLabel: false,
  templateSaving: false,
  brandingOptions: false,
  plausibilityFull: true,
  documentExport: false,
  performanceOverride: false,
  cloudSync: false,
};

const PRO_LIMITS: PlanLimits = {
  maxObjects: Infinity,
  maxRoomsPerProject: Infinity,
  maxTemplates: Infinity,
  pdfExport: true,
  pdfWatermark: false,
  whiteLabel: true,
  templateSaving: true,
  brandingOptions: true,
  plausibilityFull: true,
  documentExport: true,
  performanceOverride: true,
  cloudSync: true,
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: FREE_LIMITS,
  pro_monthly: PRO_LIMITS,
  pro_annual: PRO_LIMITS,
  founding_annual: PRO_LIMITS,
  business: PRO_LIMITS,
};

export const PLAN_META: Record<PlanId, PlanMeta> = {
  free: { id: "free", label: "Free", shortLabel: "Free", isPaid: false, isFounder: false },
  pro_monthly: { id: "pro_monthly", label: "Pro Monatlich", shortLabel: "Pro", isPaid: true, isFounder: false },
  pro_annual: { id: "pro_annual", label: "Pro Jährlich", shortLabel: "Pro", isPaid: true, isFounder: false },
  founding_annual: { id: "founding_annual", label: "Founding Member", shortLabel: "Founding", isPaid: true, isFounder: true },
  business: { id: "business", label: "Business", shortLabel: "Business", isPaid: true, isFounder: false },
};

export const PRICING = {
  proMonthly: {
    monthlyPriceCents: 7900,
    annualPriceCents: 7900 * 12,
    effectiveMonthlyFromAnnualCents: 7900,
  } as PricingInfo,
  proAnnual: {
    monthlyPriceCents: 7900,
    annualPriceCents: 70800,
    effectiveMonthlyFromAnnualCents: 5900,
  } as PricingInfo,
  foundingAnnual: {
    monthlyPriceCents: 7900,
    annualPriceCents: 34800,
    effectiveMonthlyFromAnnualCents: 2900,
  } as PricingInfo,
} as const;

export const FOUNDING_CONFIG = {
  enabled: true,
  maxCustomers: 100,
  currentCount: 0,
  annualPriceCents: 34800,
  regularAnnualPriceCents: 70800,
  regularMonthlyPriceCents: 7900,
};

export const REMOTE_CONFIG = {
  foundingOfferEnabled: true,
  foundingOfferMaxCustomers: 100,
  foundingOfferCurrentCount: 0,
  foundingAnnualPrice: 34800,
  regularAnnualPrice: 70800,
  regularMonthlyPrice: 7900,
  freeMaxObjects: 1,
  freePdfWatermark: true,
  businessPlanVisible: false,
};

export const STORE_PRODUCT_IDS = {
  pro_monthly: "com.cleancalc.pro.monthly",
  pro_annual: "com.cleancalc.pro.annual",
  founding_annual: "com.cleancalc.pro.founding",
} as const;

export function isPaidPlan(plan: PlanId): boolean {
  return PLAN_META[plan]?.isPaid ?? false;
}

export function isFoundingPlan(plan: PlanId): boolean {
  return plan === "founding_annual";
}

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan] ?? FREE_LIMITS;
}

export function getPlanMeta(plan: PlanId): PlanMeta {
  return PLAN_META[plan] ?? PLAN_META.free;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export const UPGRADE_TRIGGER_COPY: Record<UpgradeTrigger, { headline: string; text: string }> = {
  second_object: {
    headline: "Mehr als ein Objekt kalkulieren",
    text: "Mit Pro arbeitest du mit unbegrenzten Objekten, Angeboten und Vorlagen.",
  },
  pdf_export: {
    headline: "Finales Angebot exportieren",
    text: "Erstelle professionelle PDF-Angebote ohne Wasserzeichen und sende sie direkt an Kunden.",
  },
  template_save: {
    headline: "Vorlagen professionell nutzen",
    text: "Speichere wiederkehrende Leistungsverzeichnisse und beschleunige deine Angebotsprozesse.",
  },
  watermark_remove: {
    headline: "Dokumente ohne Fremdbranding",
    text: "Nutze saubere, professionelle Angebote mit deinem eigenen Firmenauftritt.",
  },
  branding: {
    headline: "Eigenes Firmenbranding",
    text: "Nutze dein Firmenlogo und individuelle Kopf-/Fußzeilen auf allen Dokumenten.",
  },
  performance_override: {
    headline: "Individuelle Leistungswerte",
    text: "Passe Leistungswerte pro Raum individuell an deine Erfahrungswerte an.",
  },
  general: {
    headline: "Professionelle Kalkulation ohne Limit",
    text: "Nutze unbegrenzte Objekte, finale PDF-Angebote und volle Plausibilitätsprüfung.",
  },
};
