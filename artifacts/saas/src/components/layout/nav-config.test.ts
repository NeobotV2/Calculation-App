import { describe, it, expect } from "vitest";
import {
  NAV_ITEMS,
  consumeIntendedPath,
  getRouteTransitionKey,
  getShellMode,
  isNavActive,
  isPublicRoute,
  isRememberablePath,
  normalizePath,
  peekIntendedPath,
  rememberIntendedPath,
  resolveAuthGuard,
} from "./nav-config";

/** Aktiver Eintrag einer Liste (genau einer oder keiner). */
function activeIds(items: readonly { id: string; href: string }[], location: string): string[] {
  return items.filter((i) => isNavActive(i.href, location)).map((i) => i.id);
}

const desktopItems = [NAV_ITEMS.desktop.primary, ...NAV_ITEMS.desktop.groups.flatMap((g) => g.items)];

describe("NAV_ITEMS", () => {
  it("mobile: Start · Objekte · Neu · Controlling · Mehr", () => {
    expect(NAV_ITEMS.mobile.map((i) => i.label)).toEqual(["Start", "Objekte", "Neu", "Controlling", "Mehr"]);
    expect(NAV_ITEMS.mobile.map((i) => i.href)).toEqual(["/", "/objekte", "/kalkulation/neu", "/auswertung", "/mehr"]);
  });

  it("desktop: primary button and three groups", () => {
    expect(NAV_ITEMS.desktop.primary.label).toBe("Neue Kalkulation");
    expect(NAV_ITEMS.desktop.groups.map((g) => g.label)).toEqual(["Arbeiten", "Auswerten", "Stammdaten"]);
    expect(NAV_ITEMS.desktop.groups.map((g) => g.items.map((i) => i.label))).toEqual([
      ["Start", "Objekte", "Ausschreibung"],
      ["Controlling"],
      ["Verrechnungssatz", "Vorlagen", "Einstellungen"],
    ]);
    expect(NAV_ITEMS.desktop.account.href).toBe("/konto");
  });

  it("never uses the bare label „Kalkulation“", () => {
    const labels = [...NAV_ITEMS.mobile, ...desktopItems].map((i) => i.label);
    expect(labels).not.toContain("Kalkulation");
    expect(labels).not.toContain("Berichte");
  });
});

describe("isNavActive", () => {
  it("/kalkulation/neu → Neu (mobile) and the primary button (desktop)", () => {
    expect(activeIds(NAV_ITEMS.mobile, "/kalkulation/neu")).toEqual(["neu"]);
    expect(activeIds(NAV_ITEMS.mobile, "/kalkulation/neu/raeume")).toEqual(["neu"]);
    expect(activeIds(desktopItems, "/kalkulation/neu/objekt")).toEqual(["neue-kalkulation"]);
  });

  it("/kalkulation/<id> (edit) → Objekte", () => {
    expect(activeIds(NAV_ITEMS.mobile, "/kalkulation/abc")).toEqual(["objekte"]);
    expect(activeIds(NAV_ITEMS.mobile, "/kalkulation/abc/preis")).toEqual(["objekte"]);
    expect(activeIds(desktopItems, "/kalkulation/abc")).toEqual(["objekte"]);
  });

  it("/verrechnungssatz → Mehr on mobile, Verrechnungssatz on desktop", () => {
    expect(activeIds(NAV_ITEMS.mobile, "/verrechnungssatz")).toEqual(["mehr"]);
    expect(activeIds(desktopItems, "/verrechnungssatz")).toEqual(["verrechnungssatz"]);
  });

  it("/ausschreibung and /vorlagen → Mehr on mobile, own item on desktop", () => {
    expect(activeIds(NAV_ITEMS.mobile, "/ausschreibung")).toEqual(["mehr"]);
    expect(activeIds(NAV_ITEMS.mobile, "/vorlagen")).toEqual(["mehr"]);
    expect(activeIds(desktopItems, "/ausschreibung")).toEqual(["ausschreibung"]);
    expect(activeIds(desktopItems, "/vorlagen")).toEqual(["vorlagen"]);
  });

  it("/objekte/x/winterdienst → Objekte", () => {
    expect(activeIds(NAV_ITEMS.mobile, "/objekte/x/winterdienst")).toEqual(["objekte"]);
    expect(activeIds(desktopItems, "/objekte/x/winterdienst")).toEqual(["objekte"]);
  });

  it("Start only on / exactly", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/", "/objekte")).toBe(false);
  });

  it("Controlling incl. detail; Einstellungen incl. sections", () => {
    expect(activeIds(NAV_ITEMS.mobile, "/auswertung/p1")).toEqual(["controlling"]);
    expect(activeIds(desktopItems, "/einstellungen/firma")).toEqual(["einstellungen"]);
    expect(activeIds(NAV_ITEMS.mobile, "/einstellungen/firma")).toEqual(["mehr"]);
  });

  it("Konto & Plan covers /konto and /upgrade", () => {
    expect(isNavActive("/konto", "/konto")).toBe(true);
    expect(isNavActive("/konto", "/upgrade")).toBe(true);
    expect(isNavActive("/konto", "/objekte")).toBe(false);
  });

  it("ignores query strings and trailing slashes", () => {
    expect(isNavActive("/objekte", "/objekte/?q=1")).toBe(true);
    expect(normalizePath("/objekte/")).toBe("/objekte");
    expect(normalizePath("")).toBe("/");
  });
});

