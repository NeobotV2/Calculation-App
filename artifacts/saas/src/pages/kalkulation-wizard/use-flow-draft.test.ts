import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/capacitor-storage", () => ({
  default: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

import { flushOnPageHide } from "./use-flow-draft";

describe("flushOnPageHide (Entwurf vor Neuladen/Schließen sichern)", () => {
  const setup = () => {
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
    const flush = vi.fn();
    const off = flushOnPageHide(win, doc, flush);
    return { win, doc, flush, off };
  };

  it("flushes on pagehide and when the page goes to the background", () => {
    const { win, doc, flush } = setup();
    win.dispatchEvent(new Event("pagehide"));
    expect(flush).toHaveBeenCalledTimes(1);
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(flush).toHaveBeenCalledTimes(1);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it("stops listening after cleanup", () => {
    const { win, doc, flush, off } = setup();
    off();
    win.dispatchEvent(new Event("pagehide"));
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(flush).not.toHaveBeenCalled();
  });
});
