import { describe, expect, it, vi } from "vitest";
import { createBackGuard, whenHistorySettled, type BackGuardEnv } from "./back-guard";

/** Minimale History mit Stapel und popstate (synchron). */
function fakeEnv() {
  const stack: unknown[] = [null];
  let index = 0;
  const listeners = new Set<() => void>();
  const env: BackGuardEnv & { stack: unknown[]; index: () => number; navigate: (state: unknown) => void } = {
    stack,
    index: () => index,
    history: {
      get state() {
        return stack[index];
      },
      pushState(data: unknown) {
        stack.splice(index + 1);
        stack.push(data);
        index = stack.length - 1;
      },
      back() {
        if (index === 0) return;
        index -= 1;
        listeners.forEach((l) => l());
      },
    },
    addEventListener: (_t, l) => void listeners.add(l),
    removeEventListener: (_t, l) => void listeners.delete(l),
    navigate(state: unknown) {
      env.history.pushState(state, "");
    },
  };
  return env;
}

describe("createBackGuard (Zurück bei ungespeichertem Sheet)", () => {
  it("back only removes the guard entry and asks the sheet to close", () => {
    const env = fakeEnv();
    const onBack = vi.fn();
    const guard = createBackGuard(env, onBack);
    guard.arm();
    expect(env.stack).toHaveLength(2);
    env.history.back();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(env.index()).toBe(0);
    // Bereits verbraucht: disarm geht nicht noch einmal zurück.
    guard.disarm();
    expect(env.index()).toBe(0);
  });

  it("closing normally removes its own entry again", () => {
    const env = fakeEnv();
    const onBack = vi.fn();
    const guard = createBackGuard(env, onBack);
    guard.arm();
    guard.arm();
    expect(env.stack).toHaveLength(2);
    guard.disarm();
    expect(env.index()).toBe(0);
    expect(onBack).not.toHaveBeenCalled();
  });

  it("after a navigation it leaves the history alone", () => {
    const env = fakeEnv();
    const guard = createBackGuard(env, vi.fn());
    guard.arm();
    env.navigate(null);
    guard.disarm();
    expect(env.index()).toBe(2);
  });

  it("stacked overlays: back closes only the top one", () => {
    const env = fakeEnv();
    const lower = vi.fn();
    const upper = vi.fn();
    const a = createBackGuard(env, lower);
    const b = createBackGuard(env, upper);
    a.arm();
    b.arm();
    env.history.back();
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
    env.history.back();
    expect(lower).toHaveBeenCalledTimes(1);
  });
});

/**
 * History wie im Browser: pushState/replaceState synchron, back() asynchron —
 * die Traversierung läuft erst mit `flush()` und geht vom DANN aktuellen
 * Eintrag aus (wie Chrome/Firefox); danach popstate.
 */
function browserEnv(initialUrl = "#/objekte/o1") {
  const stack: { state: unknown; url: string }[] = [{ state: null, url: initialUrl }];
  let index = 0;
  const listeners = new Set<() => void>();
  const pending: (() => void)[] = [];
  const env = {
    stack,
    index: () => index,
    urls: () => stack.map((e) => e.url),
    url: () => stack[index].url,
    history: {
      get state() {
        return stack[index].state;
      },
      pushState(data: unknown, _u: string, url?: string) {
        stack.splice(index + 1);
        stack.push({ state: data, url: url ?? stack[index].url });
        index = stack.length - 1;
      },
      replaceState(data: unknown, _u: string, url?: string) {
        stack[index] = { state: data, url: url ?? stack[index].url };
      },
      back() {
        pending.push(() => {
          if (index === 0) return;
          index -= 1;
          listeners.forEach((l) => l());
        });
      },
    },
    addEventListener: (_t: string, l: () => void) => void listeners.add(l),
    removeEventListener: (_t: string, l: () => void) => void listeners.delete(l),
    flush() {
      while (pending.length) pending.shift()!();
    },
  };
  return env as typeof env & BackGuardEnv;
}

