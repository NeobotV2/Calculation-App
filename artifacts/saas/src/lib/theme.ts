import { useCallback, useSyncExternalStore } from "react";
import { useStore } from "@/store/use-store";
import { MEDIA, THEME_MODES, type ResolvedTheme, type ThemeMode } from "@/lib/tokens";

export type { ResolvedTheme, ThemeMode } from "@/lib/tokens";

/** Type-Guard für (z. B. aus dem Persist-Speicher gelesene) Werte. */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

/**
 * Ermittelt das anzuwendende Farbschema.
 * Unbekannte/fehlende Werte gelten als „light" (Standard der App).
 */
export function resolveTheme(mode: ThemeMode | null | undefined, prefersDark: boolean): ResolvedTheme {
  if (mode === "dark") return "dark";
  if (mode === "system") return prefersDark ? "dark" : "light";
  return "light";
}

/** Reihenfolge des Theme-Umschalters: Hell → Dunkel → System → Hell. */
export function nextThemeMode(mode: ThemeMode | null | undefined): ThemeMode {
  if (mode === "light") return "dark";
  if (mode === "dark") return "system";
  if (mode === "system") return "light";
  return "dark";
}

function getMediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(query);
}

/** Aktueller Treffer einer Media-Query; ohne `window` (Tests/SSR) `fallback`. */
export function getMediaQueryMatch(query: string, fallback = false): boolean {
  const mql = getMediaQueryList(query);
  return mql ? mql.matches : fallback;
}

/** Abonniert Änderungen einer Media-Query; liefert die Abmelde-Funktion. */
export function subscribeMediaQuery(query: string, onChange: () => void): () => void {
  const mql = getMediaQueryList(query);
  if (!mql) return () => {};
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }
  // Ältere WebKit-Versionen (iOS < 14)
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

/**
 * Reaktiver Media-Query-Hook (z. B. `useMediaQuery(MEDIA.md)`).
 * Liest synchron beim ersten Render → kein Flackern zwischen Layouts.
 * `fallback` gilt nur ohne `window` (Tests/SSR).
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback((cb: () => void) => subscribeMediaQuery(query, cb), [query]);
  const getSnapshot = useCallback(() => getMediaQueryMatch(query, fallback), [query, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** `prefers-color-scheme: dark` des Betriebssystems. */
export function usePrefersDark(): boolean {
  return useMediaQuery(MEDIA.dark);
}

/**
 * Tatsächlich anzuwendendes Schema aus Store-Einstellung (`theme`) und
 * Systemeinstellung. Liest den Store nur, schreibt nie.
 */
export function useResolvedTheme(): ResolvedTheme {
  const mode = useStore((s) => s.theme) as ThemeMode | undefined;
  const prefersDark = usePrefersDark();
  return resolveTheme(mode, prefersDark);
}
