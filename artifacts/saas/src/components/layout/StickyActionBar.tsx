import * as React from "react";
import { PAGE_GUTTER_CLASS, PAGE_WIDTH_CLASS, type PageWidth } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

export interface StickyActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * `app`: unter md über der BottomNav, ab md am unteren Rand rechts der
   * Sidebar (`--rail-w` / `--sidebar-w`).
   * `focus`: ohne Navigation (Flow) am unteren Rand inkl. Safe-Area.
   */
  chrome: "app" | "focus";
  /** Breite des inneren Containers (passend zur Seite). */
  width?: PageWidth | "full";
  /**
   * Fügt an der Einbaustelle einen gleich hohen Platzhalter ein, damit der
   * Seiteninhalt nicht verdeckt wird. Standard: true.
   */
  reserveSpace?: boolean;
  /** Zugänglicher Name der Leiste. Standard: „Aktionen". */
  label?: string;
}

/** Fixierte Aktionsleiste am unteren Rand (Speichern, Weiter …). */
export function StickyActionBar({
  chrome,
  width = "default",
  reserveSpace = true,
  label = "Aktionen",
  className,
  children,
  ...props
}: StickyActionBarProps) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!reserveSpace) return;
    const el = barRef.current;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [reserveSpace]);

  return (
    <>
      {reserveSpace && <div aria-hidden="true" className="no-print" style={{ height }} />}
      <div
        ref={barRef}
        role="region"
        aria-label={label}
        className={cn(
          "no-print fixed inset-x-0 z-sticky border-t border-border bg-card shadow-raised",
          chrome === "app"
            ? "bottom-[calc(var(--nav-h)+var(--safe-bottom))] md:bottom-0 md:left-(--rail-w) md:pb-safe lg:left-(--sidebar-w)"
            : "bottom-0 pb-safe",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "mx-auto flex w-full items-center gap-3 py-3",
            width !== "full" && PAGE_WIDTH_CLASS[width],
            PAGE_GUTTER_CLASS,
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
