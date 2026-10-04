import { describe, it, expect } from "vitest";
import { actionsCellClass, columnHideClass, isRowClick } from "./data-table";

/** Minimales DOM-Modell: Knoten mit Elternkette und `closest` über einen Selektor-Test. */
interface FakeNode {
  parent: FakeNode | null;
  interactive: boolean;
  contains(other: unknown): boolean;
  closest(selector: string): FakeNode | null;
}

function node(parent: FakeNode | null, interactive = false): FakeNode {
  const n: FakeNode = {
    parent,
    interactive,
    contains(other) {
      for (let c = other as FakeNode | null; c; c = c.parent) if (c === n) return true;
      return false;
    },
    closest() {
      for (let c: FakeNode | null = n; c; c = c.parent) if (c.interactive) return c;
      return null;
    },
  };
  return n;
}

describe("isRowClick", () => {
  const body = node(null);
  const row = node(body);
  const cell = node(row);
  const text = node(cell);
  const menuTrigger = node(cell, true);
  // Portal: Menüeintrag hängt am <body>, nicht in der Zeile.
  const portal = node(body);
  const menuItem = node(portal, true);
  const menuItemLabel = node(menuItem);

  it("activates the row for plain cell content", () => {
    expect(isRowClick(row, text)).toBe(true);
    expect(isRowClick(row, cell)).toBe(true);
  });

  it("ignores controls inside the row", () => {
    expect(isRowClick(row, menuTrigger)).toBe(false);
  });

  it("ignores clicks that bubble from a portalled row menu or dialog", () => {
    expect(isRowClick(row, menuItem)).toBe(false);
    expect(isRowClick(row, menuItemLabel)).toBe(false);
    expect(isRowClick(row, portal)).toBe(false);
    expect(isRowClick(row, null)).toBe(false);
  });
});

describe("row actions column", () => {
  it("stays visible at the right edge when the table scrolls sideways (opaque background)", () => {
    for (const section of ["head", "body", "foot"] as const) {
      const cls = actionsCellClass(section);
      expect(cls).toContain("sticky");
      expect(cls).toContain("right-0");
      expect(cls).toMatch(/\bbg-(card|surface-sunken)\b/);
    }
    expect(actionsCellClass("body", true)).toContain("group-hover/row:");
    expect(actionsCellClass("body", false)).not.toContain("group-hover/row:");
  });

  it("compact columns use container queries", () => {
    expect(columnHideClass("lg")).toBe("hidden @3xl/table:table-cell");
    expect(columnHideClass(undefined, "lg")).toBe("@3xl/table:hidden");
    expect(columnHideClass("2xl")).toBe("hidden @6xl/table:table-cell");
  });
});
