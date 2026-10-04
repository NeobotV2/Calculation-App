/* ─────────────────────────────────────────────────────────────────────────
   „Zurück“ schließt ein Overlay statt die Seite zu verlassen.

   Solange mindestens ein Editor-Sheet ungespeicherte Änderungen hat, liegt
   GENAU EIN zusätzlicher History-Eintrag (gleiche URL, Marker im state) oben
   auf dem Stapel — gemeinsam für alle scharfen Guards (verschachtelte Sheets:
   Modul-Editor + Flächen-Sheet). Browser-/Android-Zurück (use-android-back →
   history.back) entfernt nur diesen Eintrag; das oberste Sheet fragt dann
   „Änderungen verwerfen?“, statt mitsamt der Eingaben zu verschwinden. Gleiche
   URL ⇒ kein hashchange, der Router reagiert nicht.

   history.back() ist im Browser asynchron. Eigene back()-Aufrufe werden
   gezählt; ihr popstate gilt nie als „Zurück“ des Nutzers, und solange einer
   aussteht, legt ein neu scharfer Guard keinen Eintrag an — das geschieht erst
   nach dem popstate. So entsteht weder eine falsche Rückfrage noch ein
   verwaister Eintrag, wenn ein Sheet schließt und ein anderes im selben
   Moment scharf wird.
   ───────────────────────────────────────────────────────────────────────── */

const KEY = "__ccOverlay";
/** Fehlt das popstate eines eigenen back() so lange, gilt es als verloren. */
const OWN_BACK_TIMEOUT_MS = 1000;
let seq = 0;

export interface BackGuardEnv {
  history: { readonly state: unknown; pushState(data: unknown, unused: string): void; back(): void };
  addEventListener(type: "popstate", listener: () => void): void;
  removeEventListener(type: "popstate", listener: () => void): void;
}

export interface BackGuard {
  /** Auf „Zurück“ hören; legt bei Bedarf den gemeinsamen Eintrag an (idempotent). */
  arm(): void;
  /** Hören beenden; war es der letzte Guard und liegt der Eintrag noch oben, wird er entfernt. */
  disarm(): void;
}

function markerOf(state: unknown): unknown {
  return state && typeof state === "object" ? (state as Record<string, unknown>)[KEY] : undefined;
}

interface Slot {
  onBack: () => void;
}

/** Gemeinsamer Zustand aller Guards einer History (ein Marker-Eintrag, eigene back()-Aufrufe). */
class GuardStack {
  private readonly slots: Slot[] = [];
  /** Marker des eigenen Eintrags, solange er oben liegt; null = keiner. */
  private marker: string | null = null;
  /** Eigene history.back()-Aufrufe, deren popstate noch aussteht. */
  private ownBacks = 0;
  private ownBackTimer: ReturnType<typeof setTimeout> | undefined;
  private waiters: Array<() => void> = [];

  constructor(private readonly env: BackGuardEnv) {
    env.addEventListener("popstate", this.onPop);
  }

  arm(slot: Slot) {
    if (this.slots.includes(slot)) return;
    this.slots.push(slot);
    // Steht ein eigenes back() noch aus, entsteht der Eintrag erst nach dessen popstate.
    if (this.marker === null && this.ownBacks === 0) this.push();
  }

  disarm(slot: Slot) {
    const i = this.slots.indexOf(slot);
    if (i < 0) return;
    this.slots.splice(i, 1);
    if (this.slots.length > 0) return;
    if (this.marker !== null && markerOf(this.env.history.state) === this.marker) {
      this.marker = null;
      this.ownBack();
      return;
    }
    // Nach einer Navigation liegt ein fremder Eintrag oben — nichts zurücknehmen.
    this.marker = null;
    this.settle();
  }

  /** `fn` ausführen, sobald kein Guard scharf ist und kein eigenes back() aussteht. */
  whenSettled(fn: () => void) {
    if (this.isSettled()) fn();
    else this.waiters.push(fn);
  }

  private isSettled() {
    return this.slots.length === 0 && this.ownBacks === 0;
  }

  private settle() {
    if (!this.isSettled()) return;
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((fn) => fn());
  }

  private push() {
    const marker = `overlay-${++seq}`;
    const st = this.env.history.state;
    const prev = st && typeof st === "object" ? (st as object) : {};
    this.env.history.pushState({ ...prev, [KEY]: marker }, "");
    this.marker = marker;
  }

  private ownBack() {
    this.ownBacks += 1;
    clearTimeout(this.ownBackTimer);
    this.ownBackTimer = setTimeout(() => {
      if (this.ownBacks === 0) return;
      this.ownBacks = 0;
      this.reconcile();
    }, OWN_BACK_TIMEOUT_MS);
    this.env.history.back();
  }

  /** Nach eigenem back(): für inzwischen scharfe Guards wieder einen Eintrag anlegen. */
  private reconcile() {
    clearTimeout(this.ownBackTimer);
    if (this.slots.length > 0) {
      if (this.marker === null) this.push();
      return;
    }
    this.settle();
  }

  private readonly onPop = () => {
    if (this.ownBacks > 0) {
      this.ownBacks -= 1;
      if (this.ownBacks === 0) this.reconcile();
      return;
    }
    // Noch der eigene Eintrag oben (z. B. „Vor“ zurück auf ihn): nichts zu tun.
    if (this.marker !== null && markerOf(this.env.history.state) === this.marker) return;
    this.marker = null;
    // „Zurück“ gilt dem obersten Overlay; darunterliegende behalten einen Eintrag.
    const top = this.slots.pop();
    if (this.slots.length > 0) this.push();
    if (top) top.onBack();
    this.settle();
  };
}

const stacks = new WeakMap<BackGuardEnv, GuardStack>();

function stackFor(env: BackGuardEnv): GuardStack {
  let stack = stacks.get(env);
  if (!stack) {
    stack = new GuardStack(env);
    stacks.set(env, stack);
  }
  return stack;
}

export function createBackGuard(env: BackGuardEnv, onBack: () => void): BackGuard {
  const stack = stackFor(env);
  const slot: Slot = { onBack };
  return {
    arm: () => stack.arm(slot),
    disarm: () => stack.disarm(slot),
  };
}

/**
 * Navigation mit `replace` erst ausführen, wenn kein Sheet-Eintrag mehr oben
 * liegt (sonst ersetzte sie den Marker statt der Seite, und „Zurück“ landete
 * auf demselben Objekt). Ohne Browser-History sofort.
 */
export function whenHistorySettled(fn: () => void, env?: BackGuardEnv): void {
  const target = env ?? (typeof window !== "undefined" && window.history ? (window as BackGuardEnv) : undefined);
  if (!target) {
    fn();
    return;
  }
  stackFor(target).whenSettled(fn);
}