describe("createBackGuard — verschachtelte Sheets, asynchrones back()", () => {
  it("saving an inner sheet while the outer one becomes dirty asks nothing and keeps one entry", () => {
    const env = browserEnv();
    const outerBack = vi.fn();
    const innerBack = vi.fn();
    const inner = createBackGuard(env, innerBack);
    inner.arm(); // Fläche bearbeitet
    expect(env.stack).toHaveLength(2);
    // Ein Commit: Flächen-Sheet schließt (disarm), Modul-Editor wird dirty (arm).
    inner.disarm();
    const outer = createBackGuard(env, outerBack);
    outer.arm();
    env.flush();
    expect(outerBack).not.toHaveBeenCalled();
    expect(innerBack).not.toHaveBeenCalled();
    expect(env.stack).toHaveLength(2);
    expect(env.index()).toBe(1);
    // Nutzer drückt Zurück: jetzt fragt der Modul-Editor.
    env.history.back();
    env.flush();
    expect(outerBack).toHaveBeenCalledTimes(1);
    expect(env.index()).toBe(0);
  });

  it("'Speichern & nächste': outer arms before the inner disarms — no orphan entry", () => {
    const env = browserEnv();
    const inner = createBackGuard(env, vi.fn());
    const outer = createBackGuard(env, vi.fn());
    inner.arm();
    outer.arm();
    inner.disarm();
    env.flush();
    expect(env.stack).toHaveLength(2);
    outer.disarm();
    env.flush();
    expect(env.index()).toBe(0);
    // Ein Zurück verlässt jetzt die Seite (kein toter Eintrag).
    expect(env.url()).toBe("#/objekte/o1");
  });

  it("re-arming before the browser ran its back() neither prompts nor leaves an entry", () => {
    const env = browserEnv();
    const first = vi.fn();
    const second = vi.fn();
    const g1 = createBackGuard(env, first);
    g1.arm();
    g1.disarm(); // back() angefordert, noch nicht ausgeführt
    const g2 = createBackGuard(env, second);
    g2.arm();
    env.flush();
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(env.index()).toBe(1);
    g2.disarm();
    env.flush();
    expect(env.index()).toBe(0);
  });

  it("two dirty sheets share one entry; Back asks the top one, the lower one stays guarded", () => {
    const env = browserEnv();
    const lower = vi.fn();
    const upper = vi.fn();
    const a = createBackGuard(env, lower);
    const b = createBackGuard(env, upper);
    a.arm();
    b.arm();
    expect(env.stack).toHaveLength(2);
    env.history.back();
    env.flush();
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
    // Der untere Guard hat wieder einen Eintrag: das nächste Zurück fragt ihn.
    expect(env.index()).toBe(1);
    env.history.back();
    env.flush();
    expect(lower).toHaveBeenCalledTimes(1);
    expect(env.index()).toBe(0);
  });

  it("whenHistorySettled defers a replace navigation until the sheet entry is gone", () => {
    const env = browserEnv("#/objekte/o1");
    const g = createBackGuard(env, vi.fn());
    g.arm(); // neues Modul bearbeitet
    const replaceTab = () => env.history.replaceState(null, "", "#/objekte/o1/winterdienst");
    whenHistorySettled(replaceTab, env); // saveWinterdienst → goTab, Sheet noch offen
    expect(env.url()).toBe("#/objekte/o1");
    g.disarm(); // Sheet schließt
    expect(env.url()).toBe("#/objekte/o1");
    env.flush();
    // Der Tab-Wechsel ersetzt den Seiteneintrag: ein Zurück verlässt das Objekt.
    expect(env.index()).toBe(0);
    expect(env.url()).toBe("#/objekte/o1/winterdienst");
    // Ohne offenes Sheet sofort.
    const now = vi.fn();
    whenHistorySettled(now, env);
    expect(now).toHaveBeenCalledTimes(1);
  });
});
