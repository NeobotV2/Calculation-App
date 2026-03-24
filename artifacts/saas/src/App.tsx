import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect, useState } from "react";
import { useStore } from "@/store/use-store";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";

import Splash from "@/pages/splash";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Register from "@/pages/register";
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
import NotFound from "@/pages/not-found";
import { KalkulationListRedirect, KalkulationDetailRedirect } from "@/pages/legacy-redirect";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const hasSeenSplash = useStore((s) => s.hasSeenSplash);
  const hasOnboarded = useStore((s) => s.hasOnboarded);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const publicRoutes = ["/splash", "/onboarding", "/login", "/register"];
    const isPublic = publicRoutes.some((r) => location === r || location.startsWith(r + "/"));

    if (!hasSeenSplash && location !== "/splash") {
      setLocation("/splash");
    } else if (hasSeenSplash && !hasOnboarded && !isPublic) {
      setLocation("/onboarding");
    }
  }, [location, hasSeenSplash, hasOnboarded, setLocation, isReady]);

  if (!isReady) return null;
  return <>{children}</>;
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
        <Route path="/kalkulation" component={KalkulationListRedirect} />
        <Route path="/kalkulation/:id" component={KalkulationDetailRedirect} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <WouterRouter hook={useHashLocation}>
      <AuthGuard>
        <AppRouter />
      </AuthGuard>
      <Toaster position="top-center" />
    </WouterRouter>
  );
}

export default App;
