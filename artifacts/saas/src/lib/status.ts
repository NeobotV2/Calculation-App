/**
 * Einzige Quelle für die Bedeutung von Status in der UI.
 *
 * Status wird IMMER als Icon + Text + Farbe dargestellt (Farbe allein trägt
 * keine Information). Komponenten verwenden `TONE_CLASSES` / `TONE_ICON` statt
 * eigener Ampel-Maps (`STATUS_META`, `RISK_META`, `marginTone`-Kopien …).
 */
import { Circle, CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";

export type Tone = "neutral" | "info" | "success" | "warning" | "critical";

export const TONES: readonly Tone[] = ["neutral", "info", "success", "warning", "critical"];

export interface ToneClasses {
  /** Text in Statusfarbe auf Karte/Hintergrund (≥ 4,5:1). */
  text: string;
  /** Getönte Fläche inkl. Textfarbe (Badge, Callout). */
  soft: string;
  /** Nur die getönte Fläche. */
  bg: string;
  /** Rahmenfarbe passend zur getönten Fläche. */
  border: string;
  /** Vollfläche mit Vordergrundfarbe (selten, z. B. Zähler). */
  solid: string;
  /** Farbe für Status-Icons. */
  icon: string;
  /** Kleiner Farbpunkt. */
  dot: string;
}

export const TONE_CLASSES: Record<Tone, ToneClasses> = {
  neutral: {
    text: "text-muted-foreground",
    soft: "bg-muted text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    solid: "bg-foreground text-background",
    icon: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  info: {
    text: "text-info",
    soft: "bg-info-soft text-info",
    bg: "bg-info-soft",
    border: "border-info-border",
    solid: "bg-info text-info-foreground",
    icon: "text-info",
    dot: "bg-info",
  },
  success: {
    text: "text-success",
    soft: "bg-success-soft text-success",
    bg: "bg-success-soft",
    border: "border-success-border",
    solid: "bg-success text-success-foreground",
    icon: "text-success",
    dot: "bg-success",
  },
  warning: {
    text: "text-warning",
    soft: "bg-warning-soft text-warning",
    bg: "bg-warning-soft",
    border: "border-warning-border",
    solid: "bg-warning text-warning-foreground",
    icon: "text-warning",
    dot: "bg-warning",
  },
  critical: {
    text: "text-destructive",
    soft: "bg-destructive-soft text-destructive",
    bg: "bg-destructive-soft",
    border: "border-destructive-border",
    solid: "bg-destructive text-destructive-foreground",
    icon: "text-destructive",
    dot: "bg-destructive",
  },
};

export const TONE_ICON: Record<Tone, LucideIcon> = {
  neutral: Circle,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  critical: OctagonAlert,
};

/** Rangfolge für Sortierungen („kritisch zuerst"). */
export const TONE_RANK: Record<Tone, number> = {
  critical: 4,
  warning: 3,
  info: 2,
  success: 1,
  neutral: 0,
};

/** Schlechtester Ton einer Liste (leer → "neutral"). */
export function worstTone(tones: readonly Tone[]): Tone {
  return tones.reduce<Tone>((worst, t) => (TONE_RANK[t] > TONE_RANK[worst] ? t : worst), "neutral");
}

// ── Wirtschaftlichkeit (lib/price-strategy `EconomicStatus`) ──────────────
export type StrategyStatus = "gesund" | "pruefen" | "kritisch";

const STRATEGY_TONE: Record<StrategyStatus, Tone> = {
  gesund: "success",
  pruefen: "warning",
  kritisch: "critical",
};
const STRATEGY_LABEL: Record<StrategyStatus, string> = {
  gesund: "Wirtschaftlich",
  pruefen: "Prüfen",
  kritisch: "Unwirtschaftlich",
};
export function strategyTone(status: StrategyStatus): Tone {
  return STRATEGY_TONE[status] ?? "neutral";
}
export function strategyLabel(status: StrategyStatus): string {
  return STRATEGY_LABEL[status] ?? "Unbekannt";
}

// ── Risiko (lib/risk-score `RiskLevel`) ───────────────────────────────────
export type RiskLevel = "niedrig" | "mittel" | "hoch";

const RISK_TONE: Record<RiskLevel, Tone> = {
  niedrig: "success",
  mittel: "warning",
  hoch: "critical",
};
const RISK_LABEL: Record<RiskLevel, string> = {
  niedrig: "Geringes Risiko",
  mittel: "Mittleres Risiko",
  hoch: "Hohes Risiko",
};
export function riskTone(level: RiskLevel): Tone {
  return RISK_TONE[level] ?? "neutral";
}
export function riskLabel(level: RiskLevel): string {
  return RISK_LABEL[level] ?? "Risiko unbekannt";
}

// ── Marge ────────────────────────────────────────────────────────────────
/**
 * Ampel für eine Marge in % gegen die Zielmarge in %:
 * < 0 → critical · < Ziel → warning · sonst success.
 */
export function marginTone(margin: number, targetMargin: number): Tone {
  if (!Number.isFinite(margin)) return "neutral";
  if (margin < 0) return "critical";
  if (margin < targetMargin) return "warning";
  return "success";
}

/**
 * Statuswort zur Margen-Ampel (Status nie nur über Farbe):
 * < 0 → „Verlust“ · < Ziel → „unter Ziel“ · sonst „Ziel erreicht“ · ungültig → "".
 */
export function marginStatusLabel(margin: number, targetMargin: number): string {
  if (!Number.isFinite(margin)) return "";
  if (margin < 0) return "Verlust";
  if (margin < targetMargin) return "unter Ziel";
  return "Ziel erreicht";
}

// ── Prüfhinweise (lib/warnings `WarningSeverity`, Modul-Findings) ─────────
export type Severity = "critical" | "warning" | "info";

const SEVERITY_TONE: Record<Severity, Tone> = {
  critical: "critical",
  warning: "warning",
  info: "info",
};
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Kritisch",
  warning: "Warnung",
  info: "Hinweis",
};
export function severityTone(severity: Severity): Tone {
  return SEVERITY_TONE[severity] ?? "neutral";
}
export function severityLabel(severity: Severity): string {
  return SEVERITY_LABEL[severity] ?? "Hinweis";
}

// ── Nachkalkulation (lib/nachkalkulation `NachkalkulationVerdict`) ────────
export type Verdict = "besser" | "im_plan" | "schlechter";

const VERDICT_TONE: Record<Verdict, Tone> = {
  besser: "success",
  im_plan: "success",
  schlechter: "warning",
};
const VERDICT_LABEL: Record<Verdict, string> = {
  besser: "Besser als geplant",
  im_plan: "Im Plan",
  schlechter: "Über Plan",
};
export function verdictTone(verdict: Verdict): Tone {
  return VERDICT_TONE[verdict] ?? "neutral";
}
export function verdictLabel(verdict: Verdict): string {
  return VERDICT_LABEL[verdict] ?? "Unbekannt";
}
