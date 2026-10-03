/* ─────────────────────────────────────────────────────────────────────────
   Wirtschaftlichkeit eines Objekts in EINEM Aufruf: Satz, Gesamtkalkulation
   (inkl. Winterdienst/HMS), Preisstrategie, Sensitivität, Risiko, Warnungen
   und Modul-Befunde. UI-Code nutzt dieses Ergebnis und rechnet Summen nie
   selbst nach. Für reine Raum-Objekte sind Strategie, Sensitivität, Risiko
   und Warnungen identisch mit den bisherigen Einzelaufrufen.
   ───────────────────────────────────────────────────────────────────────── */
import type { Project } from "@/store/use-store";
import {
  calcHourlyRate,
  getDefaultConfig,
  type HourlyRateBreakdown,
  type HourlyRateConfig,
} from "@/lib/hourly-rate-calc";
import { calcObjectTotals, type ObjectTotals } from "@/lib/object-totals";
import {
  calcPriceStrategy,
  calcSensitivity,
  type PriceStrategy,
  type SensitivityCase,
  type StrategyInput,
} from "@/lib/price-strategy";
import { calcRiskScore, type RiskResult } from "@/lib/risk-score";
import { getProjectWarnings, getWarningTypeKey, type Warning } from "@/lib/warnings";
import { evaluateModuleFindings, type ModuleFinding } from "@/lib/service-modules/plausibility";
import type { ModuleRates } from "@/lib/service-modules/types";

/** Globale Einstellungen, von denen die Objekt-Wirtschaftlichkeit abhängt (Store-Felder). */
export interface EconomicsSettings {
  /** Globaler Verrechnungssatz €/h. */
  hourlyRate: number;
  hourlyRateConfig: HourlyRateConfig;
  /** Gewinnaufschlag auf Vollkosten in % (wird intern in eine Umsatzmarge umgerechnet). */
  targetMargin: number;
  /** Abgeschaltete Warnungstypen (getWarningTypeKey-Schlüssel). */
  disabledWarnings: string[];
}

export interface ObjectEconomics {
  /** project.hourlyRate ?? globaler Satz. */
  effectiveRate: number;
  breakdown: HourlyRateBreakdown;
  /** Globaler Satz 22,50 € und unveränderte Standard-Konfiguration. */
  isDefaultRate: boolean;
  /** isDefaultRate und das Objekt hat keinen eigenen Satz. */
  usesDefaultRate: boolean;
  /** { rate: effectiveRate, vollkosten: breakdown.vollkosten }. */
  rates: ModuleRates;
  totals: ObjectTotals;
  strategyInput: StrategyInput;
  strategy: PriceStrategy;
  sensitivity: SensitivityCase[];
  risk: RiskResult;
  /** Warnungen, gefiltert nach disabledWarnings. */
  warnings: Warning[];
  /** Ungefilterte Modul-Befunde (evaluateModuleFindings); leer ohne aktive Module. */
  moduleFindings: ModuleFinding[];
}

export interface ObjectEconomicsOptions {
  /** Ist-Stunden aus der Raum-Nachkalkulation (nachkalkulationen[project.id]). */
  actualMonthlyHours?: number;
  /** Vorberechnetes calcHourlyRate(settings.hourlyRateConfig) — spart Arbeit bei Portfolios. */
  breakdown?: HourlyRateBreakdown;
}

export const DEFAULT_HOURLY_RATE = 22.5;

let defaultConfigJson: string | null = null;

/** Gleiche Regel wie bisher in den Seiten: 22,50 €/h und JSON-gleiche Standard-Konfiguration. */
export function isDefaultRateSetting(hourlyRate: number, config: HourlyRateConfig): boolean {
  if (hourlyRate !== DEFAULT_HOURLY_RATE) return false;
  if (defaultConfigJson === null) defaultConfigJson = JSON.stringify(getDefaultConfig());
  return JSON.stringify(config) === defaultConfigJson;
}

export function computeObjectEconomics(
  project: Project,
  s: EconomicsSettings,
  opts?: ObjectEconomicsOptions,
): ObjectEconomics {
  const effectiveRate = project.hourlyRate ?? s.hourlyRate;
  const breakdown = opts?.breakdown ?? calcHourlyRate(s.hourlyRateConfig);
  const isDefaultRate = isDefaultRateSetting(s.hourlyRate, s.hourlyRateConfig);
  const usesDefaultRate = isDefaultRate && !project.hourlyRate;
  const rates: ModuleRates = { rate: effectiveRate, vollkosten: breakdown.vollkosten };
  const totals = calcObjectTotals(project, rates);

  const strategyInput: StrategyInput = {
    monthlyHours: totals.cleaning.hours,
    area: totals.cleaning.area,
    effectiveRate,
    vollkosten: breakdown.vollkosten,
    targetMarkupPct: s.targetMargin,
    extras: totals.extras,
  };
  const strategy = calcPriceStrategy(strategyInput);
  const sensitivity = calcSensitivity(strategyInput);
  const risk = calcRiskScore({
    project,
    monthlyHours: totals.cleaning.hours,
    area: totals.cleaning.area,
    monthlyCost: totals.cleaning.cost,
    marginPct: strategy.marginPct,
    targetMarginPct: strategy.targetMarginPct,
    usesDefaultRate,
    actualMonthlyHours: opts?.actualMonthlyHours,
    objectTotals: totals,
  });

  const disabled = new Set(s.disabledWarnings);
  const warnings = getProjectWarnings(project, s.hourlyRate, s.hourlyRateConfig, breakdown, isDefaultRate, s.targetMargin)
    .filter((w) => !disabled.has(getWarningTypeKey(w.id)));
  const moduleFindings = totals.hasModules ? evaluateModuleFindings(project, totals, strategy.targetMarginPct) : [];

  return {
    effectiveRate, breakdown, isDefaultRate, usesDefaultRate, rates, totals,
    strategyInput, strategy, sensitivity, risk, warnings, moduleFindings,
  };
}
