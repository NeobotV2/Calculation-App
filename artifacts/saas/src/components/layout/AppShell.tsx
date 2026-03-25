import { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DesktopSidebar />
      <div className="md:ml-64">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
