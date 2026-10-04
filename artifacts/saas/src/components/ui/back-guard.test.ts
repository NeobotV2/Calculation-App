import { describe, expect, it, vi } from "vitest";
import { createBackGuard, type BackGuardEnv } from "./back-guard";

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
