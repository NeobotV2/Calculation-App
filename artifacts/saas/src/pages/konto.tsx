import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { User, LogOut, ShieldAlert, Crown, CheckCircle2 } from "lucide-react";

export default function Konto() {
  const [, setLocation] = useLocation();
  const user = useStore(s => s.user);
  const companyName = useStore(s => s.companyName);
  const plan = useStore(s => s.plan);
  const logout = useStore(s => s.logout);
  const resetAll = useStore(s => s.resetAll);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const handleReset = () => {
    if(confirm("ACHTUNG: Dies löscht ALLE lokalen Daten unwiderruflich! Fortfahren?")) {
      resetAll();
      setLocation("/splash");
    }
  };

  return (
    <PageTransition className="min-h-screen pb-28 bg-background">
      <div className="p-6 pb-4 glass-panel sticky top-0 z-40">
        <h1 className="text-2xl font-display font-bold">Konto</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Card */}
        <div className="glass-card rounded-3xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-display font-bold text-white border border-white/20">
            {user?.name?.charAt(0) || "D"}
          </div>
          <div>
            <h2 className="font-bold text-xl">{user?.name || "Demo Nutzer"}</h2>
            <p className="text-muted-foreground text-sm">{user?.email || "demo@cleancalc.pro"}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded text-xs font-medium">
              <User size={12}/> {user?.role || "Inhaber"}
            </div>
          </div>
        </div>

        {/* Plan Card */}
        <div className={`rounded-3xl p-1 border ${plan === 'pro' ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-white/5'}`}>
          <div className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Dein Plan</p>
                <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                  {plan === 'pro' ? 'Pro Version' : 'Basic (Kostenlos)'}
                  {plan === 'pro' && <Crown size={20} className="text-primary"/>}
                </h3>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={16} className="text-primary"/> <span>Unbegrenzte Objekte</span></div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 size={16} className="text-primary"/> <span>{plan === 'pro' ? 'PDF-Angebote exportieren' : 'Nur in der App betrachten'}</span></div>
            </div>

            {plan === 'basic' && (
              <Button onClick={() => setLocation("/upgrade")} className="w-full">Jetzt auf Pro upgraden</Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-6">
          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut size={18} className="text-muted-foreground mr-2"/> Abmelden
          </Button>
          <Button variant="outline" className="w-full justify-start border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleReset}>
            <ShieldAlert size={18} className="mr-2"/> Alle Daten löschen (Hard Reset)
          </Button>
        </div>
      </div>

      <BottomNav />
    </PageTransition>
  );
}
