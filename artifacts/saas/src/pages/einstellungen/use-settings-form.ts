/* ─────────────────────────────────────────────────────────────────────────
   Einstellungen: EIN Speichermodell für alle Formularfelder.
   Der Entwurf enthält nur geänderte Felder; angezeigt wird Store-Stand +
   Entwurf. Damit folgen unveränderte Felder automatisch dem Store (Cloud-
   Reload, Import), und nach dem Speichern ist das Formular sofort sauber.
   Sofort wirksam bleiben: Farbschema, Warnungs-Schalter, Raumarten, Logo.
   ───────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useStore, type FrequencyKey } from "@/store/use-store";
import { useStoreActions } from "@/hooks/use-store-actions";

export interface SettingsFormValues {
  companyName: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxNumber: string;
  companyVatId: string;
  companyManagingDirector: string;
  vatRate: number | undefined;
  pdfHeader: string;
  pdfFooter: string;
  hourlyRate: number | undefined;
  defaultFrequency: FrequencyKey;
  /** Gewinnaufschlag auf Vollkosten in % (Store `targetMargin`). */
  targetMargin: number | undefined;
}

export type SettingsFieldKey = keyof SettingsFormValues;

export type SettingsErrors = Partial<Record<SettingsFieldKey, string>>;

export const DEFAULT_COMPANY_NAME = "Meine Reinigungsfirma";

/** Felder, die über `updateSettings` gespeichert werden (lokal bzw. Cloud). */
const SYNCED_KEYS = [
  "companyName",
  "companyStreet",
  "companyZip",
  "companyCity",
  "companyPhone",
  "companyEmail",
  "companyTaxNumber",
  "companyVatId",
  "companyManagingDirector",
  "vatRate",
  "pdfHeader",
  "pdfFooter",
  "hourlyRate",
  "defaultFrequency",
] as const satisfies readonly SettingsFieldKey[];

type SettingsSnapshotSource = {
  [K in Exclude<SettingsFieldKey, "vatRate" | "hourlyRate" | "targetMargin">]: SettingsFormValues[K];
} & { vatRate: number; hourlyRate: number; targetMargin: number };

export function settingsSnapshot(s: SettingsSnapshotSource): SettingsFormValues {
  return {
    companyName: s.companyName,
    companyStreet: s.companyStreet,
    companyZip: s.companyZip,
    companyCity: s.companyCity,
    companyPhone: s.companyPhone,
    companyEmail: s.companyEmail,
    companyTaxNumber: s.companyTaxNumber,
    companyVatId: s.companyVatId,
    companyManagingDirector: s.companyManagingDirector,
    vatRate: s.vatRate,
    pdfHeader: s.pdfHeader,
    pdfFooter: s.pdfFooter,
    hourlyRate: s.hourlyRate,
    defaultFrequency: s.defaultFrequency,
    targetMargin: s.targetMargin,
  };
}

/** Schlüssel, deren Entwurfswert vom gespeicherten Stand abweicht. */
export function changedSettingsKeys(
  snapshot: SettingsFormValues,
  draft: Partial<SettingsFormValues>,
): SettingsFieldKey[] {
  return (Object.keys(draft) as SettingsFieldKey[]).filter((k) => draft[k] !== snapshot[k]);
}

export function validateSettings(values: SettingsFormValues): SettingsErrors {
  const errors: SettingsErrors = {};
  if (values.hourlyRate === undefined || !(values.hourlyRate > 0)) {
    errors.hourlyRate = "Bitte geben Sie einen Verrechnungssatz größer als 0 € ein.";
  }
  if (values.vatRate !== undefined && (values.vatRate < 0 || values.vatRate > 100)) {
    errors.vatRate = "Bitte geben Sie einen MwSt.-Satz zwischen 0 und 100 % ein.";
  }
  if (values.targetMargin === undefined || values.targetMargin < 0 || values.targetMargin > 100) {
    errors.targetMargin = "Bitte geben Sie einen Gewinnaufschlag zwischen 0 und 100 % ein.";
  }
  return errors;
}

/** Werte für `updateSettings` (wie bisher getrimmt, leerer Firmenname ⇒ Standard). */
export function toSettingsUpdate(values: SettingsFormValues, keys: readonly SettingsFieldKey[]) {
  const update: Parameters<ReturnType<typeof useStoreActions>["updateSettings"]>[0] = {};
  for (const k of keys) {
    switch (k) {
      case "companyName":
        update.companyName = values.companyName.trim() || DEFAULT_COMPANY_NAME;
        break;
      case "vatRate":
        update.vatRate = values.vatRate ?? 0;
        break;
      case "hourlyRate":
        if (values.hourlyRate !== undefined) update.hourlyRate = values.hourlyRate;
        break;
      case "defaultFrequency":
        update.defaultFrequency = values.defaultFrequency;
        break;
      case "targetMargin":
        break;
      default:
        update[k] = values[k].trim();
    }
  }
  return update;
}

