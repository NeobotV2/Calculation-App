import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/layout/PageTransition";
import { useStore } from "@/store/use-store";
import { Building2, User, Play } from "lucide-react";

const ROLES = ["Inhaber / GF", "Vertrieb", "Objektleitung", "Kalkulation"];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const completeOnboarding = useStore(s => s.completeOnboarding);
  
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("22,50");

  const handleComplete = (loadDemo: boolean) => {
    completeOnboarding({
      role: role || "Benutzer",
      companyName: companyName || "Meine Firma",
      hourlyRate: parseFloat(hourlyRate.replace(",", ".")) || 22.50,
      loadDemo
    });
    setLocation("/");
  };

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      <div className="flex-1 flex flex-col p-6 pt-12 relative">
        <div className="w-full bg-border h-1 rounded-full mb-12 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <PageTransition key="step1" className="flex-1 flex flex-col">
              <div className="flex-1">
                <h2 className="text-3xl font-semibold tracking-tight mb-2">Wie ist deine Rolle?</h2>
                <p className="text-muted-foreground text-lg mb-8">Das hilft uns, die App für dich anzupassen.</p>
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

          {step === 2 && (
            <PageTransition key="step2" className="flex-1 flex flex-col">
              <div className="flex-1">
                <h2 className="text-3xl font-semibold tracking-tight mb-2">Firma & Verrechnungssatz</h2>
                <p className="text-muted-foreground text-lg mb-8">Diese Angaben kannst du jederzeit ändern.</p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground ml-1">Firmenname</label>
                    <Input 
                      value={companyName} 
                      onChange={e => setCompanyName(e.target.value)} 
                      placeholder="z.B. Glanz & Rein GmbH" 
                      autoFocus
                      className="text-lg h-14 bg-card border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground ml-1">Verrechnungssatz (€/h)</label>
                    <Input 
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

          {step === 3 && (
            <PageTransition key="step3" className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-10">
                  <h2 className="text-4xl font-semibold tracking-tight mb-3">Fast geschafft!</h2>
                  <p className="text-muted-foreground text-lg">Wie möchtest du starten?</p>
                </div>
                
                <div className="space-y-4">
                  <button onClick={() => handleComplete(true)} className="w-full p-6 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all text-left group">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary p-3 rounded-full text-primary-foreground group-hover:scale-105 transition-transform">
                        <Play fill="currentColor" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Mit Demo starten</h3>
                        <p className="text-primary mt-1">Lade ein Beispiel-Objekt</p>
                      </div>
                    </div>
                  </button>
                  
                  <button onClick={() => handleComplete(false)} className="w-full p-6 rounded-2xl border border-border/40 bg-card hover:bg-secondary transition-all text-left">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-3 rounded-full text-foreground">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Leeres Objekt</h3>
                        <p className="text-muted-foreground mt-1">Ganz von vorne anfangen</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </PageTransition>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
