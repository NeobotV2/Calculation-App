/* ─────────────────────────────────────────────────────────────────────────
   Tabs des Objekt-Arbeitsbereichs (/objekte/:id/:tab?) — rein, ohne UI.
   Übersicht immer; Unterhaltsreinigung bei Räumen oder ohne aktives Modul
   (Altobjekte verhalten sich wie bisher); Winterdienst/Hausmeisterservice,
   sobald das Modul angelegt ist (auch pausiert).
   ───────────────────────────────────────────────────────────────────────── */
import type { FrequencyKey, Project } from "@/store/use-store";
import type { FlowStepId } from "@/lib/offer-readiness";
import type { WarningSeverity } from "@/lib/warnings";
import {
  computeObjectEconomics,
  type EconomicsSettings,
  type ObjectEconomics,
  type ObjectEconomicsOptions,
} from "@/lib/object-economics";
import type { ObjectTotals } from "@/lib/object-totals";

export type WorkspaceTab = "uebersicht" | "reinigung" | "winterdienst" | "hms";

/** Reihenfolge der Tabs. */
export const WORKSPACE_TABS: readonly WorkspaceTab[] = ["uebersicht", "reinigung", "winterdienst", "hms"];

export const WORKSPACE_TAB_LABELS: Record<WorkspaceTab, string> = {
  uebersicht: "Übersicht",
  reinigung: "Unterhaltsreinigung",
  winterdienst: "Winterdienst",
  hms: "Hausmeisterservice",
};

/** Kurzlabels für schmale Inhaltsspalten (wie `MODULE_META.short`); der volle Name bleibt für Screenreader. */
export const WORKSPACE_TAB_SHORT_LABELS: Record<WorkspaceTab, string> = {
  uebersicht: "Übersicht",
  reinigung: "Reinigung",
  winterdienst: "Winter",
  hms: "HMS",
};

export interface VisibleTabsOptions {
  /**
   * Unterhaltsreinigung auch ohne Räume zeigen (z. B. nach „+ Leistung →
   * Unterhaltsreinigung“, damit der leere Zustand erreichbar ist).
   */
  forceCleaning?: boolean;
}

type TabProject = Pick<Project, "rooms" | "winterdienst" | "hms">;

export function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return typeof value === "string" && (WORKSPACE_TABS as readonly string[]).includes(value);
}

/** Unterhaltsreinigung gilt als aktiv bei Räumen ODER ohne aktives WD/HMS-Modul. */
export function isCleaningTabVisible(project: TabProject, opts?: VisibleTabsOptions): boolean {
  if (opts?.forceCleaning) return true;
  if (project.rooms.length > 0) return true;
  return !project.winterdienst?.enabled && !project.hms?.enabled;
}

export function visibleTabs(project: TabProject, opts?: VisibleTabsOptions): WorkspaceTab[] {
  const tabs: WorkspaceTab[] = ["uebersicht"];
  if (isCleaningTabVisible(project, opts)) tabs.push("reinigung");
  if (project.winterdienst !== undefined) tabs.push("winterdienst");
  if (project.hms !== undefined) tabs.push("hms");
  return tabs;
}

/** URL-Parameter → sichtbarer Tab; unbekannt oder ausgeblendet ⇒ „uebersicht“. */
export function resolveTab(
  param: string | null | undefined,
  project: TabProject,
  opts?: VisibleTabsOptions,
): WorkspaceTab {
  if (!isWorkspaceTab(param)) return "uebersicht";
  return visibleTabs(project, opts).includes(param) ? param : "uebersicht";
}

/** Flow-Schritt für „Bearbeiten“ aus einem Modul-Tab (Übersicht ⇒ undefined = Flow-Anfang). */
export function tabFlowStep(tab: WorkspaceTab): FlowStepId | undefined {
  switch (tab) {
    case "reinigung":
      return "raeume";
    case "winterdienst":
      return "winterdienst";
    case "hms":
      return "hms";
    default:
      return undefined;
  }
}

/** Route eines Tabs; die Übersicht hat keinen Tab-Parameter. */
export function tabHref(projectId: string, tab: WorkspaceTab): string {
  return tab === "uebersicht" ? `/objekte/${projectId}` : `/objekte/${projectId}/${tab}`;
}

/** „Kalkulation bearbeiten“: Flow-Anfang oder der Schritt des Modul-Tabs. */
export function editFlowHref(projectId: string, tab: WorkspaceTab): string {
  const step = tabFlowStep(tab);
  return step ? `/kalkulation/${projectId}/${step}` : `/kalkulation/${projectId}`;
}

export interface TabWarning {
  id: string;
  severity: WarningSeverity;
}

/** Warning-ID ohne Projekt-Präfix ("demo-1_wd_salt" → "wd_salt"). */
export function warningSuffixOf(warningId: string, projectId?: string): string {
  if (projectId && warningId.startsWith(`${projectId}_`)) return warningId.slice(projectId.length + 1);
  const i = warningId.indexOf("_");
  return i >= 0 ? warningId.slice(i + 1) : warningId;
}

