import { useState } from "react";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Save, Paintbrush, Lock } from "lucide-react";

export default function Einstellungen() {
  const companyName = useStore(s => s.companyName);
  const hourlyRate = useStore(s => s.hourlyRate);
  const updateSettings = useStore(s => s.updateSettings);
  const plan = useStore(s => s.plan);

  const [company, setCompany] = useState(companyName);
  const [rate, setRate] = useState(hourlyRate.toString().replace(".", ","));

  const handleSave = () => {
    updateSettings({
      companyName: company,
      hourlyRate: parseFloat(rate.replace(",", ".")) || 22.50
    });
    alert("Einstellungen gespeichert");
  };

  return (
    <PageTransition className="min-h-screen pb-28 bg-background">
      <div className="p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <h1 className="text-4xl font-semibold tracking-tight mt-4">Einstellungen</h1>
      </div>

      <div className="p-6 space-y-10">
        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Building2 size={16}/> Allgemein
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Firmenname</label>
              <Input value={company} onChange={e => setCompany(e.target.value)} className="bg-background border-border/50 h-12" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Standard-Stundensatz (€/h)</label>
              <Input value={rate} onChange={e => setRate(e.target.value)} type="decimal" className="bg-background border-border/50 h-12" />
            </div>
            <div className="pt-2">
              <Button onClick={handleSave} className="w-full">
                <Save size={18} className="mr-2"/> Änderungen speichern
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Paintbrush size={16}/> Branding (PDF Exporte)
          </h2>
          <div className="bg-card border border-border/40 rounded-2xl p-5 relative overflow-hidden">
            <div className={`space-y-5 ${plan === 'basic' ? 'opacity-30 select-none pointer-events-none' : ''}`}>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Logo URL</label>
                <Input placeholder="https://..." disabled={plan === 'basic'} className="bg-background border-border/50 h-12" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Angebots-Fußzeile</label>
                <Input placeholder="Bankverbindung, HRB, etc." disabled={plan === 'basic'} className="bg-background border-border/50 h-12" />
              </div>
            </div>
            
            {plan === 'basic' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-sm">
                <div className="w-12 h-12 bg-background border border-border/50 rounded-full flex items-center justify-center mb-3">
                  <Lock size={20} className="text-foreground" />
                </div>
                <p className="font-semibold text-foreground">Nur im Pro Plan</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <BottomNav />
    </PageTransition>
  );
}