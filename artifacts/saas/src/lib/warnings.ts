import { type Project } from "@/store/use-store";
import { calcProjectTotals, calcRoom } from "@/lib/calc";
import { calcHourlyRate, type HourlyRateConfig, type HourlyRateBreakdown } from "@/lib/hourly-rate-calc";

export type WarningSeverity = "critical" | "warning" | "info";

export interface Warning {
  id: string;
  severity: WarningSeverity;
  title: string;
  message: string;
  action: string;
}

export interface ProjectWarnings {
  projectId: string;
  projectName: string;
  warnings: Warning[];
}

const SANITAER_GROUP_ID = "g2";
const PERFORMANCE_DEVIATION_THRESHOLD = 0.5;
const SANITAER_COST_THRESHOLD = 0.3;

export const WARNING_TYPES = [
  { key: "below_cost", label: "Unter Vollkosten", severity: "critical" as WarningSeverity },
  { key: "low_margin", label: "Marge unter Zielwert", severity: "warning" as WarningSeverity },
  { key: "perf", label: "Leistungswert unrealistisch", severity: "warning" as WarningSeverity },
  { key: "sanitaer", label: "Hoher Sanitäranteil", severity: "info" as WarningSeverity },
  { key: "default_rate", label: "Standard-Stundensatz", severity: "info" as WarningSeverity },
] as const;

export function getWarningTypeKey(warningId: string): string {
  const parts = warningId.split("_");
  parts.shift();
  if (parts[0] === "below" && parts[1] === "cost") return "below_cost";
  if (parts[0] === "low" && parts[1] === "margin") return "low_margin";
  if (parts[0] === "default" && parts[1] === "rate") return "default_rate";
  if (parts[0] === "perf") return "perf";
  if (parts[0] === "sanitaer") return "sanitaer";
  return parts.join("_");
}

export function getProjectWarnings(
  project: Project,
  globalHourlyRate: number,
  hourlyRateConfig: HourlyRateConfig,
  breakdown: HourlyRateBreakdown,
  isDefaultRate: boolean,
  targetMargin?: number
): Warning[] {
  const warnings: Warning[] = [];
  const effectiveRate = project.hourlyRate ?? globalHourlyRate;
  const marginTarget = targetMargin ?? hourlyRateConfig.gewinnmarge;

  if (project.rooms.length === 0) return warnings;

  if (effectiveRate < breakdown.vollkosten) {
    warnings.push({
      id: `${project.id}_below_cost`,
      severity: "critical",
      title: "Unter Vollkosten",
      message: `Der Verrechnungssatz (${fmt(effectiveRate)} €/h) liegt unter den Vollkosten (${fmt(breakdown.vollkosten)} €/h). Dieses Objekt wird mit Verlust kalkuliert.`,
      action: "Verrechnungssatz im Stundensatz-Kalkulator oder in der Objektinfo erhöhen.",
    });
  }

  const marginPercent = effectiveRate > 0
    ? ((effectiveRate - breakdown.vollkosten) / effectiveRate) * 100
    : 0;

  if (marginPercent > 0 && marginPercent < marginTarget) {
    warnings.push({
      id: `${project.id}_low_margin`,
      severity: "warning",
      title: "Marge unter Zielwert",
      message: `Die Marge liegt bei ${fmt(marginPercent)}% — unter dem Zielwert von ${fmt(marginTarget)}%.`,
      action: "Verrechnungssatz prüfen oder Leistungswerte der Räume optimieren.",
    });
  }

  for (const room of project.rooms) {
    if (room.customPerformance && room.typePerformance > 0) {
      const deviation = (room.customPerformance - room.typePerformance) / room.typePerformance;
      if (deviation > PERFORMANCE_DEVIATION_THRESHOLD) {
        warnings.push({
          id: `${project.id}_perf_${room.id}`,
          severity: "warning",
          title: "Leistungswert unrealistisch",
          message: `„${room.name || room.typeName}": Leistungswert ${room.customPerformance} m²/h liegt ${Math.round(deviation * 100)}% über dem Branchenwert (${room.typePerformance} m²/h).`,
          action: "Leistungswert prüfen — zu hohe Werte führen zu Unterkalkulierung.",
        });
      }
    }
  }

  const totals = calcProjectTotals(project, effectiveRate);
  if (totals.cost > 0) {
    let sanitaerCost = 0;
    for (const room of project.rooms) {
      if (room.groupId === SANITAER_GROUP_ID) {
        const rc = calcRoom(room, effectiveRate);
        sanitaerCost += rc.monthlyCost;
      }
    }
    const sanitaerRatio = sanitaerCost / totals.cost;
    if (sanitaerRatio > SANITAER_COST_THRESHOLD) {
      warnings.push({
        id: `${project.id}_sanitaer`,
        severity: "info",
        title: "Hoher Sanitäranteil",
        message: `${Math.round(sanitaerRatio * 100)}% der Kosten entfallen auf Sanitärräume. Sanitärbereiche sind personalintensiv.`,
        action: "Ggf. separate Preisgestaltung oder Sondervereinbarung prüfen.",
      });
    }
  }

  if (isDefaultRate) {
    warnings.push({
      id: `${project.id}_default_rate`,
      severity: "info",
      title: "Standard-Stundensatz",
      message: "Es wird der Standard-Stundensatz verwendet. Für eine realistische Kalkulation sollte ein firmenspezifischer Satz berechnet werden.",
      action: "Stundensatz-Kalkulator unter Einstellungen nutzen.",
    });
  }

  return warnings;
}

export function getAllProjectWarnings(
  projects: Project[],
  globalHourlyRate: number,
  hourlyRateConfig: HourlyRateConfig,
  isDefaultRate: boolean,
  disabledWarnings: string[] = [],
  targetMargin?: number
): ProjectWarnings[] {
  const breakdown = calcHourlyRate(hourlyRateConfig);
  const activeProjects = projects.filter((p) => p.status !== "archived");
  const disabled = new Set(disabledWarnings);

  return activeProjects
    .map((p) => ({
      projectId: p.id,
      projectName: p.name,
      warnings: getProjectWarnings(p, globalHourlyRate, hourlyRateConfig, breakdown, isDefaultRate, targetMargin)
        .filter((w) => !disabled.has(getWarningTypeKey(w.id))),
    }))
    .filter((pw) => pw.warnings.length > 0);
}

export function countWarningsBySeverity(allWarnings: ProjectWarnings[]) {
  let critical = 0;
  let warning = 0;
  let info = 0;

  for (const pw of allWarnings) {
    for (const w of pw.warnings) {
      if (w.severity === "critical") critical++;
      else if (w.severity === "warning") warning++;
      else info++;
    }
  }

  return { critical, warning, info, total: critical + warning + info };
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