/** Tab, in dem ein Hinweis entsteht und behoben wird. */
export function warningTab(warningId: string, projectId?: string): WorkspaceTab {
  const s = warningSuffixOf(warningId, projectId);
  if (s.startsWith("wd_") || s === "below_cost_wd" || s === "low_margin_wd") return "winterdienst";
  if (s.startsWith("hms_") || s === "below_cost_hms" || s === "low_margin_hms") return "hms";
  if (s === "below_cost" || s === "low_margin" || s === "sanitaer" || s.startsWith("perf_")) return "reinigung";
  return "uebersicht";
}

/** Warn-Icon am Tab: mindestens ein Hinweis der Stufe „Warnung“ oder „Kritisch“ in diesem Tab. */
export function tabHasWarnings(tab: WorkspaceTab, warnings: readonly TabWarning[], projectId?: string): boolean {
  return warnings.some((w) => w.severity !== "info" && warningTab(w.id, projectId) === tab);
}

/* ── Kennzahlen des Arbeitsbereichs (KpiStrip / Cockpit) ─────────────── */

export interface WorkspaceKpis {
  /** Monatspreis netto (Ø inkl. Zusatzleistungen); ohne Module === cleaning.cost. */
  priceMonthly: number;
  priceAnnual: number;
  /** Ø-Stunden je Monat aller Leistungen; ohne Module === cleaning.hours. */
  hoursMonthly: number;
  /** Reinigungsfläche (m²). */
  area: number;
  /** €/m² der Reinigung; nur sinnvoll mit Räumen. */
  pricePerSqm: number;
  showPricePerSqm: boolean;
  /** Marge auf den Umsatz in % (Preisstrategie). */
  marginPct: number;
  contributionMonthly: number;
  minPriceMonthly: number;
  targetPriceMonthly: number;
  riskScore: number;
  hasModules: boolean;
}

/** Werte von KpiStrip und Cockpit — ausschließlich aus `computeObjectEconomics`. */
export function workspaceKpis(econ: ObjectEconomics): WorkspaceKpis {
  const t = econ.totals;
  return {
    priceMonthly: t.priceMonthly,
    priceAnnual: t.priceAnnual,
    hoursMonthly: t.laborHoursMonthly,
    area: t.cleaning.area,
    pricePerSqm: t.cleaning.pricePerSqm,
    showPricePerSqm: t.cleaning.count > 0,
    marginPct: econ.strategy.marginPct,
    contributionMonthly: econ.strategy.contributionMonthly,
    minPriceMonthly: econ.strategy.minPriceMonthly,
    targetPriceMonthly: econ.strategy.targetPriceMonthly,
    riskScore: econ.risk.score,
    hasModules: t.hasModules,
  };
}

export type WorkspaceModule = "unterhalt" | "winterdienst" | "hms";

export interface ModuleShare {
  module: WorkspaceModule;
  /** Ø-Monatspreis netto des Moduls (Reinigung inkl. Rüst-/Wegezeit). */
  priceMonthly: number;
  /** Anteil am Monatspreis 0–1 (0 ohne Preis). */
  share: number;
}

/** Preisanteile je Modul für die Modulkarten der Übersicht (Σ priceMonthly = totals.priceMonthly). */
export function moduleShares(totals: ObjectTotals): ModuleShare[] {
  const total = totals.priceMonthly;
  const share = (v: number) => (total > 0 ? v / total : 0);
  const out: ModuleShare[] = [
    { module: "unterhalt", priceMonthly: totals.cleaning.cost, share: share(totals.cleaning.cost) },
  ];
  if (totals.winterdienst) {
    out.push({ module: "winterdienst", priceMonthly: totals.winterdienst.revenueMonthly, share: share(totals.winterdienst.revenueMonthly) });
  }
  if (totals.hms) {
    out.push({ module: "hms", priceMonthly: totals.hms.revenueMonthly, share: share(totals.hms.revenueMonthly) });
  }
  return out;
}

export interface FrequencyChangePreview {
  /** Räume insgesamt. */
  roomCount: number;
  /** Räume, deren Turnus sich ändert. */
  changedCount: number;
  oldPriceMonthly: number;
  newPriceMonthly: number;
  deltaMonthly: number;
}

/**
 * „Turnus für alle“: Monatspreis vorher/nachher, berechnet mit
 * `computeObjectEconomics` auf einer Kopie mit geändertem Turnus.
 */
export function frequencyChangePreview(
  project: Project,
  frequency: FrequencyKey,
  settings: EconomicsSettings,
  opts?: ObjectEconomicsOptions,
): FrequencyChangePreview {
  const before = computeObjectEconomics(project, settings, opts).totals.priceMonthly;
  const copy: Project = { ...project, rooms: project.rooms.map((r) => ({ ...r, frequency })) };
  const after = computeObjectEconomics(copy, settings, opts).totals.priceMonthly;
  return {
    roomCount: project.rooms.length,
    changedCount: project.rooms.filter((r) => r.frequency !== frequency).length,
    oldPriceMonthly: before,
    newPriceMonthly: after,
    deltaMonthly: after - before,
  };
}
