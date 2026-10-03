import * as React from "react";
import { PageContainer, type PageWidth } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  /** Seitenkopf, i. d. R. `<PageHeader … />` (bringt eigenen Container mit). */
  header?: React.ReactNode;
  /** Rechte Spalte ab lg (20rem, sticky), z. B. Zusammenfassung/Cockpit. */
  rail?: React.ReactNode;
  /**
   * Rail unter lg: `stack` (Standard) zeigt sie unter dem Inhalt,
   * `hidden` blendet sie aus (wenn die Seite sie selbst anders platziert).
   */
  railBelowLg?: "stack" | "hidden";
  width?: PageWidth;
  /**
   * `app` (Standard): Unterabstand für die BottomNav unter md.
   * `focus`: ohne BottomNav (Kalkulations-Flow), nur Safe-Area.
   */
  chrome?: "app" | "focus";
  className?: string;
  /** Klassen für den Inhaltsbereich (Standard `space-y-8`). */
  bodyClassName?: string;
  children?: React.ReactNode;
}

/**
 * Seitengerüst: Kopf + Inhalt (`pt-4 md:pt-6 space-y-8`) mit Abstand zur
 * BottomNav, optional mit Rail-Spalte ab lg.
 */
export function PageShell({
  header,
  rail,
  railBelowLg = "stack",
  width = "default",
  chrome = "app",
  className,
  bodyClassName,
  children,
}: PageShellProps) {
  return (
    <div className={cn("min-w-0", className)}>
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
          <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8 lg:space-y-0">
            <div className={cn("min-w-0 space-y-8", bodyClassName)}>{children}</div>
            {/* Ab lg sticky und auf die Fensterhöhe begrenzt (eigener Scrollbereich), damit
                auch eine lange Rail vollständig erreichbar bleibt. -mx-1/px-1: Schatten und
                Fokusringe am Rand werden nicht abgeschnitten. */}
            <aside
              className={cn(
                "min-w-0 space-y-4 self-start lg:sticky lg:top-[calc(var(--safe-top)+5rem)] lg:-mx-1 lg:max-h-[calc(100dvh-var(--safe-top)-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-1",
                railBelowLg === "hidden" && "hidden lg:block",
              )}
            >
              {rail}
            </aside>
          </div>
        ) : (
          <div className={cn("space-y-8", bodyClassName)}>{children}</div>
        )}
      </PageContainer>
    </div>
  );
}
