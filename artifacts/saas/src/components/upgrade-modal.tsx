import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, X, CheckCircle2, Lock } from "lucide-react";
import { useStore } from "@/store/use-store";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const upgradePlan = useStore((s) => s.upgradePlan);

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
            className="fixed bottom-0 left-0 right-0 z-[60] bg-background rounded-t-3xl border-t border-border max-h-[90vh] overflow-y-auto"
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

              <h2 className="text-3xl font-semibold tracking-tight mb-2">Pro freischalten</h2>

              {reason && (
                <div className="flex items-start gap-3 bg-card border border-border/40 rounded-2xl p-4 mb-6 mt-4">
                  <Lock size={18} className="text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 my-6">
                <div className="bg-card border border-border/40 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Basic</p>
                  <p className="text-lg font-bold">Kostenlos</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>3 Objekte</p>
                    <p>20 Räume/Objekt</p>
                    <p className="line-through opacity-50">PDF-Export</p>
                    <p className="line-through opacity-50">Vorlagen</p>
                  </div>
                </div>
                <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-4 relative">
                  <div className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Empfohlen</div>
                  <p className="text-[10px] uppercase tracking-widest text-primary mb-2 font-semibold">Pro</p>
                  <p className="text-lg font-bold">29€<span className="text-sm font-normal text-muted-foreground">/Mo</span></p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> Unbegrenzt</p>
                    <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> Unbegrenzt</p>
                    <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> PDF-Export</p>
                    <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> Vorlagen</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => { upgradePlan(); toast.success("Erfolgreich auf PRO upgegradet!"); onClose(); }}
                size="lg"
                className="w-full h-14 text-lg mt-2"
              >
                Jetzt upgraden
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
