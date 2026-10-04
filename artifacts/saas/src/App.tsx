import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { useStore } from "@/store/use-store";
import { useAuth, SupabaseAuthProvider } from "@/lib/auth-context";
import { useSupabaseSync } from "@/hooks/use-supabase-sync";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from "lucide-react";
import { useResolvedTheme } from "@/lib/theme";
import { THEME_COLOR } from "@/lib/tokens";

// Eager: erste authentifizierte Ansicht + kleine Redirect-Helfer
import Home from "@/pages/home";
import { KalkulationListRedirect, ObjekteNeuRedirect, StundensatzRedirect } from "@/pages/legacy-redirect";

// Lazy: alle übrigen Routen werden bei Bedarf nachgeladen (Code-Splitting)
const Willkommen = lazy(() => import("@/pages/willkommen"));
const Splash = lazy(() => import("@/pages/splash"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const PasswortVergessen = lazy(() => import("@/pages/passwort-vergessen"));
const PasswortReset = lazy(() => import("@/pages/passwort-reset"));
const ObjekteList = lazy(() => import("@/pages/objekte/index"));
const ObjektDetail = lazy(() => import("@/pages/objekte/[id]"));
const AuswertungGlobal = lazy(() => import("@/pages/auswertung/index"));
const AuswertungDetail = lazy(() => import("@/pages/auswertung/[id]"));
const Vorlagen = lazy(() => import("@/pages/vorlagen"));
const Ausschreibung = lazy(() => import("@/pages/ausschreibung"));
const PrintView = lazy(() => import("@/pages/print/[id]"));
const InternPrintView = lazy(() => import("@/pages/print/intern-[id]"));
const Einstellungen = lazy(() => import("@/pages/einstellungen"));
const KalkulationWizard = lazy(() => import("@/pages/kalkulation-wizard"));
const Verrechnungssatz = lazy(() => import("@/pages/kalkulation"));
const Konto = lazy(() => import("@/pages/konto"));
const Upgrade = lazy(() => import("@/pages/upgrade"));
const Mehr = lazy(() => import("@/pages/mehr"));
const Impressum = lazy(() => import("@/pages/impressum"));
const Datenschutz = lazy(() => import("@/pages/datenschutz"));
const AGB = lazy(() => import("@/pages/agb"));
const NotFound = lazy(() => import("@/pages/not-found"));

import { ErrorBoundary } from "@/components/error-boundary";
import { CookieNotice } from "@/components/cookie-notice";
import { useAndroidBack } from "@/hooks/use-android-back";
import { AppShell } from "@/components/layout/AppShell";
import { RouteScope } from "@/components/layout/RouteScope";
import {
  consumeIntendedPath,
  getRouteTransitionKey,
  getShellMode,
  peekIntendedPath,
  rememberIntendedPath,
  resolveAuthGuard,
  type GuardDecision,
} from "@/components/layout/nav-config";

function BrandLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background"
    >
      <div className="flex size-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-raised">
        <Sparkles aria-hidden="true" className="size-8" strokeWidth={2} />
      </div>
      <div
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary motion-reduce:animate-none"
      />
      <span className="sr-only">Wird geladen…</span>
    </div>
  );
}

/** Persistierter Store geladen (auf nativen Plattformen asynchron). */
function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useStore.persist?.hasHydrated?.() ?? true);
  useEffect(() => {
    if (hydrated || !useStore.persist) return;
    const unsubscribe = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, [hydrated]);
  return hydrated;
}

/**
 * Zugangssteuerung (§2):
 * - Angemeldete Nutzer werden nie auf /willkommen oder /onboarding geschickt.
 * - Deep-Links (z. B. /print/:id) werden in sessionStorage `cc:intendedPath`
 *   gemerkt und nach Splash, Onboarding bzw. Login fortgesetzt.
 */
