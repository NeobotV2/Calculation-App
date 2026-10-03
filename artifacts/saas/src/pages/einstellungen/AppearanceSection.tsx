import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { THEME_MODES, THEME_MODE_LABELS, type ThemeMode } from "@/lib/tokens";
import { isThemeMode, useResolvedTheme } from "@/lib/theme";

interface AppearanceSectionProps {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const THEME_ICONS: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/** Farbschema Hell / Dunkel / System (sofort wirksam). */
export function AppearanceSection({ theme, setTheme }: AppearanceSectionProps) {
  const resolved = useResolvedTheme();
  return (
    <Card as="section" aria-labelledby="settings-theme-title">
      <CardHeader
        title={<span id="settings-theme-title">Farbschema</span>}
        description="Gilt sofort auf diesem Gerät. Angebote und Druckansichten bleiben immer hell."
      />
      <ToggleGroup
        type="single"
        variant="outline"
        size="lg"
        value={theme}
        onValueChange={(v) => {
          if (isThemeMode(v)) setTheme(v);
        }}
        aria-label="Farbschema"
        className="grid w-full grid-cols-3 gap-2"
      >
        {THEME_MODES.map((mode) => {
          const Icon = THEME_ICONS[mode];
          return (
            <ToggleGroupItem key={mode} value={mode} className="w-full">
              <Icon aria-hidden="true" />
              {THEME_MODE_LABELS[mode]}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      {theme === "system" && (
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          Folgt der Einstellung Ihres Geräts – aktuell {resolved === "dark" ? "Dunkel" : "Hell"}.
        </p>
      )}
    </Card>
  );
}
