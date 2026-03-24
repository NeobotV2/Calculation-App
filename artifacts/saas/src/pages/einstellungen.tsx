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
      <div className="p-6 pb-4 glass-panel sticky top-0 z-40">
        <h1 className="text-2xl font-display font-bold">Einstellungen</h1>
      </div>

      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 size={16}/> Allgemein
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground ml-1 mb-1 block">Firmenname</label>
              <Input value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground ml-1 mb-1 block">Standard-Stundensatz (€/h)</label>
              <Input value={rate} onChange={e => setRate(e.target.value)} type="decimal" />
            </div>
            <Button onClick={handleSave} className="w-full mt-2" size="sm">
              <Save size={16} className="mr-2"/> Speichern
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Paintbrush size={16}/> Branding (PDF Exporte)
          </h2>
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
            <div className={`space-y-4 ${plan === 'basic' ? 'opacity-40 select-none pointer-events-none' : ''}`}>
              <div>
                <label className="text-xs text-muted-foreground ml-1 mb-1 block">Logo URL</label>
                <Input placeholder="https://..." disabled={plan === 'basic'} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground ml-1 mb-1 block">Angebots-Fußzeile</label>
                <Input placeholder="Bankverbindung, HRB, etc." disabled={plan === 'basic'} />
              </div>
            </div>
            
            {plan === 'basic' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                <Lock size={24} className="text-white mb-2" />
                <p className="font-semibold text-sm">Nur im Pro Plan</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <BottomNav />
    </PageTransition>
  );
}
