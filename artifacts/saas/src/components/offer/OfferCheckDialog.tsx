import * as React from "react";
import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Eye, FileText } from "lucide-react";
import type { Project } from "@/store/use-store";
import type { ObjectEconomics } from "@/lib/object-economics";
import { fixHref, getObjectStatus, type OfferReadiness, type ReadinessItem } from "@/lib/offer-readiness";
import { severityTone, TONE_CLASSES, TONE_ICON, type Tone } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatCurrency } from "@/lib/utils";
import { OfferPreviewDialog } from "./OfferPreviewDialog";

export { openOfferItemCount, readinessLabel, readinessTone } from "./offer-meta";

export type OfferCheckMode = "gate" | "info";

export interface OfferCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  economics: ObjectEconomics;
  readiness: OfferReadiness;
  /**
   * gate (Standard): vor dem Öffnen des Angebots — Blocker sperren „Angebot öffnen“,
   * kritische Punkte verlangen die Bestätigung. info: reine Statusanzeige (z. B. auf /print/:id).
   */
  mode?: OfferCheckMode;
  /** Statt der Navigation zu /print/{id} (z. B. nach dem Speichern im Flow). */
  onProceed?: () => void;
}

function ItemList({
  items,
  project,
  toneOf,
  onNavigate,
}: {
  items: ReadinessItem[];
  project: Project;
  toneOf: (item: ReadinessItem) => Tone;
  onNavigate: () => void;
}) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {items.map((item) => {
        const tone = toneOf(item);
        const Icon = TONE_ICON[tone];
        return (
          <li key={item.id} className="flex items-start gap-3 p-3">
            <Icon aria-hidden="true" strokeWidth={2} className={cn("mt-0.5 size-4 shrink-0", TONE_CLASSES[tone].icon)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {item.message && <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>}
            </div>
            {item.fix && (
              <Button asChild variant="secondary" size="sm" className="shrink-0">
                <Link href={fixHref(project, item.fix)} onClick={onNavigate} aria-label={`Beheben: ${item.title}`}>
                  Beheben
                </Link>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Group({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: Tone;
  count: number;
  children: React.ReactNode;
}) {
  const id = useId();
  const Icon = TONE_ICON[tone];
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="flex items-center gap-2 text-label text-foreground">
        <Icon aria-hidden="true" strokeWidth={2} className={cn("size-4", TONE_CLASSES[tone].icon)} />
        {title}
        <span className="text-muted-foreground">({count})</span>
      </h3>
      {children}
    </section>
  );
}

/** Angebots-Check (§9): Blocker, Kritisch (mit Bestätigung), Für das Angebot, Hinweise (eingeklappt). */
export function OfferCheckDialog({
  open,
  onOpenChange,
  project,
  economics,
  readiness,
  mode = "gate",
  onProceed,
}: OfferCheckDialogProps) {
  const [, navigate] = useLocation();
  const [confirmed, setConfirmed] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const confirmId = useId();
  const hintsId = useId();

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setHintsOpen(false);
    }
  }, [open]);

  const { blockers, criticals, offerGaps, hints } = readiness;
  const isGate = mode === "gate";
  const hasBlockers = blockers.length > 0;
  const needsConfirm = criticals.length > 0;
  const canProceed = !hasBlockers && (!needsConfirm || confirmed);
  const status = getObjectStatus(project, readiness);
  const close = () => onOpenChange(false);

  const proceed = () => {
    if (!canProceed) return;
    close();
    if (onProceed) onProceed();
    else navigate(`/print/${project.id}`);
  };

  const description = hasBlockers
    ? "Bitte beheben Sie zuerst die Blocker – danach können Sie das Angebot öffnen."
    : needsConfirm
      ? "Der Preis deckt nicht alle Kosten. Prüfen Sie die kritischen Punkte, bevor Sie das Angebot öffnen."
      : offerGaps.length > 0
        ? "Für ein vollständiges Angebot fehlen noch Angaben."
        : "Es gibt keine offenen Punkte.";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90dvh] max-w-xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="space-y-2 border-b border-border px-4 py-4 md:px-6">
            <DialogTitle>{isGate ? "Angebot prüfen" : "Angebotsstatus"}</DialogTitle>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusBadge tone={status.tone} label={status.label} />
              <span className="text-sm text-muted-foreground">
                Monatspreis netto{" "}
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(economics.totals.priceMonthly)}</span>
              </span>
            </div>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-6">
            {blockers.length === 0 && criticals.length === 0 && offerGaps.length === 0 && (
              <Callout tone="success" title="Angebotsbereit">
                Name, Preis, Kunde und Firmendaten sind vollständig.
              </Callout>
            )}

            {blockers.length > 0 && (
              <Group title="Blocker" tone="critical" count={blockers.length}>
                <ItemList items={blockers} project={project} toneOf={() => "critical"} onNavigate={close} />
              </Group>
            )}

            {criticals.length > 0 && (
              <Group title="Kritisch" tone="critical" count={criticals.length}>
                <ItemList items={criticals} project={project} toneOf={() => "critical"} onNavigate={close} />
                {isGate && !hasBlockers && (
                  <div className="flex items-start gap-3 rounded-lg border border-destructive-border bg-destructive-soft p-3">
                    <Checkbox
                      id={confirmId}
                      checked={confirmed}
                      onCheckedChange={(v) => setConfirmed(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor={confirmId} className="cursor-pointer text-sm leading-5 text-foreground">
                      Ich habe die Unterdeckung geprüft und möchte trotzdem fortfahren.
                    </label>
                  </div>
                )}
              </Group>
            )}

            {offerGaps.length > 0 && (
              <Group title="Für das Angebot" tone="warning" count={offerGaps.length}>
                <ItemList items={offerGaps} project={project} toneOf={() => "warning"} onNavigate={close} />
              </Group>
            )}

            {hints.length > 0 && (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-3"
                  aria-expanded={hintsOpen}
                  aria-controls={hintsId}
                  onClick={() => setHintsOpen((v) => !v)}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("transition-transform motion-reduce:transition-none", hintsOpen && "rotate-180")}
                  />
                  Hinweise ({hints.length})
                </Button>
                <div id={hintsId} hidden={!hintsOpen} className="pt-2">
                  {hintsOpen && (
                    <ItemList
                      items={hints}
                      project={project}
                      toneOf={(item) => severityTone(item.severity ?? "info")}
                      onNavigate={close}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border px-4 py-4 md:px-6">
            {isGate ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPreviewOpen(true)}
                  disabled={hasBlockers}
                >
                  <Eye aria-hidden="true" />
                  Vorschau
                </Button>
                <Button type="button" onClick={proceed} disabled={!canProceed}>
                  <FileText aria-hidden="true" />
                  Angebot öffnen
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" onClick={close}>
                Schließen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isGate && <OfferPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} project={project} />}
    </>
  );
}
