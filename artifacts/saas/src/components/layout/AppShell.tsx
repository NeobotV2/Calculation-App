import { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { BottomNav } from "./BottomNav";

function focusMain() {
  document.getElementById("main-content")?.focus();
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Skip-Link für Tastatur-/Screenreader-Nutzer. Als Button umgesetzt,
          damit der Hash-Router (#/route) nicht durch einen #anchor gestört wird. */}
      <button
        type="button"
        onClick={focusMain}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Zum Inhalt springen
      </button>
      <DesktopSidebar />
      <main id="main-content" tabIndex={-1} className="md:ml-64 outline-none">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
