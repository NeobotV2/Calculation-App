import { useEffect } from "react";
import { useLocation } from "wouter";

/** Leitet sofort (ohne History-Eintrag) auf `to` weiter. */
function useReplaceRedirect(to: string) {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
}

/** `/kalkulation` → Flow „Neue Kalkulation". */
export function KalkulationListRedirect() {
  useReplaceRedirect("/kalkulation/neu");
  return null;
}

/** `/objekte/neu` (alter Objekt-Assistent) → Flow „Neue Kalkulation". */
export function ObjekteNeuRedirect() {
  useReplaceRedirect("/kalkulation/neu");
  return null;
}

/** `/stundensatz` (alter Name) → Verrechnungssatz-Rechner. */
export function StundensatzRedirect() {
  useReplaceRedirect("/verrechnungssatz");
  return null;
}
