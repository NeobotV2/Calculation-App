import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Crown, ShieldCheck, Sparkles, FileText, Building2, Clock, Star } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PRICING, formatCents, isPaidPlan } from "@/lib/billing-config";
import { isFoundingOfferAvailable, getFoundingOfferRemainingSlots, getFoundingOfferMaxSlots } from "@/services/founding-offer-service";

const BENEFITS = [
  { icon: Building2, text: "Unbegrenzte Objekte & Räume kalkulieren" },
  { icon: FileText, text: "Professionelle PDF-Angebote ohne Wasserzeichen" },
  { icon: Sparkles, text: "Vorlagen speichern & wiederverwenden" },
  { icon: Clock, text: "Verliere keine Marge durch Rechenfehler" },
  { icon: Star, text: "Eigenes Branding: Logo, Kopf- & Fußzeile" },
];

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const plan = useStore((s) => s.plan);
  const upgradePlan = useStore((s) => s.upgradePlan);

  const foundingAvailable = isFoundingOfferAvailable();
  const remainingSlots = getFoundingOfferRemainingSlots();
  const maxSlots = getFoundingOfferMaxSlots();

  if (isPaidPlan(plan)) {
    return (
      <PageTransition className="min-h-screen bg-background flex flex-col">
        <div className="safe-header p-4 pt-14 md:pt-8">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full bg-card border border-border/50">
            <ArrowLeft size={20} />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-20">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
            <Crown size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">Du bist Pro!</h1>
          <p className="text-muted-foreground max-w-sm">Du hast bereits vollen Zugang zu allen Pro-Funktionen. Viel Erfolg mit deinen Kalkulationen!</p>
          <Button onClick={() => setLocation("/")} variant="outline" className="mt-8">Zurück zum Start</Button>
        </div>
      </PageTransition>
    );
  }

  const handleSelectPlan = (planKey: "pro_monthly" | "pro_annual" | "founding_annual") => {
    upgradePlan(planKey);
    toast.success("Erfolgreich auf Pro upgegradet!");
    setLocation("/");
  };

  return (
    <PageTransition className="min-h-screen bg-background flex flex-col">
      <div className="safe-header p-4 pt-14 md:pt-8 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="absolute left-4 top-14 md:top-8 rounded-full bg-card border border-border/50">
          <ArrowLeft size={20} />
        </Button>
      </div>

      <div className="flex-1 px-6 pb-12 flex flex-col max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-10 pt-4"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Crown size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-foreground">
            Erstelle professionelle Angebote in Minuten.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
            Kalkuliere sicher, spare Zeit und verliere keine Marge durch Rechenfehler.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="space-y-3 mb-10"
        >
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{text}</span>
            </div>
          ))}
        </motion.div>

        <div className="space-y-4 mb-8">
          {foundingAvailable && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => handleSelectPlan("founding_annual")}
                className="w-full text-left bg-card border-2 border-primary rounded-[1.5rem] p-6 relative shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15 transition-shadow"
              >
                <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full tracking-wider uppercase">
                  Empfohlen
                </div>
                <div className="flex items-start justify-between mb-4 mt-1">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Founding Member</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Einmaliges Angebot — nur für die ersten {maxSlots} Nutzer</p>
                  </div>
                  <Sparkles size={20} className="text-primary mt-1" />
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-foreground">{formatCents(PRICING.foundingAnnual.effectiveMonthlyFromAnnualCents)}</span>
                  <span className="text-muted-foreground text-sm">/ Monat</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {formatCents(PRICING.foundingAnnual.annualPriceCents)} / Jahr · danach regulär {formatCents(PRICING.proAnnual.annualPriceCents)} / Jahr
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Noch {remainingSlots} von {maxSlots} Plätzen frei
                  </span>
                  <span className="text-xs font-semibold text-success">
                    {Math.round((1 - PRICING.foundingAnnual.annualPriceCents / PRICING.proAnnual.annualPriceCents) * 100)}% sparen
                  </span>
                </div>
              </button>
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: foundingAvailable ? 0.15 : 0.1 }}
          >
            <button
              onClick={() => handleSelectPlan("pro_annual")}
              className={`w-full text-left bg-card rounded-[1.5rem] p-6 relative transition-shadow hover:shadow-lg ${
                foundingAvailable
                  ? "border border-border/40"
                  : "border-2 border-primary shadow-lg shadow-primary/10"
              }`}
            >
              {!foundingAvailable && (
                <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full tracking-wider uppercase">
                  Empfohlen
                </div>
              )}
              <div className="flex items-start justify-between mb-4 mt-1">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Pro Jährlich</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Jährliche Abrechnung</p>
                </div>
                <Crown size={20} className="text-primary mt-1" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-foreground">{formatCents(PRICING.proAnnual.effectiveMonthlyFromAnnualCents)}</span>
                <span className="text-muted-foreground text-sm">/ Monat</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {formatCents(PRICING.proAnnual.annualPriceCents)} / Jahr
              </p>
              {!foundingAvailable && (
                <span className="text-xs font-semibold text-success">
                  {Math.round((1 - PRICING.proAnnual.annualPriceCents / (PRICING.proMonthly.monthlyPriceCents * 12)) * 100)}% sparen vs. monatlich
                </span>
              )}
            </button>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: foundingAvailable ? 0.2 : 0.15 }}
          >
            <button
              onClick={() => handleSelectPlan("pro_monthly")}
              className="w-full text-left bg-card border border-border/40 rounded-[1.5rem] p-6 transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Pro Monatlich</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Monatliche Abrechnung, jederzeit kündbar</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-foreground">{formatCents(PRICING.proMonthly.monthlyPriceCents)}</span>
                <span className="text-muted-foreground text-sm">/ Monat</span>
              </div>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <Button
            onClick={() => handleSelectPlan(foundingAvailable ? "founding_annual" : "pro_annual")}
            size="lg"
            className="w-full h-16 text-lg rounded-2xl"
          >
            Jetzt Pro freischalten
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-2 pb-safe"
        >
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} /> Sicher bezahlen über den App Store. Jederzeit kündbar.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Es gelten unsere AGB und Datenschutzbestimmungen. Abonnements verlängern sich automatisch.
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
