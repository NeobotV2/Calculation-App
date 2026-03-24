import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Crown, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const upgradePlan = useStore(s => s.upgradePlan);

  const handleUpgrade = () => {
    upgradePlan();
    toast.success("Erfolgreich auf PRO upgegradet!");
    setLocation("/");
  };

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="p-4 pt-14 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="absolute left-4 top-14 rounded-full bg-card border border-border/50">
          <ArrowLeft size={20} />
        </Button>
      </div>

      <div className="flex-1 px-6 pb-12 flex flex-col pt-4">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Crown size={48} className="text-primary" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-4 text-foreground">Hol dir das Maximum.</h1>
          <p className="text-muted-foreground text-lg px-2">Schalte alle Profi-Funktionen frei und skaliere dein Reinigungsunternehmen.</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border-2 border-primary/50 rounded-[2rem] p-8 relative mb-8 shadow-xl shadow-black/10"
        >
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-[1.8rem] tracking-wider uppercase">Empfohlen</div>
          
          <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Pro Plan</h2>
          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-5xl font-bold text-foreground">29€</span>
            <span className="text-muted-foreground text-lg">/ Monat</span>
          </div>

          <div className="space-y-5 mb-10">
            {[
              "Unbegrenzte Objekte & Räume",
              "PDF-Angebote generieren",
              "Eigenes Firmenlogo auf PDF",
              "Detaillierte Deckungsbeitragsrechnung",
              "Cloud-Synchronisation (demnächst)"
            ].map((ft, i) => (
              <div key={i} className="flex items-start gap-4">
                <CheckCircle2 size={24} className="text-primary shrink-0" />
                <span className="text-foreground text-base">{ft}</span>
              </div>
            ))}
          </div>

          <Button onClick={handleUpgrade} size="lg" className="w-full text-lg h-16 rounded-2xl">
            Jetzt PRO aktivieren
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
            <ShieldCheck size={16}/> Sicher bezahlen via Stripe. Jederzeit kündbar.
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}