import { useId } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PAGE_GUTTER_CLASS, PAGE_WIDTH_CLASS } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";
import { formatClock, type FlowMode } from "./flow-state";

export interface FlowHeaderProps {
  mode: FlowMode;
  /** Objektname (Bearbeiten: „Kalkulation bearbeiten · {name}“). */
  name: string;
  /** Letzte automatische Sicherung (ISO) oder null. */
  savedAt: string | null;
  /** Speichern läuft. */
  saving?: boolean;
  /** Bearbeiten: „Änderungen speichern“ (auf jedem Schritt). */
  onSave?: () => void;
  saveDisabled?: boolean;
  /**
   * Grund, falls Speichern gesperrt ist (z. B. offline). Wird per
   * `aria-describedby` angebunden; sichtbar zeigt ihn der Flow als Callout.
   */
  saveDisabledReason?: string;
  onClose: () => void;
}

/** Kopfzeile des Flows (Fokus-Modus): Schließen, Titel, Sicherungsstatus, Speichern. */
export function FlowHeader({
  mode,
  name,
  savedAt,
  saving = false,
  onSave,
  saveDisabled = false,
  saveDisabledReason,
  onClose,
}: FlowHeaderProps) {
  const title = mode === "create" ? "Neue Kalkulation" : "Kalkulation bearbeiten";
  const trimmed = name.trim();
  const status = saving ? "Wird gespeichert…" : savedAt ? `Entwurf gespeichert ${formatClock(savedAt)}` : null;
  const reasonId = useId();
  const showReason = saveDisabled && !!saveDisabledReason;

  return (
    <header className="no-print sticky top-0 z-sticky border-b border-border bg-card pt-safe">
      <div className={cn("mx-auto flex h-14 w-full items-center gap-2 md:gap-3", PAGE_WIDTH_CLASS.wide, PAGE_GUTTER_CLASS)}>
        <IconButton icon={X} label="Kalkulation schließen" onClick={onClose} className="-ml-2" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h3 text-foreground">
            {title}
            {mode === "edit" && trimmed && <span className="font-normal text-muted-foreground"> · {trimmed}</span>}
          </h1>
          {status && (
            <p className="truncate text-xs text-muted-foreground md:hidden">{status}</p>
          )}
        </div>
        {status && <p className="hidden shrink-0 text-xs text-muted-foreground md:block">{status}</p>}
        {mode === "edit" && onSave && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onSave}
            loading={saving}
            disabled={saveDisabled}
            aria-label="Änderungen speichern"
            aria-describedby={showReason ? reasonId : undefined}
            className="shrink-0"
          >
            <Check aria-hidden="true" />
            <span className="hidden sm:inline">Änderungen speichern</span>
            <span className="sm:hidden">Speichern</span>
          </Button>
        )}
        {mode === "edit" && onSave && showReason && (
          <span id={reasonId} className="sr-only">
            {saveDisabledReason}
          </span>
        )}
      </div>
    </header>
  );
}
