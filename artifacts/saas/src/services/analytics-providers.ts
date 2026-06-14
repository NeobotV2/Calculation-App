import { setAnalyticsProvider, type AnalyticsEvent, type AnalyticsProperties } from "@/services/analytics-service";

/* ─────────────────────────────────────────────────────────────────────────
   Konkrete Analytics-Anbieter — ohne zusätzliche npm-Abhängigkeit.
   Aktivierung rein über Build-Env-Variablen; ohne Konfiguration passiert
   nichts (in Dev bleibt das Console-Logging des analytics-service aktiv).

   Unterstützt:
   - Plausible    → VITE_PLAUSIBLE_DOMAIN  (optional VITE_PLAUSIBLE_SRC)
   - Google GA4   → VITE_GA_MEASUREMENT_ID

   Beide werden per Script-Tag geladen und über setAnalyticsProvider()
   an die zentrale trackEvent()-Pipeline gehängt.
   ───────────────────────────────────────────────────────────────────────── */

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Record<string, string | number | boolean> }) => void) & {
      q?: unknown[];
    };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function cleanProps(properties?: AnalyticsProperties): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!properties) return out;
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out;
}

function injectScript(src: string, attrs: Record<string, string> = {}): void {
  const script = document.createElement("script");
  script.src = src;
  script.defer = true;
  for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v);
  document.head.appendChild(script);
}

function setupPlausible(domain: string): void {
  const src = import.meta.env.VITE_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
  // Stub-Queue, damit Events vor dem Laden des Scripts nicht verloren gehen.
  window.plausible =
    window.plausible ||
    function (...args: unknown[]) {
      (window.plausible!.q = window.plausible!.q || []).push(args);
    };
  injectScript(src, { "data-domain": domain });

  setAnalyticsProvider((event: AnalyticsEvent, properties?: AnalyticsProperties) => {
    window.plausible?.(event, { props: cleanProps(properties) });
  });
}

function setupGA4(measurementId: string): void {
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  setAnalyticsProvider((event: AnalyticsEvent, properties?: AnalyticsProperties) => {
    window.gtag?.("event", event, cleanProps(properties));
  });
}

/**
 * Initialisiert den konfigurierten Analytics-Anbieter (falls vorhanden).
 * Wird einmalig beim App-Start aufgerufen (siehe main.tsx).
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;

  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  try {
    if (plausibleDomain) {
      setupPlausible(plausibleDomain);
    } else if (gaId) {
      setupGA4(gaId);
    }
  } catch {
    // Analytics darf den App-Start niemals blockieren.
  }
}
