import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

// Der Store persistiert über Capacitor/localStorage — im Node-Test durch einen In-Memory-Speicher ersetzt.
vi.mock("@/lib/capacitor-storage", () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: (name: string) => mem.get(name) ?? null,
      setItem: (name: string, value: string) => {
        mem.set(name, value);
      },
      removeItem: (name: string) => {
        mem.delete(name);
      },
    },
  };
});

vi.mock("@/lib/auth-context", () => {
  const ok = async () => ({});
  return {
    useAuth: () => ({
      isSupabaseReady: true,
      isAuthenticated: false,
      signIn: ok,
      signUp: ok,
      resendConfirmation: ok,
      resetPassword: ok,
      updatePassword: ok,
    }),
  };
});

import { getShellMode, PUBLIC_ROUTES } from "@/components/layout/nav-config";
import { CookieNoticePanel } from "@/components/cookie-notice";
import Willkommen from "./willkommen";
import Splash from "./splash";
import Onboarding from "./onboarding";
import Login from "./login";
import Register from "./register";
import PasswortVergessen from "./passwort-vergessen";
import PasswortReset from "./passwort-reset";
import Impressum from "./impressum";
import Datenschutz from "./datenschutz";
import AGB from "./agb";

const PAGES: Record<string, React.ComponentType> = {
  "/willkommen": Willkommen,
  "/splash": Splash,
  "/onboarding": Onboarding,
  "/login": Login,
  "/register": Register,
  "/passwort-vergessen": PasswortVergessen,
  "/passwort-reset": PasswortReset,
  "/impressum": Impressum,
  "/datenschutz": Datenschutz,
  "/agb": AGB,
};

const render = (path: string, node: React.ReactNode) => renderToStaticMarkup(<Router ssrPath={path}>{node}</Router>);

/** Klassen aller Links (`<a>`), die in einem Absatz (`<p>`) stehen. */
function inlineLinkClasses(html: string): string[] {
  const out: string[] = [];
  for (const p of html.matchAll(/<p[\s>][^]*?<\/p>/g)) {
    for (const a of p[0].matchAll(/<a\s[^>]*>/g)) out.push(/class="([^"]*)"/.exec(a[0])?.[1] ?? "");
  }
  return out;
}

describe("public, auth and legal pages", () => {
  it("cover every public route (they render without the app shell)", () => {
    expect(Object.keys(PAGES).sort()).toEqual([...PUBLIC_ROUTES].sort());
    for (const route of PUBLIC_ROUTES) expect(getShellMode(route)).toBe("none");
  });

  it.each(Object.entries(PAGES))("%s has exactly one <main> landmark", (path, Page) => {
    const html = render(path, <Page />);
    const mains = html.match(/<main[\s>][^>]*/g) ?? [];
    expect(mains).toHaveLength(1);
    expect(mains[0]).toContain('id="main-content"');
  });

  it.each(Object.entries(PAGES))("%s underlines links inside running text", (path, Page) => {
    for (const cls of inlineLinkClasses(render(path, <Page />))) {
      expect(cls.split(/\s+/)).toContain("underline");
    }
  });

  it("finds the inline links of login and register", () => {
    expect(inlineLinkClasses(render("/login", <Login />))).toHaveLength(1);
    expect(inlineLinkClasses(render("/register", <Register />))).toHaveLength(1);
  });
});

describe("CookieNoticePanel", () => {
  it("underlines the Datenschutzerklärung link (not distinguishable by colour only)", () => {
    const classes = inlineLinkClasses(render("/", <CookieNoticePanel onDecline={() => {}} onAccept={() => {}} />));
    expect(classes).toHaveLength(1);
    expect(classes[0].split(/\s+/)).toContain("underline");
  });
});
