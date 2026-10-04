import { useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/store/use-store";
import * as objectService from "@/services/object-service";
import * as templateService from "@/services/template-service";
import * as customRoomTypeService from "@/services/custom-room-type-service";
import * as settingsService from "@/services/settings-service";
import * as planService from "@/services/plan-service";
import { getProfile } from "@/services/profile-service";
import { getCompany } from "@/services/company-service";
import type { PlanId } from "@/lib/billing-config";
import { suggestedDefaultRate } from "@/lib/hourly-rate-calc";
import {
  getSyncStatus,
  markSyncError,
  markSyncStart,
  markSyncSuccess,
  registerSyncReload,
  resetSyncStatus,
  setSyncStatus,
} from "@/hooks/use-sync-status";

/** Meldungen für den SyncBanner (§11). */
export const SYNC_ERROR_MESSAGE = "Daten konnten nicht geladen werden.";
export const SYNC_PARTIAL_ERROR_MESSAGE = "Einige Daten konnten nicht geladen werden.";

interface SyncUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/** Teilzustand, den `_setAuthData` übernimmt (AppState ist nicht exportiert). */
type AuthData = Parameters<ReturnType<typeof useStore.getState>["_setAuthData"]>[0];

let pendingReload: Promise<void> | null = null;

function mapPlan(plan: unknown): PlanId {
  const p = plan as string | undefined;
  if (p === "pro") return "pro_monthly";
  if (p === "basic") return "free";
  return (p ?? "free") as PlanId;
}

/**
 * Lädt alle Cloud-Daten und übernimmt sie in den Store. Fehlgeschlagene
 * Sammlungen (Objekte, Vorlagen, Raumarten) behalten den zwischengespeicherten
 * Stand, statt durch leere Listen ersetzt zu werden.
 */
async function fetchAndApply(user: SyncUser): Promise<void> {
  const results = await Promise.allSettled([
    getProfile(),
    getCompany(),
    settingsService.getSettings(),
    planService.getSubscription(),
    objectService.getAllObjects(),
    templateService.getAllTemplates(),
    customRoomTypeService.getAllCustomRoomTypes(),
  ] as const);

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`Supabase sync: ${failed}/${results.length} fetches failed`);
  }
  if (failed === results.length) {
    markSyncError(SYNC_ERROR_MESSAGE);
    return;
  }

  const [profileR, companyR, settingsR, subscriptionR, projectsR, templatesR, roomTypesR] = results;
  const userMeta = user.user_metadata ?? {};
  const prev = useStore.getState();
  const data: AuthData = {
    isLoggedIn: true,
    isDemo: false,
    hasSeenSplash: true,
    hasOnboarded: true,
  };

  if (profileR.status === "fulfilled") {
    const profile = profileR.value;
    data.user = {
      name: profile?.full_name || (userMeta.full_name as string) || "",
      email: user.email || "",
      role: profile?.role || "Inhaber",
    };
  } else if (!prev.user || prev.isDemo) {
    data.user = { name: (userMeta.full_name as string) || "", email: user.email || "", role: "Inhaber" };
  }

  if (companyR.status === "fulfilled") {
    data.companyName = companyR.value?.name || "Meine Reinigungsfirma";
  }

  if (settingsR.status === "fulfilled") {
    const settings = settingsR.value;
    Object.assign(data, {
      companyStreet: settings?.company_street ?? "",
      companyZip: settings?.company_zip ?? "",
      companyCity: settings?.company_city ?? "",
      companyPhone: settings?.company_phone ?? "",
      companyEmail: settings?.company_email ?? "",
      companyTaxNumber: settings?.company_tax_number ?? "",
      companyVatId: settings?.company_vat_id ?? "",
      companyManagingDirector: settings?.company_managing_director ?? "",
      hourlyRate: settings?.hourly_rate ?? suggestedDefaultRate(),
      vatRate: settings?.vat_rate ?? 0,
      defaultFrequency: settings?.default_frequency ?? "5x_week",
      pdfHeader: settings?.pdf_header ?? "",
      pdfFooter: settings?.pdf_footer ?? "",
    } satisfies AuthData);
  }

  if (subscriptionR.status === "fulfilled") {
    data.plan = mapPlan(subscriptionR.value?.plan);
  }
  if (projectsR.status === "fulfilled") data.projects = projectsR.value;
  if (templatesR.status === "fulfilled") data.templates = templatesR.value;
  if (roomTypesR.status === "fulfilled") data.customRoomTypes = roomTypesR.value;

  useStore.getState()._setAuthData(data);

  if (failed > 0) {
    setSyncStatus({ status: "error", error: SYNC_PARTIAL_ERROR_MESSAGE, hasLoadedOnce: true });
  } else {
    markSyncSuccess();
  }
}

/** Ein Ladevorgang zur Zeit; parallele Aufrufe warten auf denselben. */
function runSync(user: SyncUser): Promise<void> {
  if (pendingReload) return pendingReload;
  // Mit zwischengespeicherten Cloud-Daten (isDemo === false) zeigen Seiten
  // weiter den Cache plus „Aktualisiere…", sonst Skelette.
  const hasCachedCloudData = useStore.getState().isDemo === false;
  markSyncStart({ firstLoad: !getSyncStatus().lastSyncedAt && !hasCachedCloudData });
  pendingReload = fetchAndApply(user)
    .catch((err) => {
      console.error("Failed to load data from Supabase:", err);
      markSyncError(SYNC_ERROR_MESSAGE);
    })
    .finally(() => {
      pendingReload = null;
    });
  return pendingReload;
}

export interface UseSupabaseSyncOptions {
  /**
   * Genau eine Instanz (App-Ebene, `DataSync`) ist `primary`: sie lädt beim
   * Anmelden bzw. Nutzerwechsel, räumt beim Abmelden auf, registriert
   * `reload` für den SyncBanner und lädt nach einem Verbindungsabbruch neu.
   * Weitere Instanzen (z. B. in `useStoreActions`) liefern nur `reload`.
   */
  primary?: boolean;
}

export function useSupabaseSync(options?: UseSupabaseSyncOptions) {
  const primary = options?.primary ?? false;
  const { isAuthenticated, user } = useAuth();
  const currentUserRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    await runSync(user);
  }, [isAuthenticated, user]);

  // Layout-Effekt: der Ladezustand steht fest, bevor die erste Seite gemalt
  // wird — „Noch keine Objekte" blitzt beim Cloud-Start nicht auf.
  useLayoutEffect(() => {
    if (!primary) return;
    if (isAuthenticated && user && currentUserRef.current !== user.id) {
      currentUserRef.current = user.id;
      void reload();
    } else if (!isAuthenticated && currentUserRef.current !== null) {
      currentUserRef.current = null;
      useStore.getState().clearSession();
      resetSyncStatus();
    }
  }, [primary, isAuthenticated, user, reload]);

  useEffect(() => {
    if (!primary || !isAuthenticated) return;
    return registerSyncReload(reload);
  }, [primary, isAuthenticated, reload]);

  useEffect(() => {
    if (!primary || !isAuthenticated || typeof window === "undefined") return;
    const onOnline = () => {
      if (getSyncStatus().status === "error") void reload();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [primary, isAuthenticated, reload]);

  return { reload };
}
