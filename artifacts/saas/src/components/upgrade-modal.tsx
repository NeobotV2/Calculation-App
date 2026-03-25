import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, X, CheckCircle2, Lock } from "lucide-react";
import { useStore } from "@/store/use-store";
import { useLocation } from "wouter";
import { type UpgradeTrigger, UPGRADE_TRIGGER_COPY } from "@/lib/billing-config";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
  triggerReason?: UpgradeTrigger;
}

export function UpgradeModal({ open, onClose, reason, triggerReason }: UpgradeModalProps) {
  const [, setLocation] = useLocation();

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
            onClick={onClose}
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
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <h2 className="text-3xl font-semibold tracking-tight mb-2">
                {triggerCopy?.headline || "Pro freischalten"}
              </h2>

              {displayReason && (
                <div className="flex items-start gap-3 bg-card border border-border/40 rounded-2xl p-4 mb-6 mt-4">
                  <Lock size={18} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{displayReason}</p>
                </div>
              )}

              <div className="my-6 space-y-3">
                {[
                  "Unbegrenzte Objekte & Kalkulationen",
                  "Finale PDF-Angebote ohne Wasserzeichen",
                  "Vorlagen & Wiederverwendung",
                  "Volle Plausibilitätsprüfung",
                  "Eigenes Branding & Logo",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => { onClose(); setLocation("/upgrade"); }}
                size="lg"
                className="w-full h-14 text-lg mt-2"
              >
                Jetzt Pro freischalten
              </Button>

              <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground mt-4 py-2">
                Später
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
