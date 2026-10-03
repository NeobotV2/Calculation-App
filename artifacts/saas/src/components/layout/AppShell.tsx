import type { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { BottomNav } from "./BottomNav";
import { SyncBanner } from "./SyncBanner";

function focusMain() {
  document.getElementById("main-content")?.focus();
}

/**
 * App-Rahmen (Shell-Modus „app"): Sidebar ab md (Rail/voll), BottomNav unter
 * md, SyncBanner über dem Seiteninhalt. Fokus- und Druckrouten rendern ohne Shell.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      {/* Skip-Link als Button, damit der Hash-Router nicht durch einen #anker gestört wird. */}
      <button
        type="button"
        onClick={focusMain}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-skip focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-overlay focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Zum Inhalt springen
      </button>
      <DesktopSidebar />
      <div className="md:pl-(--rail-w) lg:pl-(--sidebar-w)">
        <SyncBanner />
        <main id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
