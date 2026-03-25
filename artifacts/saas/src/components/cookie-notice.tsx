import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const COOKIE_KEY = "cleancalc-cookie-consent";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)" }}
        >
          <div className="max-w-md mx-auto bg-card border border-border/40 rounded-2xl p-4 shadow-xl shadow-black/20">
            <p className="text-sm text-foreground mb-1 font-medium">Cookies & Datenschutz</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Diese App speichert Daten lokal auf deinem Gerät. Bei Nutzung eines Accounts werden Daten verschlüsselt in der Cloud gespeichert.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={decline} className="flex-1 h-9 text-xs">
                Nur notwendige
              </Button>
              <Button size="sm" onClick={accept} className="flex-1 h-9 text-xs">
                Akzeptieren
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
