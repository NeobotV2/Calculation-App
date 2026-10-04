import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { ResponsiveSheet, ResponsiveSheetCancel, useResponsiveSheet } from "./responsive-sheet";

type ClickProps = { children?: React.ReactNode; onClick?: () => void; disabled?: boolean; label?: string };
const clicks = vi.hoisted(() => ({ buttons: [] as ClickProps[], iconButtons: [] as ClickProps[] }));

// Radix-Overlays rendern serverseitig nichts (Portal) — hier inline.
vi.mock("@/components/ui/sheet", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Sheet: ({ open, children }: { open: boolean; children?: React.ReactNode }) => (open ? <>{children}</> : null),
    SheetContent: Pass,
    SheetTitle: Pass,
    SheetDescription: Pass,
  };
});
vi.mock("@/components/ui/alert-dialog", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    AlertDialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) => (open ? <>{children}</> : null),
    AlertDialogAction: Pass,
    AlertDialogCancel: Pass,
    AlertDialogContent: Pass,
    AlertDialogDescription: Pass,
    AlertDialogFooter: Pass,
    AlertDialogHeader: Pass,
    AlertDialogTitle: Pass,
  };
});
// Klick-Handler mitschneiden (serverseitig gibt es keine Events).
vi.mock("@/components/ui/button", () => ({
  Button: (props: ClickProps) => {
    clicks.buttons.push(props);
    return <button disabled={props.disabled}>{props.children}</button>;
  },
}));
vi.mock("@/components/ui/icon-button", () => ({
  IconButton: (props: ClickProps) => {
    clicks.iconButtons.push(props);
    return <button aria-label={props.label} />;
  },
}));

beforeEach(() => {
  clicks.buttons.length = 0;
  clicks.iconButtons.length = 0;
});

function renderSheet(dirty: boolean, onOpenChange: (open: boolean) => void) {
  const html = renderToStaticMarkup(
    <ResponsiveSheet open onOpenChange={onOpenChange} title="Fläche bearbeiten" dirty={dirty} footer={<ResponsiveSheetCancel />}>
      Inhalt
    </ResponsiveSheet>,
  );
  const cancel = clicks.buttons.find((b) => b.children === "Abbrechen");
  const close = clicks.iconButtons.find((b) => b.label === "Schließen");
  if (!cancel || !close) throw new Error("Abbrechen bzw. Schließen fehlt");
  return { html, cancel, close };
}

describe("ResponsiveSheetCancel", () => {
  it("renders „Abbrechen“ in the footer and closes exactly like the X button", () => {
    const { html, cancel, close } = renderSheet(true, vi.fn());
    expect(html).toContain(">Abbrechen</button>");
    expect(cancel.onClick).toBeTypeOf("function");
    expect(cancel.onClick).toBe(close.onClick);
  });

  it("closes immediately without unsaved changes", () => {
    const onOpenChange = vi.fn();
    renderSheet(false, onOpenChange).cancel.onClick?.();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("does not discard unsaved changes: dirty asks „Änderungen verwerfen?“ instead of closing", () => {
    const onOpenChange = vi.fn();
    renderSheet(true, onOpenChange).cancel.onClick?.();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("passes label and disabled through", () => {
    renderToStaticMarkup(
      <ResponsiveSheet open onOpenChange={vi.fn()} title="T" footer={<ResponsiveSheetCancel disabled>Verwerfen</ResponsiveSheetCancel>}>
        x
      </ResponsiveSheet>,
    );
    expect(clicks.buttons.find((b) => b.children === "Verwerfen")?.disabled).toBe(true);
  });

  it("is only available inside a ResponsiveSheet", () => {
    const Probe = () => {
      useResponsiveSheet();
      return null;
    };
    expect(() => renderToStaticMarkup(<Probe />)).toThrow(/ResponsiveSheet/);
  });
});

/* ── Alle Editor-Sheets mit `dirty`: „Abbrechen“ nur über ResponsiveSheetCancel ── */

const SRC = fileURLToPath(new URL("../../", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

describe("dirty editor sheets", () => {
  const dirtySheets = sourceFiles(SRC).filter((path) => {
    const code = readFileSync(path, "utf8");
    return /<ResponsiveSheet\b/.test(code) && /\bdirty=\{/.test(code);
  });

  it("finds the editor sheets", () => {
    const rel = dirtySheets.map((p) => relative(SRC, p).split("\\").join("/"));
    expect(rel).toEqual(
      expect.arrayContaining([
        "components/calc/hms/TaskSheet.tsx",
        "components/calc/winterdienst/AreaSheet.tsx",
        "pages/objekte/detail-parts/InfoSheet.tsx",
        "pages/objekte/detail-parts/WinterdienstTab.tsx",
        "pages/objekte/list-parts/RenameSheet.tsx",
        "pages/einstellungen/RoomTypesSection.tsx",
      ]),
    );
  });

  it("never close a dirty sheet from a plain „Abbrechen“ button", () => {
    const offenders = dirtySheets
      .filter((path) => /Abbrechen\s*<\/Button>/.test(readFileSync(path, "utf8")))
      .map((p) => relative(SRC, p));
    expect(offenders).toEqual([]);
  });
});
