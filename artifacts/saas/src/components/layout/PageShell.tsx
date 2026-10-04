import * as React from "react";
import { PageContainer, type PageWidth } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  /** Seitenkopf, i. d. R. `<PageHeader … />` (bringt eigenen Container mit). */
  header?: React.ReactNode;
  /** Rechte Spalte ab lg (20rem, sticky), z. B. Zusammenfassung/Cockpit. */
  rail?: React.ReactNode;
  /** Zugänglicher Name der Rail (Landmark `complementary`). */
  railLabel?: string;
  /**
   * Rail unter lg: `stack` (Standard) zeigt sie unter dem Inhalt,
   * `hidden` blendet sie aus (wenn die Seite sie selbst anders platziert).
   */
  railBelowLg?: "stack" | "hidden";
  /**
   * Ab welcher Breite die Rail als rechte Spalte erscheint (Standard lg).
   * `xl` für Seiten mit breiten Tabellen (Arbeitsbereich): bei 1024 px blieben
   * neben Sidebar und Rail sonst nur ~390 px für Preise und Aktionen.
   */
  railFrom?: "lg" | "xl";
  width?: PageWidth;
  /**
   * `app` (Standard): Unterabstand für die BottomNav unter md.
   * `focus`: ohne BottomNav (Kalkulations-Flow), nur Safe-Area.
   */
  chrome?: "app" | "focus";
  /**
   * `main` nur für Seiten ohne App-Shell (öffentliche/rechtliche Seiten): Die
   * Shell rendert selbst `<main id="main-content">`, ein zweites wäre falsch.
   */
  as?: "div" | "main";
  className?: string;
  /** Klassen für den Inhaltsbereich (Standard `space-y-8`). */
  bodyClassName?: string;
  children?: React.ReactNode;
}

/** Inhalt höher als der sichtbare Bereich (1 px Toleranz für Rundung). */
export function hasVerticalOverflow(el: Pick<HTMLElement, "scrollHeight" | "clientHeight">): boolean {
  return el.scrollHeight - el.clientHeight > 1;
}

/**
 * Seitengerüst: Kopf + Inhalt (`pt-4 md:pt-6 space-y-8`) mit Abstand zur
 * BottomNav, optional mit Rail-Spalte ab lg.
 */
export function PageShell({
  header,
  rail,
  railLabel = "Zusammenfassung",
  railBelowLg = "stack",
  railFrom = "lg",
  width = "default",
  chrome = "app",
  as: Root = "div",
  className,
  bodyClassName,
  children,
}: PageShellProps) {
  const landmark = Root === "main" ? { id: "main-content", tabIndex: -1 } : undefined;
  return (
    <Root {...landmark} className={cn("min-w-0", landmark && "outline-none", className)}>
      {header}
      <PageContainer
        width={width}
        className={cn(
          "pt-4 md:pt-6",
          chrome === "app"
            ? "pb-[calc(var(--nav-h)+var(--safe-bottom)+1.5rem)] md:pb-10"
            : "pb-[calc(var(--safe-bottom)+1.5rem)] md:pb-10",
        )}
      >
        {rail != null ? (
          <div className={RAIL_GRID[railFrom]}>
            <div className={cn("min-w-0 space-y-8", bodyClassName)}>{children}</div>
            <PageRail label={railLabel} hiddenBelowLg={railBelowLg === "hidden"} from={railFrom}>
              {rail}
            </PageRail>
          </div>
        ) : (
          <div className={cn("space-y-8", bodyClassName)}>{children}</div>
        )}
      </PageContainer>
    </Root>
  );
}

/**
 * Ab lg sticky und auf die Fensterhöhe begrenzt (eigener Scrollbereich), damit
 * auch eine lange Rail vollständig erreichbar bleibt. Läuft sie über, wird sie
 * per Tab fokussierbar, damit sie auch per Tastatur scrollt. -mx-1/px-1:
 * Schatten und Fokusringe am Rand werden nicht abgeschnitten.
 */
/* Vollständige Klassen je Breakpoint (Tailwind erkennt nur statische Klassennamen). */
const RAIL_GRID = {
  lg: "space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8 lg:space-y-0",
  xl: "space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8 xl:space-y-0",
} as const;
const RAIL_STICKY = {
  lg: "lg:sticky lg:top-[calc(var(--safe-top)+5rem)] lg:-mx-1 lg:max-h-[calc(100dvh-var(--safe-top)-6rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain lg:px-1 lg:pb-1",
  xl: "xl:sticky xl:top-[calc(var(--safe-top)+5rem)] xl:-mx-1 xl:max-h-[calc(100dvh-var(--safe-top)-6rem)] xl:overflow-y-auto xl:overflow-x-hidden xl:overscroll-contain xl:px-1 xl:pb-1",
} as const;
const RAIL_HIDDEN = { lg: "hidden lg:block", xl: "hidden xl:block" } as const;

function PageRail({
  label,
  hiddenBelowLg,
  from,
  children,
}: {
  label: string;
  hiddenBelowLg: boolean;
  from: "lg" | "xl";
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const update = () => setScrollable(hasVerticalOverflow(el));
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (contentRef.current) ro.observe(contentRef.current);
    update();
    return () => ro.disconnect();
  }, []);

  return (
    <aside
      ref={ref}
      aria-label={label}
      tabIndex={scrollable ? 0 : undefined}
      className={cn(
        "min-w-0 self-start outline-none",
        RAIL_STICKY[from],
        "focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring",
        hiddenBelowLg && RAIL_HIDDEN[from],
      )}
    >
      <div ref={contentRef} className="space-y-4">
        {children}
      </div>
    </aside>
  );
}
