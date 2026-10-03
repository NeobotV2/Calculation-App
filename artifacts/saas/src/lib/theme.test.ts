import { describe, it, expect, vi } from "vitest";

// Der Hook liest nur `theme` aus dem Store; für die reinen Funktionen wird der
// (persistente) Store nicht gebraucht.
vi.mock("@/store/use-store", () => ({
  useStore: (selector: (s: { theme: string }) => unknown) => selector({ theme: "light" }),
}));

import { getMediaQueryMatch, isThemeMode, nextThemeMode, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("returns the explicit mode regardless of the OS preference", () => {
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("follows the OS preference in system mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("falls back to light for missing or unknown values", () => {
    expect(resolveTheme(undefined, true)).toBe("light");
    expect(resolveTheme(null, true)).toBe("light");
    // z. B. ein beschädigter Persist-Wert
    expect(resolveTheme("sepia" as never, true)).toBe("light");
  });
});

describe("nextThemeMode", () => {
  it("cycles Hell → Dunkel → System → Hell", () => {
    expect(nextThemeMode("light")).toBe("dark");
    expect(nextThemeMode("dark")).toBe("system");
    expect(nextThemeMode("system")).toBe("light");
    expect(nextThemeMode(undefined)).toBe("dark");
  });
});

describe("isThemeMode", () => {
  it("accepts only the three modes", () => {
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("auto")).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

describe("getMediaQueryMatch", () => {
  it("uses the fallback without a window (node)", () => {
    expect(getMediaQueryMatch("(prefers-color-scheme: dark)")).toBe(false);
    expect(getMediaQueryMatch("(min-width: 768px)", true)).toBe(true);
  });
});
