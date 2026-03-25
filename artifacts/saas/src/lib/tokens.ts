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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type ThemeMode = "light" | "dark";
