import * as React from "react";
import { ArrowLeft, ArrowRight, Check, ChevronUp, FileText } from "lucide-react";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Tone } from "@/lib/status";
import type { FlowMode } from "./flow-state";

export type FlowSavingKind = "save" | "offer" | null;

export interface FlowFooterProps {
  mode: FlowMode;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  /** Letzter Schritt: „Objekt speichern“ / „Änderungen speichern“. */
  onSave: () => void;
  /** Letzter Schritt: „Speichern & Angebot öffnen“. */
  onSaveAndOffer: () => void;
  savingKind: FlowSavingKind;
  saveDisabled: boolean;
  /** z. B. „Bitte beheben Sie zuerst: …“ oder der Offline-Hinweis. */
  saveHint?: string | null;
  /** Zusammenfassung (unter lg): Monatspreis und Status. */
  priceMonthly: number;
  status: { tone: Tone; label: string };
  /** Inhalt des Sheets „Details“ (LiveSummary); `close` schließt das Sheet. */
  details: (close: () => void) => React.ReactNode;
}

/**
 * Fixierte Fußleiste des Flows (`chrome="focus"`, ohne BottomNav):
 * unter lg eine Preiszeile (öffnet „Details“), darunter Zurück / Weiter
 * bzw. im letzten Schritt Speichern.
 */
export function FlowFooter({
  mode,
  isFirst,
  isLast,
  onBack,
  onNext,
  onSave,
  onSaveAndOffer,
  savingKind,
  saveDisabled,
  saveHint,
  priceMonthly,
  status,
  details,
}: FlowFooterProps) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const busy = savingKind !== null;
  const saveLabel = mode === "create" ? "Objekt speichern" : "Änderungen speichern";
  const hintId = React.useId();

  return (
    <StickyActionBar chrome="focus" width="wide" label="Schrittnavigation">
      <div className="flex w-full flex-col gap-2">
        {!isLast && (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-haspopup="dialog"
            className="-mx-2 flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="text-label text-muted-foreground">Monatspreis</span>
              <Money value={priceMonthly} period="month" className="font-semibold text-foreground" />
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <StatusBadge size="sm" tone={status.tone} label={status.label} />
              <span className="text-xs font-medium text-primary">Details</span>
              <ChevronUp aria-hidden="true" className="size-4 text-primary" />
            </span>
          </button>
        )}

        {isLast && saveHint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {saveHint}
          </p>
        )}

        {isLast && (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:hidden"
            onClick={onSaveAndOffer}
            disabled={saveDisabled || (busy && savingKind !== "offer")}
            loading={savingKind === "offer"}
            aria-describedby={saveHint ? hintId : undefined}
          >
            <FileText aria-hidden="true" />
            Speichern &amp; Angebot öffnen
          </Button>
        )}

        <div className="flex items-center gap-3 lg:justify-end">
          {!isFirst && (
            <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
              <ArrowLeft aria-hidden="true" />
              Zurück
            </Button>
          )}
          {isLast ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="hidden sm:inline-flex"
                onClick={onSaveAndOffer}
                disabled={saveDisabled || (busy && savingKind !== "offer")}
                loading={savingKind === "offer"}
                aria-describedby={saveHint ? hintId : undefined}
              >
                <FileText aria-hidden="true" />
                Speichern &amp; Angebot öffnen
              </Button>
              <Button
                type="button"
                className="flex-1 lg:flex-none"
                onClick={onSave}
                disabled={saveDisabled || (busy && savingKind !== "save")}
                loading={savingKind === "save"}
                aria-describedby={saveHint ? hintId : undefined}
              >
                <Check aria-hidden="true" />
                {saveLabel}
              </Button>
            </>
          ) : (
            <Button type="button" className="flex-1 lg:min-w-40 lg:flex-none" onClick={onNext}>
              Weiter
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <ResponsiveSheet open={detailsOpen} onOpenChange={setDetailsOpen} title="Details" description="Live-Kalkulation des Entwurfs">
        {details(() => setDetailsOpen(false))}
      </ResponsiveSheet>
    </StickyActionBar>
  );
}
