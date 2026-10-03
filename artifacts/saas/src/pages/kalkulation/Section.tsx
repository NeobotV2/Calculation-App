import { useId, type ElementType, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { InfoPopover } from "./InfoPopover";

/**
 * Eingabekarte des Verrechnungssatz-Rechners: Kopf als Aufklapp-Schalter
 * (h2 › button, aria-expanded), rechts Kurzwert und Erläuterung.
 */
export function Section({
  title,
  icon: Icon,
  open,
  onToggle,
  badge,
  tooltip,
  children,
}: {
  title: string;
  icon: ElementType;
  open: boolean;
  onToggle: () => void;
  /** Kurzwert im Kopf, z. B. `<Money … />` oder „Aus". */
  badge?: ReactNode;
  tooltip?: string;
  children: ReactNode;
}) {
  const contentId = useId();
  return (
    <Card padding="none" as="section">
      <div className="flex items-center gap-2 px-4 py-3 md:px-5">
        <h2 className="min-w-0 flex-1 text-h3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={contentId}
            className="flex min-h-11 w-full items-center gap-3 rounded-md text-left text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Icon className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 truncate">{title}</span>
            {badge != null && (
              <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">{badge}</span>
            )}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </button>
        </h2>
        {tooltip && <InfoPopover text={tooltip} label={`Erläuterung: ${title}`} />}
      </div>
      <div id={contentId} hidden={!open} className="space-y-4 border-t border-border px-4 py-4 md:px-5">
        {open && children}
      </div>
    </Card>
  );
}

/** Ergebniszeile innerhalb einer Eingabekarte (Label links, Wert rechts). */
export function CalcResultRow({
  label,
  children,
  emphasis = false,
}: {
  label: ReactNode;
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-sm">
      <span className="text-foreground">{label}</span>
      <span className={cn("tabular-nums", emphasis ? "font-semibold text-primary" : "font-medium text-foreground")}>
        {children}
      </span>
    </div>
  );
}