function AuthGuard({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const hasSeenSplash = useStore((s) => s.hasSeenSplash);
  const hasOnboarded = useStore((s) => s.hasOnboarded);
  const { isLoading, isAuthenticated } = useAuth();
  const hydrated = useStoreHydrated();
  const ready = hydrated && !isLoading;

  const decision: GuardDecision | null = ready
    ? resolveAuthGuard(location, { isAuthenticated, hasSeenSplash, hasOnboarded })
    : null;
  const resumeTarget =
    decision?.kind === "resume" ? (peekIntendedPath() ?? decision.fallback ?? null) : null;
  const pendingNavigation =
    decision?.kind === "redirect" || (resumeTarget !== null && resumeTarget !== location);

  useEffect(() => {
    if (!decision) return;
    if (decision.kind === "redirect") {
      if (decision.remember) rememberIntendedPath(location);
      navigate(decision.to, { replace: true });
    } else if (decision.kind === "resume") {
      const target = consumeIntendedPath() ?? decision.fallback;
      if (target && target !== location) navigate(target, { replace: true });
    }
    // Entscheidung hängt nur von Ort und Zugangszustand ab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, ready, isAuthenticated, hasSeenSplash, hasOnboarded, navigate]);

  if (!ready) return <BrandLoader />;
  // Während einer Weiterleitung nichts rendern (kein Aufblitzen der Zielseite).
  if (pendingNavigation) return null;
  return <>{children}</>;
}

/**
 * Wendet das aufgelöste Farbschema an (Hell/Dunkel/System). Druckansichten und
 * der Druck selbst sind immer hell; `meta[name=theme-color]` folgt dem Schema.
 */
function ThemeApplicator() {
  const resolved = useResolvedTheme();
  const [location] = useLocation();
  const isPrintRoute = location.startsWith("/print/");
  const dark = resolved === "dark" && !isPrintRoute;
  const darkRef = useRef(dark);
  darkRef.current = dark;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLOR[dark ? "dark" : "light"];
  }, [dark]);

  useEffect(() => {
    const root = document.documentElement;
    const beforePrint = () => {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    };
    const afterPrint = () => {
      root.classList.toggle("dark", darkRef.current);
      root.style.colorScheme = darkRef.current ? "dark" : "light";
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  return null;
}

function DataSync() {
  useSupabaseSync({ primary: true });
  useAndroidBack();
  return null;
}

function AppRouter() {
  const [location] = useLocation();
  const shellMode = getShellMode(location);

  const routes = (
    <AnimatePresence mode="wait" initial={false}>
      <RouteScope location={location} key={getRouteTransitionKey(location)}>
        <Switch location={location}>
          {/* Öffentlich (ohne Shell) */}
          <Route path="/willkommen" component={Willkommen} />
          <Route path="/splash" component={Splash} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/passwort-vergessen" component={PasswortVergessen} />
          <Route path="/passwort-reset" component={PasswortReset} />
          <Route path="/impressum" component={Impressum} />
          <Route path="/datenschutz" component={Datenschutz} />
          <Route path="/agb" component={AGB} />

          {/* App */}
          <Route path="/" component={Home} />
          <Route path="/objekte" component={ObjekteList} />
          <Route path="/objekte/neu" component={ObjekteNeuRedirect} />
          <Route path="/objekte/:id/:tab?" component={ObjektDetail} />
          <Route path="/kalkulation" component={KalkulationListRedirect} />
          <Route path="/kalkulation/:id/:schritt?" component={KalkulationWizard} />
          <Route path="/verrechnungssatz" component={Verrechnungssatz} />
          <Route path="/stundensatz" component={StundensatzRedirect} />
          <Route path="/ausschreibung" component={Ausschreibung} />
          <Route path="/vorlagen" component={Vorlagen} />
          <Route path="/konto" component={Konto} />
          <Route path="/upgrade" component={Upgrade} />
          <Route path="/mehr" component={Mehr} />
          <Route path="/auswertung" component={AuswertungGlobal} />
          <Route path="/auswertung/:id" component={AuswertungDetail} />
          <Route path="/einstellungen/:bereich?" component={Einstellungen} />

          {/* Druck (ohne Shell) */}
          <Route path="/print/:id/intern" component={InternPrintView} />
          <Route path="/print/:id" component={PrintView} />

          <Route component={NotFound} />
        </Switch>
      </RouteScope>
    </AnimatePresence>
  );

  const content = <Suspense fallback={<BrandLoader />}>{routes}</Suspense>;

  if (shellMode === "app") {
    return <AppShell>{content}</AppShell>;
  }
  return content;
}

function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <SupabaseAuthProvider>
          <WouterRouter hook={useHashLocation}>
            <ThemeApplicator />
            <DataSync />
            <AuthGuard>
              <AppRouter />
            </AuthGuard>
            <Toaster />
            <CookieNotice />
          </WouterRouter>
        </SupabaseAuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
