import type { EmploymentType } from "@/lib/hourly-rate-calc";

export function fmtPct(v: number) {
  return v.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  minijob: "Minijob",
  teilzeit: "Teilzeit",
  vollzeit: "Vollzeit",
};
