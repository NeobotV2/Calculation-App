/* ─────────────────────────────────────────────────────────────────────────
   „Zurück“ schließt ein Overlay statt die Seite zu verlassen.

   Solange ein Editor-Sheet ungespeicherte Änderungen hat, liegt ein
   zusätzlicher History-Eintrag (gleiche URL, Marker im state) oben auf dem
   Stapel. Browser-/Android-Zurück (use-android-back → history.back) entfernt
   nur diesen Eintrag; das Sheet fragt dann „Änderungen verwerfen?“, statt
   mitsamt der Eingaben zu verschwinden. Gleiche URL ⇒ kein hashchange, der
   Router reagiert nicht.
   ───────────────────────────────────────────────────────────────────────── */

const KEY = "__ccOverlay";
let seq = 0;

export interface BackGuardEnv {
  history: { readonly state: unknown; pushState(data: unknown, unused: string): void; back(): void };
  addEventListener(type: "popstate", listener: () => void): void;
  removeEventListener(type: "popstate", listener: () => void): void;
}

export interface BackGuard {
  /** Eintrag anlegen und auf „Zurück“ hören (idempotent). */
  arm(): void;
  /** Hören beenden; liegt der eigene Eintrag noch oben, wird er entfernt. */
  disarm(): void;
}

function markerOf(state: unknown): unknown {
  return state && typeof state === "object" ? (state as Record<string, unknown>)[KEY] : undefined;
}

export function createBackGuard(env: BackGuardEnv, onBack: () => void): BackGuard {
  const id = `overlay-${++seq}`;
  let armed = false;

  const onPop = () => {
    if (!armed) return;
    // Noch der eigene Eintrag oben: ein darüberliegendes Overlay hat „Zurück“ verbraucht.
    if (markerOf(env.history.state) === id) return;
    armed = false;
    env.removeEventListener("popstate", onPop);
    onBack();
  };

  return {
    arm() {
      if (armed) return;
      armed = true;
      const prev = env.history.state && typeof env.history.state === "object" ? (env.history.state as object) : {};
      env.history.pushState({ ...prev, [KEY]: id }, "");
      env.addEventListener("popstate", onPop);
    },
    disarm() {
      if (!armed) return;
      armed = false;
      env.removeEventListener("popstate", onPop);
      // Nach einer Navigation liegt ein fremder Eintrag oben — dann nichts zurücknehmen.
      if (markerOf(env.history.state) === id) env.history.back();
    },
  };
}