describe("getShellMode", () => {
  it("flow routes are focus", () => {
    expect(getShellMode("/kalkulation/neu/raeume")).toBe("focus");
    expect(getShellMode("/kalkulation/neu")).toBe("focus");
    expect(getShellMode("/kalkulation/abc")).toBe("focus");
    expect(getShellMode("/kalkulation")).toBe("focus");
  });

  it("print and public routes are none", () => {
    expect(getShellMode("/print/x")).toBe("none");
    expect(getShellMode("/print/x/intern")).toBe("none");
    expect(getShellMode("/login")).toBe("none");
    expect(getShellMode("/willkommen")).toBe("none");
    expect(getShellMode("/impressum")).toBe("none");
  });

  it("everything else is app (incl. unknown routes)", () => {
    expect(getShellMode("/")).toBe("app");
    expect(getShellMode("/objekte")).toBe("app");
    expect(getShellMode("/objekte/neu")).toBe("app");
    expect(getShellMode("/objekte/x/hms")).toBe("app");
    expect(getShellMode("/verrechnungssatz")).toBe("app");
    expect(getShellMode("/einstellungen/firma")).toBe("app");
    expect(getShellMode("/gibt-es-nicht")).toBe("app");
    // "/printer" ist keine Druckroute
    expect(getShellMode("/printer")).toBe("app");
  });
});

describe("getRouteTransitionKey", () => {
  it("keeps flow steps, workspace tabs and settings sections on one key", () => {
    expect(getRouteTransitionKey("/kalkulation/neu/objekt")).toBe(getRouteTransitionKey("/kalkulation/neu/raeume"));
    expect(getRouteTransitionKey("/objekte/p1")).toBe(getRouteTransitionKey("/objekte/p1/winterdienst"));
    expect(getRouteTransitionKey("/einstellungen")).toBe(getRouteTransitionKey("/einstellungen/firma"));
  });

  it("differs between pages and objects", () => {
    expect(getRouteTransitionKey("/objekte/p1")).not.toBe(getRouteTransitionKey("/objekte/p2"));
    expect(getRouteTransitionKey("/objekte")).not.toBe(getRouteTransitionKey("/objekte/p1"));
    expect(getRouteTransitionKey("/kalkulation/neu")).not.toBe(getRouteTransitionKey("/kalkulation/p1"));
  });
});

describe("resolveAuthGuard", () => {
  const fresh = { isAuthenticated: false, hasSeenSplash: false, hasOnboarded: false };
  const seen = { isAuthenticated: false, hasSeenSplash: true, hasOnboarded: false };
  const onboarded = { isAuthenticated: false, hasSeenSplash: true, hasOnboarded: true };
  const loggedInFreshDevice = { isAuthenticated: true, hasSeenSplash: false, hasOnboarded: false };

  it("never sends authenticated users to /willkommen or /onboarding", () => {
    expect(resolveAuthGuard("/print/p1", loggedInFreshDevice)).toEqual({ kind: "allow" });
    expect(resolveAuthGuard("/objekte", loggedInFreshDevice)).toEqual({ kind: "allow" });
  });

  it("authenticated users leave /login and /register (resume or /)", () => {
    expect(resolveAuthGuard("/login", loggedInFreshDevice)).toEqual({ kind: "resume", fallback: "/" });
    expect(resolveAuthGuard("/register", loggedInFreshDevice)).toEqual({ kind: "resume", fallback: "/" });
    expect(resolveAuthGuard("/", loggedInFreshDevice)).toEqual({ kind: "resume" });
  });

  it("new visitors land on /willkommen and the deep link is remembered", () => {
    expect(resolveAuthGuard("/print/p1", fresh)).toEqual({ kind: "redirect", to: "/willkommen", remember: true });
    expect(resolveAuthGuard("/", fresh)).toEqual({ kind: "redirect", to: "/willkommen", remember: false });
  });

  it("public pages stay reachable for new visitors", () => {
    expect(resolveAuthGuard("/login", fresh)).toEqual({ kind: "allow" });
    expect(resolveAuthGuard("/passwort-reset", fresh)).toEqual({ kind: "allow" });
    expect(resolveAuthGuard("/willkommen", fresh)).toEqual({ kind: "allow" });
  });

  it("after the splash, app routes go to onboarding", () => {
    expect(resolveAuthGuard("/objekte", seen)).toEqual({ kind: "redirect", to: "/onboarding", remember: true });
    expect(resolveAuthGuard("/onboarding", seen)).toEqual({ kind: "allow" });
  });

  it("onboarded demo users resume on / and are allowed elsewhere", () => {
    expect(resolveAuthGuard("/", onboarded)).toEqual({ kind: "resume" });
    expect(resolveAuthGuard("/objekte", onboarded)).toEqual({ kind: "allow" });
  });
});

describe("intended path", () => {
  it("only remembers app routes", () => {
    expect(isRememberablePath("/print/p1")).toBe(true);
    expect(isRememberablePath("/")).toBe(false);
    expect(isRememberablePath("/login")).toBe(false);
  });

  it("is a safe no-op without sessionStorage (node)", () => {
    expect(() => rememberIntendedPath("/print/p1")).not.toThrow();
    expect(peekIntendedPath()).toBeNull();
    expect(consumeIntendedPath()).toBeNull();
  });

  it("round-trips through sessionStorage when available", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    const g = globalThis as unknown as { window?: unknown };
    const prev = g.window;
    g.window = { sessionStorage: storage };
    try {
      rememberIntendedPath("/print/p1/");
      expect(peekIntendedPath()).toBe("/print/p1");
      expect(consumeIntendedPath()).toBe("/print/p1");
      expect(consumeIntendedPath()).toBeNull();
      rememberIntendedPath("/login");
      expect(peekIntendedPath()).toBeNull();
    } finally {
      g.window = prev;
    }
  });

  it("isPublicRoute matches sub paths", () => {
    expect(isPublicRoute("/passwort-reset")).toBe(true);
    expect(isPublicRoute("/objekte")).toBe(false);
  });
});
