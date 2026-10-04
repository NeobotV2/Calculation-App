import { useMemo, type ReactNode } from "react";
import { Router } from "wouter";
import { navigate } from "wouter/use-hash-location";

/** Wie `useHashLocation.hrefs` (dort nicht typisiert): Links zeigen auf „#/pfad“. */
const hashHref = (href: string) => `#${href}`;

/**
 * Hält für eine Seite die Adresse fest, unter der sie gerendert wurde.
 * Beim Seitenwechsel bleibt die alte Seite während der Ausblendung
 * (AnimatePresence mode="wait") gemountet; ohne diese Klammer läsen ihre
 * useRoute/useLocation schon die neue Adresse — z. B. „Objekt nicht gefunden“
 * beim Verlassen oder ein Rücksprung des Flows auf „Neue Kalkulation“.
 * Navigieren bleibt unverändert (Hash-Navigation).
 */
export function RouteScope({ location, children }: { location: string; children: ReactNode }) {
  const hook = useMemo(() => {
    const useScopedLocation = (): [string, typeof navigate] => [location, navigate];
    return useScopedLocation;
  }, [location]);
  return (
    <Router hook={hook} hrefs={hashHref}>
      {children}
    </Router>
  );
}
