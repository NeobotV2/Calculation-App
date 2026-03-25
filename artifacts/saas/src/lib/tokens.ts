export type ThemeMode = "light" | "dark";

export const typography = {
  screenTitle: { fontSize: 32, lineHeight: 38, fontWeight: 700 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: 600 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: 600 },
  kpiHero: { fontSize: 36, lineHeight: 40, fontWeight: 700 },
  kpiLarge: { fontSize: 28, lineHeight: 32, fontWeight: 700 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: 500 },
} as const;

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export const colors = {
  light: {
    background: "hsl(218, 33%, 97%)",
    foreground: "hsl(222, 47%, 11%)",
    card: "hsl(0, 0%, 100%)",
    cardForeground: "hsl(222, 47%, 11%)",
    primary: "hsl(173, 41%, 28%)",
    primaryForeground: "hsl(0, 0%, 100%)",
    secondary: "hsl(216, 20%, 95%)",
    secondaryForeground: "hsl(222, 47%, 11%)",
    muted: "hsl(216, 20%, 95%)",
    mutedForeground: "hsl(215, 16%, 47%)",
    accent: "hsl(216, 20%, 95%)",
    accentForeground: "hsl(222, 47%, 11%)",
    destructive: "hsl(0, 72%, 51%)",
    border: "hsl(214, 20%, 90%)",
    ring: "hsl(173, 41%, 28%)",
    success: "hsl(142, 71%, 45%)",
    warning: "hsl(32, 95%, 44%)",
    info: "hsl(217, 91%, 60%)",
  },
  dark: {
    background: "hsl(210, 50%, 5%)",
    foreground: "hsl(210, 40%, 98%)",
    card: "hsl(213, 40%, 9%)",
    cardForeground: "hsl(210, 40%, 98%)",
    primary: "hsl(174, 47%, 43%)",
    primaryForeground: "hsl(0, 0%, 100%)",
    secondary: "hsl(213, 30%, 14%)",
    secondaryForeground: "hsl(210, 40%, 98%)",
    muted: "hsl(213, 30%, 14%)",
    mutedForeground: "hsl(215, 20%, 65%)",
    accent: "hsl(213, 30%, 14%)",
    accentForeground: "hsl(210, 40%, 98%)",
    destructive: "hsl(0, 63%, 56%)",
    border: "hsl(213, 30%, 14%)",
    ring: "hsl(174, 47%, 43%)",
    success: "hsl(142, 71%, 45%)",
    warning: "hsl(38, 92%, 50%)",
    info: "hsl(199, 89%, 62%)",
  },
} as const;
