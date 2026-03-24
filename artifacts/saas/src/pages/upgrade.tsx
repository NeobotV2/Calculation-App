import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Crown, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const upgradePlan = useStore(s => s.upgradePlan);

  const handleUpgrade = () => {
    // Mock checkout
    upgradePlan();
    alert("Erfolgreich auf PRO upgegradet! (Mock)");
    setLocation("/");
  };

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="p-4 pt-12 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="absolute left-4 top-12 rounded-full bg-white/5 backdrop-blur-md">
          <ArrowLeft size={20} />
        </Button>
      </div>

      <div className="flex-1 px-6 pb-12 flex flex-col">
        <div className="text-center mb-10 mt-4">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown size={40} className="text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-3">Hol dir das Maximum.</h1>
          <p className="text-muted-foreground text-lg px-4">Schalte alle Profi-Funktionen frei und skaliere dein Reinigungsunternehmen.</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card border-primary/50 rounded-3xl p-6 relative mb-8 overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-primary text-background text-xs font-bold px-3 py-1 rounded-bl-xl">Empfohlen</div>
          
          <h2 className="text-2xl font-bold font-display mb-1 text-white">Pro Plan</h2>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-primary">29€</span>
            <span className="text-muted-foreground">/ Monat</span>
          </div>

          <div className="space-y-4 mb-8">
            {[
              "Unbegrenzte Objekte & Räume",
              "PDF-Angebote generieren",
              "Eigenes Firmenlogo auf PDF",
              "Detaillierte Deckungsbeitragsrechnung",
              "Cloud-Synchronisation (demnächst)"
            ].map((ft, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />
                <span className="text-white/90">{ft}</span>
              </div>
            ))}
          </div>

          <Button onClick={handleUpgrade} size="lg" className="w-full text-lg shadow-xl shadow-primary/30 h-14">
            Jetzt PRO aktivieren
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
            <ShieldCheck size={14}/> Sicher bezahlen via Stripe. Jederzeit kündbar.
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