export interface SettingsForm {
  values: SettingsFormValues;
  /** Gespeicherter Stand (Store). */
  saved: SettingsFormValues;
  setField: <K extends SettingsFieldKey>(key: K, value: SettingsFormValues[K]) => void;
  dirty: boolean;
  changedKeys: SettingsFieldKey[];
  errors: SettingsErrors;
  saving: boolean;
  saveError: string | null;
  /** Speichert alle geänderten Felder; true bei Erfolg. */
  save: () => Promise<boolean>;
  /** Verwirft alle ungespeicherten Änderungen. */
  reset: () => void;
}

export function useSettingsForm(): SettingsForm {
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const companyPhone = useStore((s) => s.companyPhone);
  const companyEmail = useStore((s) => s.companyEmail);
  const companyTaxNumber = useStore((s) => s.companyTaxNumber);
  const companyVatId = useStore((s) => s.companyVatId);
  const companyManagingDirector = useStore((s) => s.companyManagingDirector);
  const vatRate = useStore((s) => s.vatRate);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);
  const hourlyRate = useStore((s) => s.hourlyRate);
  const defaultFrequency = useStore((s) => s.defaultFrequency);
  const targetMargin = useStore((s) => s.targetMargin);
  const setTargetMargin = useStore((s) => s.setTargetMargin);
  const { updateSettings } = useStoreActions();

  const saved = useMemo(
    () =>
      settingsSnapshot({
        companyName,
        companyStreet,
        companyZip,
        companyCity,
        companyPhone,
        companyEmail,
        companyTaxNumber,
        companyVatId,
        companyManagingDirector,
        vatRate,
        pdfHeader,
        pdfFooter,
        hourlyRate,
        defaultFrequency,
        targetMargin,
      }),
    [
      companyName,
      companyStreet,
      companyZip,
      companyCity,
      companyPhone,
      companyEmail,
      companyTaxNumber,
      companyVatId,
      companyManagingDirector,
      vatRate,
      pdfHeader,
      pdfFooter,
      hourlyRate,
      defaultFrequency,
      targetMargin,
    ],
  );

  const [draft, setDraft] = useState<Partial<SettingsFormValues>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const values = useMemo<SettingsFormValues>(() => ({ ...saved, ...draft }), [saved, draft]);
  const changedKeys = useMemo(() => changedSettingsKeys(saved, draft), [saved, draft]);
  const dirty = changedKeys.length > 0;
  const allErrors = useMemo(() => validateSettings(values), [values]);
  const errors = showErrors ? allErrors : {};

  const setField = useCallback(<K extends SettingsFieldKey>(key: K, value: SettingsFormValues[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaveError(null);
  }, []);

  const reset = useCallback(() => {
    setDraft({});
    setShowErrors(false);
    setSaveError(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (savingRef.current) return false;
    if (changedKeys.length === 0) return true;
    const relevantErrors = changedKeys.filter((k) => allErrors[k]);
    if (relevantErrors.length > 0) {
      setShowErrors(true);
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const syncedKeys = changedKeys.filter((k): k is (typeof SYNCED_KEYS)[number] =>
        (SYNCED_KEYS as readonly string[]).includes(k),
      );
      if (syncedKeys.length > 0) await updateSettings(toSettingsUpdate(values, syncedKeys));
      if (changedKeys.includes("targetMargin") && values.targetMargin !== undefined) {
        setTargetMargin(values.targetMargin);
      }
      setDraft({});
      setShowErrors(false);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Die Einstellungen konnten nicht gespeichert werden.");
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [changedKeys, allErrors, updateSettings, values, setTargetMargin]);

  return { values, saved, setField, dirty, changedKeys, errors, saving, saveError, save, reset };
}

/* ── Verlassen mit ungespeicherten Änderungen ───────────────────────────── */

export interface LeaveGuard {
  /** Ziel der abgefangenen Navigation (Pfad) oder null. */
  pendingHref: string | null;
  /** Abgefangene Navigation ausführen. */
  proceed: () => void;
  /** Abgefangene Navigation verwerfen (auf der Seite bleiben). */
  cancel: () => void;
}

function hrefToPath(href: string): string | null {
  if (href.startsWith("#/")) return href.slice(1);
  if (href.startsWith("/")) return href;
  return null;
}

/**
 * Fängt In-App-Links ab, solange `active` ist (Capture-Phase vor wouter),
 * und warnt beim Schließen/Neuladen des Tabs. `allow` lässt Pfade durch
 * (z. B. Wechsel zwischen Einstellungsbereichen).
 */
export function useLeaveGuard(active: boolean, allow?: (path: string) => boolean): LeaveGuard {
  const [, navigate] = useLocation();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const allowRef = useRef(allow);
  allowRef.current = allow;

  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;
      const path = hrefToPath(target.getAttribute("href") ?? "");
      if (!path || allowRef.current?.(path)) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(path);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active]);

  const proceed = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) navigate(href);
  }, [pendingHref, navigate]);

  const cancel = useCallback(() => setPendingHref(null), []);

  return { pendingHref, proceed, cancel };
}
