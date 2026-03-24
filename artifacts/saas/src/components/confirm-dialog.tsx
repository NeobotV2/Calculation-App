import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Bestätigen", destructive = false }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[70] bg-card border border-border/40 rounded-3xl p-6 max-w-sm mx-auto"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${destructive ? "bg-destructive/10" : "bg-primary/10"}`}>
                <AlertTriangle size={24} className={destructive ? "text-destructive" : "text-primary"} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1 h-12">Abbrechen</Button>
              <Button
                variant={destructive ? "destructive" : "default"}
                onClick={() => { onConfirm(); onClose(); }}
                className="flex-1 h-12"
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
