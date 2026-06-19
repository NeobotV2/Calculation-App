import { Palette, Sun, Moon } from "lucide-react";
import type { ThemeMode } from "@/lib/tokens";

interface AppearanceSectionProps {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

/** Theme (light/dark) selection. */
export function AppearanceSection({ theme, setTheme }: AppearanceSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <Palette size={16} /> Darstellung
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
        <div>
          <span className="text-sm font-medium text-foreground mb-3 block">Farbschema</span>
          <div className="flex gap-3">
            <button
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-colors ${theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border/40 bg-background text-muted-foreground hover:border-border"}`}
            >
              <Sun size={18} aria-hidden="true" />
              <span className="text-sm font-medium">Hell</span>
            </button>
            <button
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-colors ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border/40 bg-background text-muted-foreground hover:border-border"}`}
            >
              <Moon size={18} aria-hidden="true" />
              <span className="text-sm font-medium">Dunkel</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
