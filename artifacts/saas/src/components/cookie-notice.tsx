import { useState, useEffect, useId } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getShellMode } from "@/components/layout/nav-config";

const COOKIE_KEY = "cleancalc-cookie-consent";

/**
 * Hinweis zu lokaler Speicherung/Cookies. Sitzt unter md über der BottomNav
 * (App-Shell), sonst am unteren Rand; ruhige Einblendung (120 ms).
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const [location] = useLocation();
  const titleId = useId();
  const shellMode = getShellMode(location);
  const aboveNav = shellMode === "app";
  // Im Kalkulations-Flow (eigene Fußleiste) erst nach Verlassen anzeigen.
  const suppressed = shellMode === "focus";

  useEffect(() => {
    let consent: string | null = null;
    try {
      consent = localStorage.getItem(COOKIE_KEY);
    } catch {
      // localStorage nicht verfügbar (z. B. privater Modus) — Hinweis zeigen.
    }
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const persist = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(COOKIE_KEY, value);
    } catch {
      // Speichern nicht möglich — Auswahl gilt nur für diese Sitzung.
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && !suppressed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: "linear" }}
          className={cn(
            "no-print fixed inset-x-0 z-nav px-4 pb-4 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))]",
            aboveNav
              ? "bottom-[calc(var(--nav-h)+var(--safe-bottom))] md:bottom-[var(--safe-bottom)] md:left-(--rail-w) lg:left-(--sidebar-w)"
              : "bottom-[var(--safe-bottom)]",
          )}
        >
          <section
            aria-labelledby={titleId}
            className="mx-auto max-w-md rounded-lg border border-border bg-card p-4 text-card-foreground shadow-overlay"
          >
            <h2 id={titleId} className="text-sm font-semibold text-foreground">
              Cookies & Datenschutz
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Diese App speichert Daten lokal auf Ihrem Gerät. Bei Nutzung eines Accounts werden Daten verschlüsselt
              in der Cloud gespeichert. Mehr dazu in der{" "}
              <Link href="/datenschutz" className="text-primary underline-offset-4 hover:underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => persist("declined")} className="flex-1">
                Nur notwendige
              </Button>
              <Button size="sm" onClick={() => persist("accepted")} className="flex-1">
                Akzeptieren
              </Button>
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
