import type { PlanId, UpgradeTrigger } from "@/lib/billing-config";

export type AnalyticsEvent =
  | "paywall_viewed"
  | "paywall_dismissed"
  | "paywall_trigger_second_object"
  | "paywall_trigger_pdf_export"
  | "paywall_trigger_template_save"
  | "paywall_trigger_watermark_remove"
  | "paywall_trigger_branding"
  | "paywall_trigger_performance_override"
  | "paywall_trigger_room_limit"
  | "subscription_started_monthly"
  | "subscription_started_annual"
  | "subscription_started_founding"
  | "founding_offer_viewed"
  | "founding_offer_claimed"
  | "upgrade_page_viewed"
  | "upgrade_cta_clicked"
  | "free_limit_reached"
  | "onboarding_started"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "landing_viewed"
  | "landing_cta_clicked"
  | "lead_captured"
  | "signup_started"
  | "signup_completed"
  | "activation_first_object"
  | "activation_first_calculation"
  | "tender_lv_imported"
  | "tender_converted_to_object";

export interface AnalyticsProperties {
  trigger_source?: UpgradeTrigger;
  plan_type?: PlanId;
  plan_from?: PlanId;
  plan_to?: PlanId;
  source_page?: string;
  object_count?: number;
  cta_location?: string;
  [key: string]: string | number | boolean | undefined;
}

const IS_DEV = typeof window !== "undefined" && window.location.hostname === "localhost" || import.meta.env.DEV;

let analyticsProvider: ((event: AnalyticsEvent, properties?: AnalyticsProperties) => void) | null = null;

export function setAnalyticsProvider(provider: (event: AnalyticsEvent, properties?: AnalyticsProperties) => void) {
  analyticsProvider = provider;
}

export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  if (IS_DEV) {
    console.log(`[Analytics] ${event}`, properties ?? "");
  }

  if (analyticsProvider) {
    try {
      analyticsProvider(event, properties);
    } catch {
      // silently ignore provider errors
    }
  }
}

export function trackPaywallViewed(trigger: UpgradeTrigger, sourcePage?: string) {
  trackEvent("paywall_viewed", { trigger_source: trigger, source_page: sourcePage });

  const triggerEventMap: Record<string, AnalyticsEvent | undefined> = {
    second_object: "paywall_trigger_second_object",
    pdf_export: "paywall_trigger_pdf_export",
    template_save: "paywall_trigger_template_save",
    watermark_remove: "paywall_trigger_watermark_remove",
    branding: "paywall_trigger_branding",
    performance_override: "paywall_trigger_performance_override",
    room_limit: "paywall_trigger_room_limit",
  };
  const specificEvent = triggerEventMap[trigger];
  if (specificEvent) {
    trackEvent(specificEvent, { source_page: sourcePage });
  }
}

export function trackPaywallDismissed(trigger?: UpgradeTrigger) {
  trackEvent("paywall_dismissed", { trigger_source: trigger });
}

export function trackUpgradePageViewed() {
  trackEvent("upgrade_page_viewed");
}

export function trackUpgradeCtaClicked(sourcePage?: string) {
  trackEvent("upgrade_cta_clicked", { source_page: sourcePage });
}

export function trackSubscriptionStarted(planTo: PlanId, planFrom: PlanId = "free") {
  const eventMap: Record<string, AnalyticsEvent> = {
    pro_monthly: "subscription_started_monthly",
    pro_annual: "subscription_started_annual",
    founding_annual: "subscription_started_founding",
  };
  const event = eventMap[planTo];
  if (event) {
    trackEvent(event, { plan_from: planFrom, plan_to: planTo });
  }

  if (planTo === "founding_annual") {
    trackEvent("founding_offer_claimed", { plan_from: planFrom });
  }
}

export function trackFoundingOfferViewed() {
  trackEvent("founding_offer_viewed");
}

export function trackFreeLimitReached(trigger: UpgradeTrigger, objectCount?: number) {
  trackEvent("free_limit_reached", { trigger_source: trigger, object_count: objectCount });
}

export function trackOnboardingStarted() {
  trackEvent("onboarding_started");
}

export function trackOnboardingCompleted(loadDemo: boolean) {
  trackEvent("onboarding_completed", { load_demo: loadDemo });
}

export function trackOnboardingSkipped() {
  trackEvent("onboarding_skipped");
}

/* ── Acquisition / activation funnel ─────────────────────────────── */

export function trackLandingViewed() {
  trackEvent("landing_viewed");
}

export function trackLandingCtaClicked(ctaLocation: string) {
  trackEvent("landing_cta_clicked", { cta_location: ctaLocation });
}

export function trackLeadCaptured(sourcePage?: string) {
  trackEvent("lead_captured", { source_page: sourcePage });
}

export function trackSignupStarted(sourcePage?: string) {
  trackEvent("signup_started", { source_page: sourcePage });
}

export function trackSignupCompleted() {
  trackEvent("signup_completed");
}

export function trackFirstObjectCreated(objectCount?: number) {
  trackEvent("activation_first_object", { object_count: objectCount });
}

export function trackFirstCalculationCompleted() {
  trackEvent("activation_first_calculation");
}

/* ── Ausschreibungs-Kalkulation ──────────────────────────────────── */

export function trackTenderImported(roomCount: number) {
  trackEvent("tender_lv_imported", { object_count: roomCount });
}

export function trackTenderConverted(roomCount: number) {
  trackEvent("tender_converted_to_object", { object_count: roomCount });
}
