import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useStore } from "@/store/use-store";
import { useObjectEconomics } from "@/hooks/use-object-economics";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { getOfferReadiness } from "@/lib/offer-readiness";
import { canRemoveWatermark } from "@/lib/feature-gates";
import { StateView } from "@/components/ui/state-view";
import { OfferDocument, useOfferCompany } from "@/components/offer/OfferDocument";
import { PrintToolbar, PRINT_STAGE_CLASS } from "@/components/offer/PrintToolbar";
import type { OfferDetail } from "@/components/offer/offer-meta";

/**
 * /print/:id — das Kundenangebot. Bildschirm: Werkzeugleiste + A4-Blatt in
 * einem horizontal scrollbaren Bereich. Druck: nur das Dokument (immer hell).
 */
export default function PrintView() {
  const [, params] = useRoute("/print/:id");
  const id = params?.id;

  // Alle Hooks vor jedem early return.
  const project = useStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined));
  const economics = useObjectEconomics(project);
  const company = useOfferCompany();
  useStore((s) => s.plan);
  const { hasLoadedOnce } = useSyncStatus();
  const [detail, setDetail] = useState<OfferDetail>("compact");
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
          <StateView kind="loading" titleAs="h1" title="Angebot wird geladen …" />
        )}
      </main>
    );
  }

  const watermark = !canRemoveWatermark().allowed;

  return (
    <div className="min-h-dvh bg-background print:bg-transparent">
      <PrintToolbar
        variant="customer"
        project={project}
        economics={economics}
        readiness={readiness}
        detail={detail}
        onDetailChange={setDetail}
      />
      <main>
        <div role="region" aria-label="Angebotsdokument" tabIndex={0} className={PRINT_STAGE_CLASS}>
          <OfferDocument
            project={project}
            economics={economics}
            company={company}
            detail={detail}
            watermark={watermark}
          />
        </div>
      </main>
    </div>
  );
}
