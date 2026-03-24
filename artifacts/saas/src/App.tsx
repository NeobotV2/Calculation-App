import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect, useState } from "react";
import { useStore } from "@/store/use-store";
import { useAuth, SupabaseAuthProvider } from "@/lib/auth-context";
import { useSupabaseSync } from "@/hooks/use-supabase-sync";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles } from "lucide-react";

import Splash from "@/pages/splash";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Register from "@/pages/register";
import PasswortVergessen from "@/pages/passwort-vergessen";
import PasswortReset from "@/pages/passwort-reset";
import Home from "@/pages/home";
import ObjekteList from "@/pages/objekte/index";
import ObjektDetail from "@/pages/objekte/[id]";
import AuswertungGlobal from "@/pages/auswertung/index";
import AuswertungDetail from "@/pages/auswertung/[id]";
import Vorlagen from "@/pages/vorlagen";
import PrintView from "@/pages/print/[id]";
import Einstellungen from "@/pages/einstellungen";
import Konto from "@/pages/konto";
import Upgrade from "@/pages/upgrade";
import Impressum from "@/pages/impressum";
import Datenschutz from "@/pages/datenschutz";
import AGB from "@/pages/agb";
import NotFound from "@/pages/not-found";
import { KalkulationListRedirect, KalkulationDetailRedirect } from "@/pages/legacy-redirect";
import { ErrorBoundary } from "@/components/error-boundary";

function SessionLoader() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg">
          <Sparkles className="w-8 h-8 text-primary-foreground" strokeWidth={1.5} />
        </div>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return null;
}

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

    const publicRoutes = ["/splash", "/onboarding", "/login", "/register", "/passwort-vergessen", "/passwort-reset", "/impressum", "/datenschutz", "/agb"];
    const isPublic = publicRoutes.some((r) => location === r || location.startsWith(r + "/"));

    if (isAuthenticated && (location === "/login" || location === "/register")) {
      setLocation("/");
      return;
    }

    if (!hasSeenSplash && location !== "/splash") {
      setLocation("/splash");
    } else if (hasSeenSplash && !hasOnboarded && !isAuthenticated && !isPublic) {
      setLocation("/onboarding");
    }
  }, [location, hasSeenSplash, hasOnboarded, setLocation, isReady, isLoading, isAuthenticated]);

  if (!isReady || isLoading) return <SessionLoader />;
  return <>{children}</>;
}

function DataSync() {
  useSupabaseSync();
  return null;
}

function AppRouter() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Switch location={location} key={location}>
        <Route path="/splash" component={Splash} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/passwort-vergessen" component={PasswortVergessen} />
        <Route path="/passwort-reset" component={PasswortReset} />
        <Route path="/" component={Home} />
        <Route path="/objekte" component={ObjekteList} />
        <Route path="/objekte/:id" component={ObjektDetail} />
        <Route path="/auswertung" component={AuswertungGlobal} />
        <Route path="/auswertung/:id" component={AuswertungDetail} />
        <Route path="/vorlagen" component={Vorlagen} />
        <Route path="/print/:id" component={PrintView} />
        <Route path="/einstellungen" component={Einstellungen} />
        <Route path="/konto" component={Konto} />
        <Route path="/upgrade" component={Upgrade} />
        <Route path="/impressum" component={Impressum} />
        <Route path="/datenschutz" component={Datenschutz} />
        <Route path="/agb" component={AGB} />
        <Route path="/kalkulation" component={KalkulationListRedirect} />
        <Route path="/kalkulation/:id" component={KalkulationDetailRedirect} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SupabaseAuthProvider>
        <WouterRouter hook={useHashLocation}>
          <DataSync />
          <AuthGuard>
            <AppRouter />
          </AuthGuard>
          <Toaster position="top-center" />
        </WouterRouter>
      </SupabaseAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
