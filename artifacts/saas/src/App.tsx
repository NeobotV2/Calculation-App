import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useStore } from "@/store/use-store";
import { AnimatePresence } from "framer-motion";

// Pages
import Splash from "@/pages/splash";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import KalkulationList from "@/pages/kalkulation/index";
import KalkulationDetail from "@/pages/kalkulation/[id]";
import AuswertungDetail from "@/pages/auswertung/[id]";
import ObjekteList from "@/pages/objekte/index";
import Einstellungen from "@/pages/einstellungen";
import Konto from "@/pages/konto";
import Upgrade from "@/pages/upgrade";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const hasSeenSplash = useStore(s => s.hasSeenSplash);
  const hasOnboarded = useStore(s => s.hasOnboarded);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Give store a moment to rehydrate from localStorage
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    
    const isPublicRoute = ["/splash", "/onboarding", "/login", "/register"].includes(location);
    
    if (!hasSeenSplash && location !== "/splash") {
      setLocation("/splash");
    } else if (hasSeenSplash && !hasOnboarded && !isPublicRoute) {
      setLocation("/onboarding");
    }
  }, [location, hasSeenSplash, hasOnboarded, setLocation, isReady]);

  if (!isReady) return null; // Or a very minimal spinner

  return <>{children}</>;
}

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Switch location={location} key={location}>
        <Route path="/splash" component={Splash} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/" component={Home} />
        <Route path="/kalkulation" component={KalkulationList} />
        <Route path="/kalkulation/:id" component={KalkulationDetail} />
        <Route path="/auswertung/:id" component={AuswertungDetail} />
        <Route path="/objekte" component={ObjekteList} />
        <Route path="/einstellungen" component={Einstellungen} />
        <Route path="/konto" component={Konto} />
        <Route path="/upgrade" component={Upgrade} />
        <Route>
          <div className="min-h-screen bg-background flex items-center justify-center text-white">
            404 - Seite nicht gefunden
          </div>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AuthGuard>
        <Router />
      </AuthGuard>
    </WouterRouter>
  );
}

export default App;
