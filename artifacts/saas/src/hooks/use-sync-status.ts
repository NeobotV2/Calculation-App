import { useCallback, useEffect, useMemo, useState } from "react";
import { create } from "zustand";

/**
 * Ladezustand der Cloud-Synchronisation (nicht persistiert).
 *
 * - Demo-/Lokalmodus: bleibt dauerhaft `{ status: "ready", hasLoadedOnce: true }`.
 * - Cloud-Modus: `use-supabase-sync` meldet Start/Erfolg/Fehler über
 *   `markSyncStart` / `markSyncSuccess` / `markSyncError` (oder `setSyncStatus`)
 *   und registriert seine Reload-Funktion via `registerSyncReload`.
 *
 * Seiten nutzen `useSyncStatus()` bzw. `useInitialLoading()`, um Skelette nur
 * beim allerersten Laden zu zeigen und „Noch keine Objekte" nie während eines
 * Ladevorgangs aufblitzen zu lassen.
 */
export type SyncStatus = "idle" | "loading" | "ready" | "error";

export interface SyncState {
  status: SyncStatus;
  /** Fehlermeldung für den SyncBanner (nur bei `status === "error"`). */
  error?: string;
  /** ISO-Zeitstempel der letzten erfolgreichen Synchronisation. */
  lastSyncedAt?: string;
  /** `false` nur, solange noch nie Daten (Cache oder Cloud) geladen wurden. */
  hasLoadedOnce: boolean;
}

export interface SyncStatusApi extends SyncState {
  /** Startet die registrierte Reload-Funktion (ohne Wirkung, wenn keine registriert ist). */
  reload(): void;
}

const INITIAL_STATE: SyncState = { status: "ready", hasLoadedOnce: true };

const useSyncStore = create<SyncState>(() => ({ ...INITIAL_STATE }));

type ReloadFn = () => void | Promise<void>;
let reloadFn: ReloadFn | null = null;

/** Setzt Teile des Sync-Zustands (z. B. `{ status: "loading" }`). */
export function setSyncStatus(partial: Partial<SyncState>): void {
  useSyncStore.setState(partial);
}

/** Aktueller Zustand außerhalb von React. */
export function getSyncStatus(): SyncState {
  return useSyncStore.getState();
}

/** Setzt auf den Ausgangszustand zurück (z. B. beim Abmelden). */
export function resetSyncStatus(partial?: Partial<SyncState>): void {
  useSyncStore.setState({ ...INITIAL_STATE, error: undefined, lastSyncedAt: undefined, ...partial }, true);
}

/**
 * Beginn eines Ladevorgangs. Wurde noch nie erfolgreich synchronisiert
 * (`lastSyncedAt` fehlt), wird `hasLoadedOnce` auf `false` gesetzt, damit
 * Seiten Skelette statt leerer Listen zeigen.
 */
export function markSyncStart(options?: { firstLoad?: boolean }): void {
  const { lastSyncedAt } = useSyncStore.getState();
  const firstLoad = options?.firstLoad ?? !lastSyncedAt;
  useSyncStore.setState({
    status: "loading",
    error: undefined,
    ...(firstLoad ? { hasLoadedOnce: false } : null),
  });
}

/** Erfolgreicher Abschluss. */
export function markSyncSuccess(at: Date = new Date()): void {
  useSyncStore.setState({ status: "ready", error: undefined, lastSyncedAt: at.toISOString(), hasLoadedOnce: true });
}

/** Fehlgeschlagener Ladevorgang (Meldung erscheint im SyncBanner). */
export function markSyncError(message = "Daten konnten nicht geladen werden."): void {
  useSyncStore.setState({ status: "error", error: message });
}

/**
 * Registriert die Funktion, die `reload()` ausführt. Gibt eine
 * Abmelde-Funktion zurück (entfernt nur, wenn noch dieselbe registriert ist).
 */
export function registerSyncReload(fn: ReloadFn | null): () => void {
  reloadFn = fn;
  return () => {
    if (reloadFn === fn) reloadFn = null;
  };
}

/** Führt die registrierte Reload-Funktion aus. Fehler werden geschluckt (Status meldet sie). */
export async function reloadSync(): Promise<void> {
  if (!reloadFn) return;
  try {
    await reloadFn();
  } catch {
    // Der Aufrufer meldet Fehler über markSyncError / setSyncStatus.
  }
}

/** Reaktiver Sync-Zustand inkl. `reload()`. */
export function useSyncStatus(): SyncStatusApi {
  const status = useSyncStore((s) => s.status);
  const error = useSyncStore((s) => s.error);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const hasLoadedOnce = useSyncStore((s) => s.hasLoadedOnce);
  const reload = useCallback(() => {
    void reloadSync();
  }, []);
  return useMemo(
    () => ({ status, error, lastSyncedAt, hasLoadedOnce, reload }),
    [status, error, lastSyncedAt, hasLoadedOnce, reload],
  );
}

/**
 * `true`, solange das allererste Laden läuft (`loading && !hasLoadedOnce`)
 * UND bereits `delayMs` vergangen sind – verhindert Skelett-Flackern bei
 * schnellen Antworten (§11: 200 ms).
 */
export function useInitialLoading(delayMs = 200): boolean {
  const status = useSyncStore((s) => s.status);
  const hasLoadedOnce = useSyncStore((s) => s.hasLoadedOnce);
  const pending = status === "loading" && !hasLoadedOnce;
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!pending) {
      setElapsed(false);
      return;
    }
    if (delayMs <= 0) {
      setElapsed(true);
      return;
    }
    const t = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(t);
  }, [pending, delayMs]);

  return pending && elapsed;
}
