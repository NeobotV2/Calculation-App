/* ─────────────────────────────────────────────────────────────────────────
   Navigation & Shell-Modi (§2/§3): EINE Quelle für Navigationseinträge,
   Aktiv-Regeln, Shell-Modus je Route, Routen-Schlüssel für Übergänge und
   die AuthGuard-Entscheidung (inkl. gemerktem Deep-Link). Rein und testbar;
   nur `rememberIntendedPath`/`consumeIntendedPath` berühren sessionStorage.
   ───────────────────────────────────────────────────────────────────────── */
import {
  BarChart3,
  Building2,
  Calculator,
  FileStack,
  House,
  Landmark,
  Menu,
  Plus,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type ShellMode = "app" | "focus" | "none";

export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/* ── Einträge ─────────────────────────────────────────────────────────── */

const START: NavItem = { id: "start", href: "/", label: "Start", icon: House };
const OBJEKTE: NavItem = { id: "objekte", href: "/objekte", label: "Objekte", icon: Building2 };
const NEU: NavItem = { id: "neu", href: "/kalkulation/neu", label: "Neu", icon: Plus };
const CONTROLLING: NavItem = { id: "controlling", href: "/auswertung", label: "Controlling", icon: BarChart3 };
const MEHR: NavItem = { id: "mehr", href: "/mehr", label: "Mehr", icon: Menu };
const AUSSCHREIBUNG: NavItem = { id: "ausschreibung", href: "/ausschreibung", label: "Ausschreibung", icon: Landmark };
const VERRECHNUNGSSATZ: NavItem = {
  id: "verrechnungssatz",
  href: "/verrechnungssatz",
  label: "Verrechnungssatz",
  icon: Calculator,
};
const VORLAGEN: NavItem = { id: "vorlagen", href: "/vorlagen", label: "Vorlagen", icon: FileStack };
const EINSTELLUNGEN: NavItem = { id: "einstellungen", href: "/einstellungen", label: "Einstellungen", icon: Settings };

/** Primäraktion der Sidebar (Phone: Eintrag „Neu" der BottomNav). */
export const NEW_CALCULATION_ITEM: NavItem = {
  id: "neue-kalkulation",
  href: "/kalkulation/neu",
  label: "Neue Kalkulation",
  icon: Plus,
};

/** Footer-Link der Sidebar. */
export const ACCOUNT_NAV_ITEM: NavItem = { id: "konto", href: "/konto", label: "Konto & Plan", icon: UserRound };

export const NAV_ITEMS: {
  /** BottomNav unter md: Start · Objekte · Neu · Controlling · Mehr. */
  mobile: readonly NavItem[];
  /** Sidebar ab md: Primärbutton, Gruppen, Footer-Link. */
  desktop: { primary: NavItem; groups: readonly NavGroup[]; account: NavItem };
} = {
  mobile: [START, OBJEKTE, NEU, CONTROLLING, MEHR],
  desktop: {
    primary: NEW_CALCULATION_ITEM,
    groups: [
      { id: "arbeiten", label: "Arbeiten", items: [START, OBJEKTE, AUSSCHREIBUNG] },
      { id: "auswerten", label: "Auswerten", items: [CONTROLLING] },
      { id: "stammdaten", label: "Stammdaten", items: [VERRECHNUNGSSATZ, VORLAGEN, EINSTELLUNGEN] },
    ],
    account: ACCOUNT_NAV_ITEM,
  },
};

/* ── Pfad-Helfer ──────────────────────────────────────────────────────── */

/** Pfad ohne Query/Hash und ohne abschließenden Slash ("/" bleibt "/"). */
export function normalizePath(location: string): string {
  let p = location || "/";
  const cut = p.search(/[?#]/);
  if (cut >= 0) p = p.slice(0, cut);
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

function isUnder(path: string, base: string): boolean {
  return path === base || path.startsWith(`${base}/`);
}

/** Routen ohne App-Shell, die auch ohne Splash/Onboarding erreichbar sind. */
export const PUBLIC_ROUTES: readonly string[] = [
  "/willkommen",
  "/splash",
  "/onboarding",
  "/login",
  "/register",
  "/passwort-vergessen",
  "/passwort-reset",
  "/impressum",
  "/datenschutz",
  "/agb",
];

export function isPublicRoute(location: string): boolean {
  const path = normalizePath(location);
  return PUBLIC_ROUTES.some((r) => isUnder(path, r));
}

/** Unterseiten, die auf dem Phone „Mehr" hervorheben. */
const MEHR_ROUTES = [
  "/mehr",
  "/ausschreibung",
  "/vorlagen",
  "/verrechnungssatz",
  "/stundensatz",
  "/einstellungen",
  "/konto",
  "/upgrade",
  "/impressum",
  "/datenschutz",
  "/agb",
];

/** `/kalkulation/<id>…` mit id ≠ neu (Bearbeiten eines Objekts im Flow). */
function isFlowEdit(path: string): boolean {
  const m = /^\/kalkulation\/([^/]+)/.exec(path);
  return !!m && m[1] !== "neu";
}

function isNewCalculation(path: string): boolean {
  return path === "/kalkulation" || isUnder(path, "/kalkulation/neu") || path === "/objekte/neu";
}

/**
 * Ist der Navigationseintrag `href` auf `location` aktiv?
 * - `/kalkulation/neu*` → „Neu" (Phone) bzw. „Neue Kalkulation" (Desktop)
 * - `/kalkulation/<id>*` (id ≠ neu) und `/objekte/*` → Objekte
 * - `/verrechnungssatz`, `/ausschreibung`, `/vorlagen` … → „Mehr" (Phone) und
 *   der eigene Eintrag (Desktop); die Listen überschneiden sich nicht.
 */
export function isNavActive(href: string, location: string): boolean {
  const path = normalizePath(location);
  const target = normalizePath(href);

  if (target === "/") return path === "/";
  if (target === "/kalkulation/neu") return isNewCalculation(path);
  if (target === "/objekte") return (isUnder(path, "/objekte") && path !== "/objekte/neu") || isFlowEdit(path);
  if (target === "/mehr") return MEHR_ROUTES.some((r) => isUnder(path, r));
  if (target === "/verrechnungssatz") return isUnder(path, "/verrechnungssatz") || isUnder(path, "/stundensatz");
  if (target === "/konto") return isUnder(path, "/konto") || isUnder(path, "/upgrade");
  return isUnder(path, target);
}

/**
 * Shell-Modus einer Route:
 * - `none`: Druckansichten und öffentliche Seiten (ohne Navigation)
 * - `focus`: Kalkulations-Flow `/kalkulation/*` (eigene Kopf-/Fußleiste)
 * - `app`: alles andere (Sidebar/BottomNav), inkl. NotFound
 */
export function getShellMode(location: string): ShellMode {
  const path = normalizePath(location);
  if (isUnder(path, "/print")) return "none";
  if (isPublicRoute(path)) return "none";
  if (isUnder(path, "/kalkulation")) return "focus";
  return "app";
}

/**
 * Schlüssel für Seitenübergänge: Wechsel innerhalb derselben Seite
 * (Flow-Schritt, Workspace-Tab, Einstellungsbereich) remounten die Seite nicht.
 */
export function getRouteTransitionKey(location: string): string {
  const path = normalizePath(location);
  const flow = /^\/kalkulation\/([^/]+)/.exec(path);
  if (flow) return `/kalkulation/${flow[1]}`;
  const object = /^\/objekte\/([^/]+)/.exec(path);
  if (object) return `/objekte/${object[1]}`;
  if (isUnder(path, "/einstellungen")) return "/einstellungen";
  return path;
}

/* ── AuthGuard ────────────────────────────────────────────────────────── */

export interface GuardState {
  isAuthenticated: boolean;
  hasSeenSplash: boolean;
  hasOnboarded: boolean;
}

export type GuardDecision =
  /** Seite darf gerendert werden. */
  | { kind: "allow" }
  /** Weiterleiten; bei `remember` den aktuellen Pfad als Deep-Link merken. */
  | { kind: "redirect"; to: string; remember: boolean }
  /** Gemerkten Deep-Link fortsetzen; ohne gemerkten Pfad → `fallback` bzw. bleiben. */
  | { kind: "resume"; fallback?: string };

/**
 * Entscheidung des AuthGuards (§2):
 * - Angemeldete Nutzer landen nie auf /willkommen oder /onboarding; auf
 *   /login bzw. /register geht es zum gemerkten Deep-Link oder nach „/".
 * - Neue Besucher: App-Routen → /willkommen, danach → /onboarding (Deep-Link
 *   wird gemerkt); öffentliche Seiten bleiben erreichbar.
 * - Landet ein freigegebener Nutzer auf „/" (nach Splash/Onboarding/Login),
 *   wird ein gemerkter Deep-Link fortgesetzt.
 */
export function resolveAuthGuard(location: string, s: GuardState): GuardDecision {
  const path = normalizePath(location);
  const isPublic = isPublicRoute(path);

  if (s.isAuthenticated) {
    if (path === "/login" || path === "/register") return { kind: "resume", fallback: "/" };
    if (path === "/") return { kind: "resume" };
    return { kind: "allow" };
  }
  if (!s.hasSeenSplash) {
    return isPublic ? { kind: "allow" } : { kind: "redirect", to: "/willkommen", remember: path !== "/" };
  }
  if (!s.hasOnboarded) {
    return isPublic ? { kind: "allow" } : { kind: "redirect", to: "/onboarding", remember: path !== "/" };
  }
  if (path === "/") return { kind: "resume" };
  return { kind: "allow" };
}

/** sessionStorage-Schlüssel des gemerkten Deep-Links. */
export const INTENDED_PATH_KEY = "cc:intendedPath";

/** Nur App-Routen werden gemerkt (keine öffentlichen Seiten, nicht „/"). */
export function isRememberablePath(location: string): boolean {
  const path = normalizePath(location);
  return path !== "/" && !isPublicRoute(path);
}

function getSession(): Storage | null {
  try {
    return typeof window !== "undefined" && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function rememberIntendedPath(location: string): void {
  if (!isRememberablePath(location)) return;
  try {
    getSession()?.setItem(INTENDED_PATH_KEY, normalizePath(location));
  } catch {
    // sessionStorage nicht verfügbar (privater Modus) — Deep-Link geht verloren.
  }
}

export function peekIntendedPath(): string | null {
  try {
    const value = getSession()?.getItem(INTENDED_PATH_KEY) ?? null;
    return value && isRememberablePath(value) ? value : null;
  } catch {
    return null;
  }
}

/** Liest und entfernt den gemerkten Deep-Link. */
export function consumeIntendedPath(): string | null {
  const value = peekIntendedPath();
  try {
    getSession()?.removeItem(INTENDED_PATH_KEY);
  } catch {
    // ignorieren
  }
  return value;
}
