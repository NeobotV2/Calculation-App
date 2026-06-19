import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/layout/PageTransition";
import { useStore } from "@/store/use-store";
import { Building2, User, Play, Sparkles, ArrowRight, SkipForward } from "lucide-react";
import { trackOnboardingStarted, trackOnboardingCompleted, trackOnboardingSkipped } from "@/services/analytics-service";

const ROLES = ["Inhaber / GF", "Vertrieb", "Objektleitung", "Kalkulation"];
const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const completeOnboarding = useStore(s => s.completeOnboarding);
  
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("22,50");

  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  const handleComplete = (loadDemo: boolean) => {
    trackOnboardingCompleted(loadDemo);
    const parsedRate = parseFloat(hourlyRate.replace(",", "."));
    completeOnboarding({
      role: role || "Benutzer",
      companyName: companyName || "Meine Firma",
      hourlyRate: Number.isNaN(parsedRate) || parsedRate <= 0 ? 22.50 : parsedRate,
      loadDemo
    });
    setLocation("/");
  };

  const handleSkip = () => {
    trackOnboardingSkipped();
    completeOnboarding({
      role: "Benutzer",
      companyName: "Meine Firma",
      hourlyRate: 22.50,
      loadDemo: true,
    });
    setLocation("/");
  };

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      <div className="flex-1 flex flex-col p-6 pt-12 relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 bg-border h-1 rounded-full overflow-hidden mr-4">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          {step < TOTAL_STEPS && (
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <SkipForward size={14} /> Überspringen
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <PageTransition key="step1" className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles size={40} className="text-primary" />
                </div>
                <h1 className="text-4xl font-semibold tracking-tight mb-3">
                  Willkommen bei CleanCalc <span className="text-primary">Pro</span>
                </h1>
                <p className="text-muted-foreground text-lg px-2">
                  Die professionelle Kalkulationslösung für Gebäudereiniger. Kalkulieren Sie Ihr erstes Objekt kostenlos.
                </p>
              </div>
              <Button onClick={nextStep} size="lg" className="w-full h-14 text-lg">
                Los geht's <ArrowRight size={20} className="ml-2" />
              </Button>
            </PageTransition>
          )}

          {step === 2 && (
            <PageTransition key="step2" className="flex-1 flex flex-col">
              <div className="flex-1">
                <h2 className="text-3xl font-semibold tracking-tight mb-2">Wie ist Ihre Rolle?</h2>
                <p className="text-muted-foreground text-lg mb-8">Das hilft uns, die App für Sie anzupassen.</p>
                <div className="space-y-3">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => { setRole(r); nextStep(); }}
                      className={`w-full p-5 rounded-2xl border text-left transition-all ${role === r ? 'border-primary bg-primary/10' : 'border-border/50 bg-card hover:bg-secondary'}`}
                    >
                      <div className="flex items-center gap-4">
                        <User className={role === r ? 'text-primary' : 'text-muted-foreground'} size={24} />
                        <span className="font-medium text-lg">{r}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </PageTransition>
          )}

          {step === 3 && (
            <PageTransition key="step3" className="flex-1 flex flex-col">
              <div className="flex-1">
                <h2 className="text-3xl font-semibold tracking-tight mb-2">Firma & Verrechnungssatz</h2>
                <p className="text-muted-foreground text-lg mb-8">Diese Angaben können Sie jederzeit ändern.</p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="onboarding-company" className="text-sm text-muted-foreground ml-1">Firmenname</label>
                    <Input
                      id="onboarding-company"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="z.B. Glanz & Rein GmbH"
                      autoFocus
                      className="text-lg h-14 bg-card border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="onboarding-rate" className="text-sm text-muted-foreground ml-1">Verrechnungssatz (€/h)</label>
                    <Input
                      id="onboarding-rate"
                      value={hourlyRate}
                      onChange={e => setHourlyRate(e.target.value)}
                      placeholder="22,50"
                      inputMode="decimal"
                      className="text-lg h-14 bg-card border-border/50"
                    />
                  </div>
                </div>
              </div>
              <Button disabled={!companyName.trim()} onClick={nextStep} size="lg" className="w-full mt-8">Weiter</Button>
            </PageTransition>
          )}

          {step === 4 && (
            <PageTransition key="step4" className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-semibold tracking-tight mb-3">Wie möchten Sie starten?</h2>
                  <p className="text-muted-foreground text-lg">Sie können sofort mit einem Objekt loslegen — kostenlos und unverbindlich.</p>
                </div>
                
                <div className="space-y-4">
                  <button onClick={() => handleComplete(true)} className="w-full p-6 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all text-left group">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary p-3 rounded-full text-primary-foreground group-hover:scale-105 transition-transform">
                        <Play fill="currentColor" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Mit Demo starten</h3>
                        <p className="text-primary mt-1">Lade Beispiel-Objekte zum Testen</p>
                      </div>
                    </div>
                  </button>
                  
                  <button onClick={() => handleComplete(false)} className="w-full p-6 rounded-2xl border border-border/40 bg-card hover:bg-secondary transition-all text-left">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-3 rounded-full text-foreground">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Leeres Projekt</h3>
                        <p className="text-muted-foreground mt-1">Ganz von vorne anfangen</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </PageTransition>
          )}

          {step === 5 && (
            <PageTransition key="step5" className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-semibold tracking-tight mb-3">Account erstellen?</h2>
                <p className="text-muted-foreground text-lg px-2">
                  Sichern Sie Ihre Daten in der Cloud. Sie können die App auch erst ohne Account testen.
                </p>
              </div>

              <div className="space-y-4">
                <Button onClick={() => { handleComplete(true); setTimeout(() => setLocation("/register"), 100); }} size="lg" className="w-full h-14 text-lg">
                  Account erstellen
                </Button>
                <Button variant="outline" onClick={() => handleComplete(true)} size="lg" className="w-full h-14 text-base">
                  Erst ohne Account testen
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-6 px-4">
                Im Basic-Plan kalkulieren Sie ein Objekt kostenlos. Für unbegrenzte Objekte und PDF-Export steht der Pro-Plan bereit.
              </p>
            </PageTransition>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
