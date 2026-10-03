import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useStore, type Project } from "@/store/use-store";
import { calcHourlyRate } from "@/lib/hourly-rate-calc";
import { computeObjectEconomics, type ObjectEconomics } from "@/lib/object-economics";
import { getOfferReadiness, type CompanyInfo, type OfferReadiness } from "@/lib/offer-readiness";
import { useEconomicsSettings, useObjectEconomics } from "@/hooks/use-object-economics";
import { OfferCheckDialog } from "./OfferCheckDialog";

export interface UseOfferActionResult {
  /**
   * „Angebot erstellen“: ohne Blocker, kritische Punkte und Angebotslücken direkt
   * zu /print/{id}, sonst öffnet sich der Angebots-Check. Optional ein anderes
   * (z. B. gerade gespeichertes) Objekt oder dessen ID übergeben.
   */
  trigger: (target?: Project | string) => void;
  /** Dialog-Element; einmal im Baum der aufrufenden Komponente rendern. */
  element: React.ReactNode;
  /** Angebotsreife des übergebenen Objekts (null ohne Objekt). */
  readiness: OfferReadiness | null;
  economics: ObjectEconomics | null;
}

/** Firmenfelder für die Angebotsreife (Briefkopf). */
function useCompanyInfo(): CompanyInfo {
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  return useMemo(
    () => ({ companyName, companyStreet, companyZip, companyCity }),
    [companyName, companyStreet, companyZip, companyCity],
  );
}

/**
 * Einheitliche Aktion „Angebot erstellen“ (UX §9). Alle Hooks laufen
 * unabhängig davon, ob `project` gesetzt ist — darf vor jedem early return stehen.
 */
export function useOfferAction(project: Project | undefined): UseOfferActionResult {
  const [, navigate] = useLocation();
  const settings = useEconomicsSettings();
  const company = useCompanyInfo();
  const breakdown = useMemo(() => calcHourlyRate(settings.hourlyRateConfig), [settings.hourlyRateConfig]);

  const economics = useObjectEconomics(project);
  const readiness = useMemo(
    () => (project && economics ? getOfferReadiness(project, economics, company) : null),
    [project, economics, company],
  );

  // Ziel des Dialogs: das übergebene Objekt oder ein per trigger(target) gewähltes.
  const [dialogTargetId, setDialogTargetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const storedTarget = useStore((s) =>
    dialogTargetId ? s.projects.find((p) => p.id === dialogTargetId) : undefined,
  );
  const [fallbackTarget, setFallbackTarget] = useState<Project | null>(null);
  const dialogProject = dialogTargetId ? storedTarget ?? fallbackTarget ?? undefined : project;
  const dialogEconomics = useObjectEconomics(dialogTargetId ? dialogProject : undefined) ?? (dialogTargetId ? null : economics);
  const dialogReadiness = useMemo(
    () => (dialogProject && dialogEconomics ? getOfferReadiness(dialogProject, dialogEconomics, company) : null),
    [dialogProject, dialogEconomics, company],
  );

  const trigger = useCallback(
    (target?: Project | string) => {
      let p: Project | undefined = project;
      if (typeof target === "string") p = useStore.getState().projects.find((x) => x.id === target);
      else if (target) p = target;
      if (!p) return;

      const isOwn = !!project && p.id === project.id && p === project;
      let r: OfferReadiness;
      if (isOwn && readiness) {
        r = readiness;
      } else {
        const actualMonthlyHours = useStore.getState().nachkalkulationen[p.id]?.actualMonthlyHours;
        const econ = computeObjectEconomics(p, settings, { actualMonthlyHours, breakdown });
        r = getOfferReadiness(p, econ, company);
      }

      if (r.isOfferReady) {
        setOpen(false);
        navigate(`/print/${p.id}`);
        return;
      }
      if (isOwn) {
        setDialogTargetId(null);
        setFallbackTarget(null);
      } else {
        setDialogTargetId(p.id);
        setFallbackTarget(p);
      }
      setOpen(true);
    },
    [project, readiness, settings, breakdown, company, navigate],
  );

  const element = dialogProject && dialogEconomics && dialogReadiness ? (
    <OfferCheckDialog
      open={open}
      onOpenChange={setOpen}
      project={dialogProject}
      economics={dialogEconomics}
      readiness={dialogReadiness}
      mode="gate"
    />
  ) : null;

  return { trigger, element, readiness, economics };
}
