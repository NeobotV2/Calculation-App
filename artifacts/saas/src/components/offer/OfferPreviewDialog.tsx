import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { FileText } from "lucide-react";
import { useStore, type Project } from "@/store/use-store";
import { useObjectEconomics } from "@/hooks/use-object-economics";
import { canRemoveWatermark, canUsePDF } from "@/lib/feature-gates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StateView } from "@/components/ui/state-view";
import { cn } from "@/lib/utils";
import { OfferDocument, useOfferCompany } from "./OfferDocument";
import type { OfferDetail } from "./offer-meta";

/**
 * Skaliert ein breites Kind (A4-Blatt, 210 mm) auf die verfügbare Breite.
 * Die Höhe des Platzhalters folgt der skalierten Höhe, damit gescrollt werden kann.
 */
export function ScaledToFit({ children, className }: { children: React.ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const available = outer.clientWidth;
      const natural = inner.offsetWidth;
      const s = natural > 0 && available > 0 ? Math.min(1, available / natural) : 1;
      setScale(s);
      setHeight(inner.offsetHeight * s);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className={cn("w-full overflow-hidden", className)} style={{ height }}>
      <div
        ref={innerRef}
        className={cn("w-max origin-top-left", scale >= 1 && "mx-auto")}
        style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export interface OfferPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | undefined;
  /** Detailgrad der Vorschau (Standard: kompakt, wie /print/:id beim Öffnen). */
  detail?: OfferDetail;
}

/** Vorschau = exakt das Kundenangebot von /print/:id, auf die Dialogbreite skaliert. Immer erlaubt. */
export function OfferPreviewDialog({ open, onOpenChange, project, detail = "compact" }: OfferPreviewDialogProps) {
  const economics = useObjectEconomics(project);
  const company = useOfferCompany();
  // Plan-Abo, damit Wasserzeichen und Hinweis nach einem Upgrade neu berechnet werden.
  useStore((s) => s.plan);
  const watermark = !canRemoveWatermark().allowed;
  const pdfAllowed = canUsePDF().allowed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-4 md:px-6">
          <DialogTitle>Angebot-Vorschau</DialogTitle>
          <DialogDescription>
            {pdfAllowed ? "So erhält Ihr Kunde das Angebot." : "Vorschau · Export im Pro-Plan"}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken p-3 md:p-6">
          {project && economics ? (
            <ScaledToFit>
              <OfferDocument
                project={project}
                economics={economics}
                company={company}
                detail={detail}
                watermark={watermark}
                titleAs="h2"
              />
            </ScaledToFit>
          ) : (
            <StateView
              kind="not-found"
              compact
              titleAs="h3"
              title="Objekt nicht gefunden"
              description="Das Objekt wurde möglicherweise gelöscht."
            />
          )}
        </div>
        <DialogFooter className="border-t border-border px-4 py-4 md:px-6">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          {project && (
            <Button asChild>
              <Link href={`/print/${project.id}`} onClick={() => onOpenChange(false)}>
                <FileText aria-hidden="true" />
                Zum Angebot
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
