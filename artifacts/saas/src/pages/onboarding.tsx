import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/layout/PageTransition";
import { useStore } from "@/store/use-store";
import { Building2, Calculator, CheckCircle2, User, Play, ChevronRight } from "lucide-react";

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
        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-12">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/40" : "w-2 bg-white/10"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <PageTransition key="step1" className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col justify-center text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 text-primary">
                  <Calculator size={40} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-display font-bold mb-4">Kalkuliere in<br/>Minuten, nicht Stunden.</h2>
                <p className="text-muted-foreground text-lg mb-8">Erstelle präzise Angebote für Unterhaltsreinigungen direkt auf dem Smartphone.</p>
                <div className="space-y-4 text-left bg-white/5 p-6 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20}/><span className="text-sm font-medium">Standard-Leistungswerte inkl.</span></div>
                  <div className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20}/><span className="text-sm font-medium">Automatische Stundenerfassung</span></div>
                  <div className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20}/><span className="text-sm font-medium">Sofortige Preiskalkulation</span></div>
                </div>
              </div>
              <Button onClick={nextStep} size="lg" className="w-full mt-8">Los geht's <ChevronRight size={20}/></Button>
            </PageTransition>
          )}

          {step === 2 && (
            <PageTransition key="step2" className="flex-1 flex flex-col">
              <div className="flex-1">
                <h2 className="text-2xl font-display font-bold mb-2">Wie ist deine Rolle?</h2>
                <p className="text-muted-foreground mb-8">Das hilft uns, die App für dich anzupassen.</p>
                <div className="space-y-3">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => { setRole(r); nextStep(); }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${role === r ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-3">
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
                <h2 className="text-2xl font-display font-bold mb-2">Wie heißt deine Firma?</h2>
                <p className="text-muted-foreground mb-8">Erscheint später auf deinen Angeboten.</p>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground ml-1">Firmenname</label>
                  <Input 
                    value={companyName} 
                    onChange={e => setCompanyName(e.target.value)} 
                    placeholder="z.B. Glanz & Rein GmbH" 
                    autoFocus
                    className="text-lg h-14"
                  />
                </div>
              </div>
              <Button disabled={!companyName.trim()} onClick={nextStep} size="lg" className="w-full mt-8">Weiter</Button>
            </PageTransition>
          )}

          {step === 4 && (
            <PageTransition key="step4" className="flex-1 flex flex-col">
              <div className="flex-1">
                <h2 className="text-2xl font-display font-bold mb-2">Dein Stundensatz</h2>
                <p className="text-muted-foreground mb-8">Der Standard-Stundensatz für neue Kalkulationen. Jederzeit änderbar.</p>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground ml-1">Stundensatz (€/h)</label>
                  <Input 
                    value={hourlyRate} 
                    onChange={e => setHourlyRate(e.target.value)} 
                    placeholder="22,50" 
                    type="decimal"
                    autoFocus
                    className="text-lg h-14 font-display"
                  />
                </div>
              </div>
              <Button disabled={!hourlyRate.trim()} onClick={nextStep} size="lg" className="w-full mt-8">Weiter</Button>
            </PageTransition>
          )}

          {step === 5 && (
            <PageTransition key="step5" className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-display font-bold mb-3">Fast geschafft!</h2>
                  <p className="text-muted-foreground text-lg">Wie möchtest du starten?</p>
                </div>
                
                <div className="space-y-4">
                  <button onClick={() => handleComplete(true)} className="w-full p-6 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all text-left group">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary p-3 rounded-full text-primary-foreground group-hover:scale-110 transition-transform">
                        <Play fill="currentColor" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Mit Demo starten</h3>
                        <p className="text-primary/80 mt-1">Lade ein Beispiel-Objekt</p>
                      </div>
                    </div>
                  </button>
                  
                  <button onClick={() => handleComplete(false)} className="w-full p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/10 p-3 rounded-full text-white">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Leeres Objekt</h3>
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
