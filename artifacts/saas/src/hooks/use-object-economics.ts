import { useMemo } from "react";
import { useStore, type Project } from "@/store/use-store";
import { calcHourlyRate } from "@/lib/hourly-rate-calc";
import { computeObjectEconomics, type EconomicsSettings, type ObjectEconomics } from "@/lib/object-economics";

/** Globale Kalkulationseinstellungen aus dem Store (stabile Referenz, solange sich nichts ändert). */
export function useEconomicsSettings(): EconomicsSettings {
  const hourlyRate = useStore((s) => s.hourlyRate);
  const hourlyRateConfig = useStore((s) => s.hourlyRateConfig);
  const targetMargin = useStore((s) => s.targetMargin);
  const disabledWarnings = useStore((s) => s.disabledWarnings);
  const confirmedHourlyRate = useStore((s) => s.confirmedHourlyRate);
  return useMemo(
    () => ({ hourlyRate, hourlyRateConfig, targetMargin, disabledWarnings, confirmedHourlyRate }),
    [hourlyRate, hourlyRateConfig, targetMargin, disabledWarnings, confirmedHourlyRate],
  );
}

/**
 * Wirtschaftlichkeit eines Objekts (memoisiert). Übergibt die Ist-Stunden der
 * Raum-Nachkalkulation (nachkalkulationen[project.id]) an den Risiko-Score.
 * null, solange kein Projekt vorliegt — darf daher vor jedem early return laufen.
 */
export function useObjectEconomics(project: Project | undefined): ObjectEconomics | null {
  const settings = useEconomicsSettings();
  const projectId = project?.id;
  const actualMonthlyHours = useStore((s) =>
    projectId ? s.nachkalkulationen[projectId]?.actualMonthlyHours : undefined,
  );
  const breakdown = useMemo(() => calcHourlyRate(settings.hourlyRateConfig), [settings.hourlyRateConfig]);
  return useMemo(
    () => (project ? computeObjectEconomics(project, settings, { actualMonthlyHours, breakdown }) : null),
    [project, settings, actualMonthlyHours, breakdown],
  );
}

/**
 * Wirtschaftlichkeit mehrerer Objekte, Schlüssel = project.id. Die Eingabeliste
 * sollte referenzstabil sein (Store-Array oder useMemo), sonst wird neu gerechnet.
 */
export function usePortfolioEconomics(projects: Project[]): Map<string, ObjectEconomics> {
  const settings = useEconomicsSettings();
  const nachkalkulationen = useStore((s) => s.nachkalkulationen);
  const breakdown = useMemo(() => calcHourlyRate(settings.hourlyRateConfig), [settings.hourlyRateConfig]);
  return useMemo(() => {
    const map = new Map<string, ObjectEconomics>();
    for (const p of projects) {
      map.set(p.id, computeObjectEconomics(p, settings, {
        actualMonthlyHours: nachkalkulationen[p.id]?.actualMonthlyHours,
        breakdown,
      }));
    }
    return map;
  }, [projects, settings, nachkalkulationen, breakdown]);
}
