import * as React from "react";
import { useId, useState } from "react";
import { ArrowLeft, Crown, Printer, Share2 } from "lucide-react";
import { useStore, type Project } from "@/store/use-store";
import type { ObjectEconomics } from "@/lib/object-economics";
import type { OfferReadiness } from "@/lib/offer-readiness";
import { canUsePDF } from "@/lib/feature-gates";
import type { UpgradeTrigger } from "@/lib/billing-config";
import { sharePrintView } from "@/lib/native-share";
import { isNative } from "@/lib/capacitor";
import { TONE_CLASSES, TONE_ICON } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { PageContainer } from "@/components/layout/PageContainer";
import { OfferCheckDialog } from "./OfferCheckDialog";
import { OFFER_DETAIL_LABELS, offerStatusChip, type OfferDetail } from "./offer-meta";

export type PrintToolbarVariant = "customer" | "internal";

export interface PrintToolbarProps {
  project: Project;
  economics: ObjectEconomics;
  readiness: OfferReadiness;
  /** customer: Angebot (Plan-Gate, Unterdeckungs-Bestätigung) · internal: interne Kalkulation (ungesperrt). */
  variant: PrintToolbarVariant;
  /** Nur customer: Detailgrad „Kompakt | Mit Leistungsdaten“. */
  detail?: OfferDetail;
  onDetailChange?: (detail: OfferDetail) => void;
}

/** Wartezeit, bis Dialog und Overlay ausgeblendet sind, bevor der Druckdialog öffnet. */
const PRINT_DELAY_MS = 200;

/**
 * Werkzeugleiste der Druckansichten (nicht im Druck): Zurück zum Objekt,
 * Detailgrad, Angebotsstatus (öffnet den Angebots-Check im Info-Modus) und
 * „Drucken / PDF“ (Angebot: Pro-Plan; bei Unterdeckung erst bestätigen).
 */
export function PrintToolbar({ project, economics, readiness, variant, detail = "compact", onDetailChange }: PrintToolbarProps) {
  // Plan-Abo: Gate nach einem Upgrade neu auswerten.
  useStore((s) => s.plan);
  const pdfGate = canUsePDF();
  const isCustomer = variant === "customer";
  const locked = isCustomer && !pdfGate.allowed;

  const hintId = useId();
  const [checkOpen, setCheckOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeTrigger | undefined>(undefined);

  const status = offerStatusChip(project, readiness);
  const StatusIcon = TONE_ICON[status.tone];
  const backLabel = `Zurück zu ${project.name?.trim() || "Objekt"}`;

  const doPrint = (delayed = false) => {
    const run = () => {
      if (isCustomer) void sharePrintView();
      else window.print();
    };
    if (delayed) window.setTimeout(run, PRINT_DELAY_MS);
    else run();
  };

  const handlePrint = () => {
    if (!isCustomer) {
      doPrint();
      return;
    }
    if (!pdfGate.allowed) {
      setUpgradeReason(pdfGate.reason ?? "");
      setUpgradeTrigger(pdfGate.trigger);
      setUpgradeOpen(true);
      return;
    }
    if (!readiness.canExport) {
      setCheckOpen(true);
      return;
    }
    if (readiness.criticals.length > 0) {
      setConfirmOpen(true);
      return;
    }
    doPrint();
  };

  const printLabel = isNative && isCustomer ? "Teilen" : isCustomer ? "Drucken / PDF" : "Drucken";
  const PrintIcon = locked ? Crown : isNative && isCustomer ? Share2 : Printer;

  return (
    <header className="no-print sticky top-0 z-sticky border-b border-border bg-card pt-safe shadow-surface">
      <PageContainer width="wide" className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
        <IconButton icon={ArrowLeft} label={backLabel} href={`/objekte/${project.id}`} className="-ml-2" />

        <div className="min-w-0 flex-1">
          <p className="text-overline uppercase text-muted-foreground">
            {isCustomer ? "Angebot" : "Interne Kalkulation"}
          </p>
          <p className="truncate text-sm font-medium text-foreground">{project.name || "Objekt ohne Namen"}</p>
        </div>

        {/* Unter md: zweite Zeile (Detailgrad + Status); ab md in einer Zeile. */}
        <div className="order-last flex w-full flex-wrap items-center gap-2 md:order-none md:w-auto">
          {isCustomer && onDetailChange && (
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={detail}
              onValueChange={(v) => {
                if (v === "compact" || v === "detailed") onDetailChange(v);
              }}
              aria-label="Detailgrad"
              className="justify-start"
            >
              {(["compact", "detailed"] as const).map((d) => (
                <ToggleGroupItem key={d} value={d} className="px-3">
                  {OFFER_DETAIL_LABELS[d]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCheckOpen(true)}
            aria-label={`Angebotsstatus: ${status.spokenLabel}. Details anzeigen`}
          >
            <StatusIcon aria-hidden="true" strokeWidth={2} className={TONE_CLASSES[status.tone].icon} />
            <span className="max-w-40 truncate">{status.label}</span>
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {locked && (
            <span className="hidden text-xs text-muted-foreground lg:inline">Vorschau · Export im Pro-Plan</span>
          )}
          <Button type="button" size="sm" onClick={handlePrint} aria-describedby={locked ? hintId : undefined}>
            <PrintIcon aria-hidden="true" />
            {printLabel}
            {locked && (
              <span className="rounded-xs bg-primary-foreground px-1.5 text-xs font-semibold text-primary">Pro</span>
            )}
          </Button>
          {locked && (
            <span id={hintId} className="sr-only">
              Pro-Funktion. Die Vorschau ist frei, Drucken und PDF-Export sind im Pro-Plan enthalten.
            </span>
          )}
        </div>
      </PageContainer>

      <OfferCheckDialog
        open={checkOpen}
        onOpenChange={setCheckOpen}
        project={project}
        economics={economics}
        readiness={readiness}
        mode="info"
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Angebot trotz Unterdeckung drucken?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Der Preis deckt nicht alle Kosten:</p>
                <ul className="list-disc space-y-1 pl-5">
                  {readiness.criticals.map((c) => (
                    <li key={c.id}>
                      <span className="font-medium text-foreground">{c.title}</span>
                      {c.message ? ` – ${c.message}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => doPrint(true)}>
              Trotzdem drucken
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
        triggerReason={upgradeTrigger}
      />
    </header>
  );
}

/**
 * Für Seiten: Bildschirm-Rahmen um das Papierdokument (horizontal scrollbar, im Druck neutral).
 * `relative`: absolut positionierte `sr-only`-Elemente im Dokument bleiben im Scrollbereich
 * und verbreitern auf Phones nicht die ganze Seite.
 */
export const PRINT_STAGE_CLASS = "relative overflow-x-auto px-4 py-6 md:px-6 md:py-8 print:static print:overflow-visible print:p-0";
