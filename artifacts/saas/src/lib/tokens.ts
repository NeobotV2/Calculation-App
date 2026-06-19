/**
 * Design-Token-Typen.
 *
 * Hinweis: Die konkreten Design-Token-WERTE (Farben, Spacing, Radius, Typo)
 * leben als CSS-Custom-Properties in `src/index.css` und sind dort die EINZIGE
 * Quelle der Wahrheit (inkl. Light-/Dark-Mode). Komponenten verwenden die
 * davon abgeleiteten Tailwind-Utilities (z. B. `bg-card`, `text-muted-foreground`,
 * `rounded-2xl`) statt hartkodierter Werte.
 *
 * Frühere, ungenutzte JS-Kopien der Tokens (die mit index.css auseinanderlaufen
 * konnten) wurden entfernt, um genau diese Divergenz zu vermeiden.
 */
export type ThemeMode = "light" | "dark";
