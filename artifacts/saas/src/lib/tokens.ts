/**
 * Design-Token-Typen und JS-seitige Konstanten.
 *
 * Die konkreten Design-Token-WERTE (Farben, Radius, Typo, Elevation) leben als
 * CSS-Custom-Properties in `src/index.css` und sind dort die EINZIGE Quelle der
 * Wahrheit (inkl. Light-/Dark-Mode). Komponenten verwenden die davon
 * abgeleiteten Tailwind-Utilities (`bg-card`, `text-muted-foreground`,
 * `shadow-surface`, `text-h2`, `z-overlay` …) statt hartkodierter Werte.
 *
 * Hier stehen nur Werte, die JavaScript zwingend kennen muss (z. B. die
 * `theme-color` für die Browser-Leiste oder Media-Queries für Hooks).
 */

/** Vom Nutzer gewählter Modus. „system" folgt `prefers-color-scheme`. */
export type ThemeMode = "light" | "dark" | "system";

/** Tatsächlich angewendetes Farbschema. */
export type ResolvedTheme = "light" | "dark";

export const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: "Hell",
  dark: "Dunkel",
  system: "System",
};

/** Werte für `<meta name="theme-color">` (entsprechen `--background`). */
export const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: "#f5f7fa",
  dark: "#0b0d14",
};

/** Z-Ebenen; identisch mit den Utilities `z-sticky` … `z-skip` in index.css. */
export const Z_INDEX = {
  sticky: 30,
  nav: 40,
  overlay: 50,
  toast: 100,
  skip: 200,
} as const;

/** Tailwind-Breakpoints in px (Standardwerte, 1rem = 16px). */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

/** Media-Queries für `useMediaQuery` (siehe `lib/theme.ts`). */
export const MEDIA = {
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  coarse: "(pointer: coarse)",
  dark: "(prefers-color-scheme: dark)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;
