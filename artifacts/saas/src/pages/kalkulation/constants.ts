import type { CleaningType, EmploymentType } from "@/lib/hourly-rate-calc";

export function fmtPct(v: number) {
  return v.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Stunden ohne erzwungene Nachkommastellen (max. eine), z. B. „2.028" oder „62,4". */
export function fmtHours(v: number) {
  return v.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  minijob: "Minijob",
  teilzeit: "Teilzeit",
  vollzeit: "Vollzeit",
};

export const CLEANING_TYPES: CleaningType[] = ["unterhalt", "sonder", "glas", "bauend"];
