import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, X, CheckCircle2, Lock, Minus } from "lucide-react";
import { useStore } from "@/store/use-store";
import { useLocation } from "wouter";
import { type UpgradeTrigger, UPGRADE_TRIGGER_COPY } from "@/lib/billing-config";
import { trackPaywallViewed, trackPaywallDismissed, trackUpgradeCtaClicked } from "@/services/analytics-service";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
  triggerReason?: UpgradeTrigger;
}

export function UpgradeModal({ open, onClose, reason, triggerReason }: UpgradeModalProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (open && triggerReason) {
      trackPaywallViewed(triggerReason);
    }
  }, [open, triggerReason]);

  const handleClose = () => {
    trackPaywallDismissed(triggerReason);
    onClose();
  };

  const triggerCopy = triggerReason ? UPGRADE_TRIGGER_COPY[triggerReason] : null;
  const displayReason = triggerCopy?.text || reason;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-background rounded-t-3xl border-t border-border max-h-[90vh] overflow-y-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:max-w-lg md:w-full md:max-h-[85vh]"
          >
            <div className="p-6 pb-safe">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Crown size={28} className="text-primary" />
                </div>
                <button onClick={handleClose} className="w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <h2 className="text-3xl font-semibold tracking-tight mb-2">
                {triggerCopy?.headline || "Funktion im Pro-Plan verfügbar"}
              </h2>

              {displayReason && (
                <div className="flex items-start gap-3 bg-card border border-border/40 rounded-2xl p-4 mb-6 mt-4">
                  <Lock size={18} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{displayReason}</p>
                </div>
              )}

              <div className="my-6">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Basic vs. Pro im Vergleich</p>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm items-center">
                  <span className="text-muted-foreground font-medium"></span>
                  <span className="text-muted-foreground text-xs font-semibold text-center">Basic</span>
                  <span className="text-primary text-xs font-semibold text-center">Pro</span>

                  {[
                    { label: "Objekte", basic: "1", pro: "Unbegrenzt" },
                    { label: "Räume pro Objekt", basic: "3", pro: "Unbegrenzt" },
                    { label: "PDF-Angebote", basic: false, pro: true },
                    { label: "Vorlagen speichern", basic: false, pro: true },
                    { label: "Eigene Leistungswerte", basic: false, pro: true },
                    { label: "Firmenlogo & Branding", basic: false, pro: true },
                  ].map((row) => (
                    <>
                      <span key={row.label} className="text-foreground">{row.label}</span>
                      <span className="text-center">
                        {typeof row.basic === "string" ? (
                          <span className="text-muted-foreground text-xs">{row.basic}</span>
                        ) : row.basic ? (
                          <CheckCircle2 size={14} className="text-muted-foreground mx-auto" />
                        ) : (
                          <Minus size={14} className="text-muted-foreground/40 mx-auto" />
                        )}
                      </span>
                      <span className="text-center">
                        {typeof row.pro === "string" ? (
                          <span className="text-primary text-xs font-medium">{row.pro}</span>
                        ) : row.pro ? (
                          <CheckCircle2 size={14} className="text-primary mx-auto" />
                        ) : (
                          <Minus size={14} className="text-muted-foreground/40 mx-auto" />
                        )}
                      </span>
                    </>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => { trackUpgradeCtaClicked("paywall_modal"); onClose(); setLocation("/upgrade"); }}
                size="lg"
                className="w-full h-14 text-lg mt-2"
              >
                Pro-Plan ansehen
              </Button>

              <button onClick={handleClose} className="w-full text-center text-sm text-muted-foreground mt-4 py-2">
                Nicht jetzt
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
