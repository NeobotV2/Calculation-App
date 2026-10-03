import { useMemo } from "react";
import { useRoute } from "wouter";
import { useStore } from "@/store/use-store";
import { useObjectEconomics } from "@/hooks/use-object-economics";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { getOfferReadiness } from "@/lib/offer-readiness";
import { StateView } from "@/components/ui/state-view";
import { InternalCalcDocument } from "@/components/offer/InternalCalcDocument";
import { useOfferCompany } from "@/components/offer/OfferDocument";
import { PrintToolbar, PRINT_STAGE_CLASS } from "@/components/offer/PrintToolbar";

/**
 * /print/:id/intern — interne Kalkulation (Kosten, Marge, Risiko). Drucken ist
 * nicht plan-gesperrt. Strategie und Risiko stammen aus useObjectEconomics
 * (inkl. Module und Nachkalkulations-Ist-Stunden) — identisch mit dem Arbeitsbereich.
 */
export default function InternPrintView() {
  const [, params] = useRoute("/print/:id/intern");
  const id = params?.id;

  // Alle Hooks vor jedem early return.
  const project = useStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined));
  const economics = useObjectEconomics(project);
  const company = useOfferCompany();
  const { hasLoadedOnce } = useSyncStatus();
  const readiness = useMemo(
    () => (project && economics ? getOfferReadiness(project, economics, company) : null),
    [project, economics, company],
  );

  if (!project || !economics || !readiness) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background pt-safe">
        {hasLoadedOnce ? (
          <StateView
            kind="not-found"
            titleAs="h1"
            title="Objekt nicht gefunden"
            description="Das Objekt wurde möglicherweise gelöscht oder ist auf diesem Gerät nicht verfügbar."
            action={{ label: "Zur Objektliste", href: "/objekte" }}
          />
        ) : (
          <StateView kind="loading" titleAs="h1" title="Kalkulation wird geladen …" />
        )}
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-background print:bg-transparent">
      <PrintToolbar variant="internal" project={project} economics={economics} readiness={readiness} />
      <main>
        <div role="region" aria-label="Interne Kalkulation" tabIndex={0} className={PRINT_STAGE_CLASS}>
          <InternalCalcDocument project={project} economics={economics} companyName={company.companyName} />
        </div>
      </main>
    </div>
  );
}
