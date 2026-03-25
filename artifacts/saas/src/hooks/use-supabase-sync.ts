import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/store/use-store";
import * as objectService from "@/services/object-service";
import * as templateService from "@/services/template-service";
import * as customRoomTypeService from "@/services/custom-room-type-service";
import * as settingsService from "@/services/settings-service";
import * as planService from "@/services/plan-service";
import { getProfile, getCompany } from "@/services/profile-service";
import { toast } from "sonner";

let pendingReload: Promise<void> | null = null;

async function fetchAndApply(userId: string, userEmail: string, userMeta: Record<string, unknown>) {
  const results = await Promise.allSettled([
    getProfile(),
    getCompany(),
    settingsService.getSettings(),
    planService.getSubscription(),
    objectService.getAllObjects(),
    templateService.getAllTemplates(),
    customRoomTypeService.getAllCustomRoomTypes(),
  ]);

  const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const profile = val(results[0], null);
  const company = val(results[1], null);
  const settings = val(results[2], null);
  const subscription = val(results[3], null);
  const projects = val(results[4], []);
  const templates = val(results[5], []);
  const customRoomTypes = val(results[6], []);

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.warn(`Supabase sync: ${failed.length}/${results.length} fetches failed`);
    if (failed.length === results.length) {
      toast.error("Daten konnten nicht geladen werden. Bitte prüfe deine Internetverbindung.");
      return;
    }
    toast.error("Einige Daten konnten nicht geladen werden. Bitte versuche es erneut.");
  }

  useStore.getState()._setAuthData({
    isLoggedIn: true,
    isDemo: false,
    hasSeenSplash: true,
    hasOnboarded: true,
    user: {
      name: profile?.full_name || (userMeta?.full_name as string) || "",
      email: userEmail || "",
      role: profile?.role || "Inhaber",
    },
    companyName: company?.name || "Meine Reinigungsfirma",
    companyStreet: settings?.company_street ?? "",
    companyZip: settings?.company_zip ?? "",
    companyCity: settings?.company_city ?? "",
    companyPhone: settings?.company_phone ?? "",
    companyEmail: settings?.company_email ?? "",
    companyTaxNumber: settings?.company_tax_number ?? "",
    companyVatId: settings?.company_vat_id ?? "",
    companyManagingDirector: settings?.company_managing_director ?? "",
    hourlyRate: settings?.hourly_rate ?? 22.5,
    vatRate: settings?.vat_rate ?? 0,
    defaultFrequency: settings?.default_frequency ?? "5x_week",
    pdfHeader: settings?.pdf_header ?? "",
    pdfFooter: settings?.pdf_footer ?? "",
    plan: (subscription?.plan as "basic" | "pro") ?? "basic",
    projects,
    templates,
    customRoomTypes,
  });
}

export function useSupabaseSync() {
  const { isAuthenticated, user } = useAuth();
  const currentUserRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    if (pendingReload) {
      await pendingReload;
      return;
    }

    pendingReload = fetchAndApply(
      user.id,
      user.email || "",
      user.user_metadata || {}
    )
      .catch((err) => {
        console.error("Failed to load data from Supabase:", err);
        toast.error("Verbindungsfehler. Daten konnten nicht synchronisiert werden.");
      })
      .finally(() => {
        pendingReload = null;
      });

    await pendingReload;
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user && currentUserRef.current !== user.id) {
      currentUserRef.current = user.id;
      reload();
    } else if (!isAuthenticated && currentUserRef.current !== null) {
      currentUserRef.current = null;
      useStore.getState().clearSession();
    }
  }, [isAuthenticated, user, reload]);

  return { reload };
}
