import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect, useState, lazy, Suspense } from "react";
import { useStore } from "@/store/use-store";
import { useAuth, SupabaseAuthProvider } from "@/lib/auth-context";
import { useSupabaseSync } from "@/hooks/use-supabase-sync";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from "lucide-react";

// Eager: erste authentifizierte Ansicht + kleine Redirect-Helfer
import Home from "@/pages/home";
import { KalkulationListRedirect, KalkulationDetailRedirect, StundensatzRedirect } from "@/pages/legacy-redirect";

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
const ObjektWizard = lazy(() => import("@/pages/objekte/wizard"));
const AuswertungGlobal = lazy(() => import("@/pages/auswertung/index"));
const AuswertungDetail = lazy(() => import("@/pages/auswertung/[id]"));
const Vorlagen = lazy(() => import("@/pages/vorlagen"));
const Ausschreibung = lazy(() => import("@/pages/ausschreibung"));
const PrintView = lazy(() => import("@/pages/print/[id]"));
const InternPrintView = lazy(() => import("@/pages/print/intern-[id]"));
const Einstellungen = lazy(() => import("@/pages/einstellungen"));
const KalkulationWizard = lazy(() => import("@/pages/kalkulation-wizard"));
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

function BrandLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg">
        <Sparkles className="w-8 h-8 text-primary-foreground" strokeWidth={1.5} />
      </div>
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function SessionLoader() {
  const { isLoading } = useAuth();
  if (isLoading) return <BrandLoader />;
  return null;
}

const publicRoutes = [
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

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const hasSeenSplash = useStore((s) => s.hasSeenSplash);
  const hasOnboarded = useStore((s) => s.hasOnboarded);
  const { isLoading, isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return;

    const isPublic = publicRoutes.some((r) => location === r || location.startsWith(r + "/"));

    if (isAuthenticated && (location === "/login" || location === "/register")) {
      setLocation("/");
      return;
    }

    // Neue Besucher landen zuerst auf der Marketing-Startseite (Top of Funnel).
    if (!hasSeenSplash && location !== "/willkommen") {
      setLocation("/willkommen");
    } else if (hasSeenSplash && !hasOnboarded && !isAuthenticated && !isPublic) {
      setLocation("/onboarding");
    }
  }, [location, hasSeenSplash, hasOnboarded, setLocation, isReady, isLoading, isAuthenticated]);

  if (!isReady || isLoading) return <SessionLoader />;
  return <>{children}</>;
}

function ThemeApplicator() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);
  return null;
}

function DataSync() {
  useSupabaseSync();
  useAndroidBack();
  return null;
}

const shellRoutes = ["/", "/objekte", "/auswertung", "/einstellungen", "/stundensatz", "/kalkulation", "/konto", "/vorlagen", "/ausschreibung", "/upgrade", "/mehr"];

function needsShell(loc: string): boolean {
  if (loc.startsWith("/print/")) return false;
  for (const route of shellRoutes) {
    if (route === "/" && loc === "/") return true;
    if (route !== "/" && (loc === route || loc.startsWith(route + "/"))) return true;
  }
  return false;
}

function AppRouter() {
  const [location] = useLocation();
  const showShell = needsShell(location);

  const routes = (
    <AnimatePresence mode="wait" initial={false}>
      <Switch location={location} key={location}>
        <Route path="/willkommen" component={Willkommen} />
        <Route path="/splash" component={Splash} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/passwort-vergessen" component={PasswortVergessen} />
        <Route path="/passwort-reset" component={PasswortReset} />
        <Route path="/" component={Home} />
        <Route path="/objekte" component={ObjekteList} />
        <Route path="/objekte/neu" component={ObjektWizard} />
        <Route path="/objekte/:id" component={ObjektDetail} />
        <Route path="/auswertung" component={AuswertungGlobal} />
        <Route path="/auswertung/:id" component={AuswertungDetail} />
        <Route path="/vorlagen" component={Vorlagen} />
        <Route path="/ausschreibung" component={Ausschreibung} />
        <Route path="/print/:id/intern" component={InternPrintView} />
        <Route path="/print/:id" component={PrintView} />
        <Route path="/einstellungen" component={Einstellungen} />
        <Route path="/stundensatz" component={StundensatzRedirect} />
        <Route path="/kalkulation/neu" component={KalkulationWizard} />
        <Route path="/kalkulation/:id" component={KalkulationWizard} />
        <Route path="/konto" component={Konto} />
        <Route path="/upgrade" component={Upgrade} />
        <Route path="/mehr" component={Mehr} />
        <Route path="/impressum" component={Impressum} />
        <Route path="/datenschutz" component={Datenschutz} />
        <Route path="/agb" component={AGB} />
        <Route path="/kalkulation" component={KalkulationListRedirect} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );

  const content = <Suspense fallback={<BrandLoader />}>{routes}</Suspense>;

  if (showShell) {
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
            <Toaster position="top-center" />
            <CookieNotice />
          </WouterRouter>
        </SupabaseAuthProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
