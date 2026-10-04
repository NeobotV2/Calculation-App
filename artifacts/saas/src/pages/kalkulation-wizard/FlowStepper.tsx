import * as React from "react";
import { Check, ChevronDown, TriangleAlert } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import type { FlowStepId } from "@/lib/offer-readiness";
import { cn } from "@/lib/utils";
import { FLOW_STEP_LABELS, type FlowStepStatus } from "./flow-state";

export interface FlowStepperProps {
  steps: FlowStepStatus[];
  current: FlowStepId;
  /** Ist der Schritt anklickbar? (Neuanlage: besuchte, Bearbeiten: alle) */
  canSelect: (step: FlowStepId) => boolean;
  onSelect: (step: FlowStepId) => void;
  className?: string;
}

function stateText(s: FlowStepStatus, current: boolean): string {
  if (current) return "aktueller Schritt";
  if (s.completion === "complete") return "vollständig";
  if (s.completion === "incomplete" && s.visited) return "unvollständig";
  return "";
}

/** Nummernkreis mit Haken (vollständig) bzw. Warnsymbol (besucht, unvollständig). */
function StepMarker({ s, current }: { s: FlowStepStatus; current: boolean }) {
  const warn = !current && s.visited && s.completion === "incomplete";
  const done = !current && s.completion === "complete" && s.visited;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
        current && "border-primary bg-primary text-primary-foreground",
        done && "border-primary bg-primary-soft text-primary",
        warn && "border-warning-border bg-warning-soft text-warning",
        !current && !done && !warn && "border-border-strong bg-card text-muted-foreground",
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={2.5} /> : warn ? <TriangleAlert className="size-3.5" /> : s.index + 1}
    </span>
  );
}

/** Schrittliste (vertikal) – Desktop-Navigation und Inhalt des Phone-Drawers. */
export function FlowStepList({ steps, current, canSelect, onSelect, className }: FlowStepperProps) {
  return (
    <ol className={cn("space-y-1", className)}>
      {steps.map((s) => {
        const isCurrent = s.id === current;
        const selectable = canSelect(s.id) && !isCurrent;
        const state = stateText(s, isCurrent);
        const content = (
          <>
            <StepMarker s={s} current={isCurrent} />
            <span className="min-w-0 flex-1">
              <span className={cn("line-clamp-2 text-sm", isCurrent ? "font-semibold text-foreground" : "text-foreground")}>
                {FLOW_STEP_LABELS[s.id]}
              </span>
              {state === "unvollständig" && <span className="block text-xs text-warning">unvollständig</span>}
            </span>
            {state && state !== "unvollständig" && <span className="sr-only">({state})</span>}
            {state === "unvollständig" && <span className="sr-only">(Schritt unvollständig)</span>}
          </>
        );
        return (
          <li key={s.id}>
            {selectable ? (
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {content}
              </button>
            ) : (
              <span
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={!isCurrent || undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5",
                  isCurrent ? "bg-primary-soft" : "opacity-70",
                )}
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Vertikaler Stepper (ab lg) als Navigation. */
export function FlowStepper(props: FlowStepperProps) {
  return (
    <nav aria-label="Schritte der Kalkulation" className={props.className}>
      <FlowStepList {...props} className={undefined} />
    </nav>
  );
}

export interface FlowStepperCompactProps extends FlowStepperProps {
  /** Titel-Element-ID für den Fokus nach Schrittwechsel. */
  titleId?: string;
}

/**
 * Kompakter Stepper (unter lg): „Schritt 3 von 6“, Schrittname (h2) und
 * Fortschrittsbalken. Antippen öffnet die Schrittliste.
 */
export function FlowStepperCompact({ steps, current, canSelect, onSelect, className, titleId }: FlowStepperCompactProps) {
  const [open, setOpen] = React.useState(false);
  const index = Math.max(0, steps.findIndex((s) => s.id === current));
  const label = FLOW_STEP_LABELS[current];

  return (
    <div className={cn("relative rounded-lg border border-border bg-card p-3 shadow-surface", className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label text-muted-foreground">
            Schritt {index + 1} von {steps.length}
          </p>
          <h2 id={titleId} data-step-title tabIndex={-1} className="truncate text-h2 text-foreground outline-none">
            {label}
          </h2>
        </div>
        <ChevronDown aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>
      <div aria-hidden="true" className="mt-3 flex gap-1">
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < index || s.id === current ? "bg-primary" : s.visited && s.completion === "incomplete" ? "bg-warning-soft" : "bg-muted",
            )}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="sr-only">
          Alle Schritte anzeigen (Schritt {index + 1} von {steps.length}: {label})
        </span>
      </button>

      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Schritte" description={`Schritt ${index + 1} von ${steps.length}`}>
        <nav aria-label="Schritte der Kalkulation">
          <FlowStepList
            steps={steps}
            current={current}
            canSelect={canSelect}
            onSelect={(s) => {
              setOpen(false);
              onSelect(s);
            }}
          />
        </nav>
      </ResponsiveSheet>
    </div>
  );
}
