import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  /** Stable id; wired to the label (htmlFor) and injected into the control. */
  id: string;
  label: ReactNode;
  /** Validation message; when set the control is marked aria-invalid and described by it. */
  error?: string | null;
  /** Optional helper text below the control. */
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  /** `stacked` (Standard): Label über dem Feld. `inline`: ab md Label links, Feld rechts. */
  layout?: "stacked" | "inline";
  /** Element rechts neben dem Label, z. B. ein `InfoHint` oder Tag „Richtwert". */
  labelAddon?: ReactNode;
  /** A single form control (Input, select, textarea, …). */
  children: ReactElement;
}

/**
 * Barrierefreies Formularfeld: verbindet Label, Hilfetext und Fehlermeldung
 * korrekt mit dem Eingabefeld (htmlFor/id, aria-invalid, aria-describedby).
 * Pflichtfelder zeigen „*" (sichtbar) und „(Pflichtfeld)" für Screenreader.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  layout = "stacked",
  labelAddon,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const childProps = isValidElement(children) ? (children.props as Record<string, unknown>) : {};
  const ownDescribedBy = typeof childProps["aria-describedby"] === "string" ? (childProps["aria-describedby"] as string) : undefined;
  const describedBy = [ownDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : childProps["aria-invalid"],
        "aria-describedby": describedBy,
        "aria-required": required || childProps["aria-required"] || undefined,
      })
    : children;

  const inline = layout === "inline";

  return (
    <div
      className={cn(
        inline
          ? "space-y-1.5 md:grid md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-start md:gap-x-4 md:space-y-0"
          : "space-y-1.5",
        className,
      )}
    >
      <div className={cn("flex items-center gap-1", inline && "md:min-h-10")}>
        <label htmlFor={id} className="text-label text-muted-foreground">
          {label}
          {required && (
            <>
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (Pflichtfeld)</span>
            </>
          )}
        </label>
        {labelAddon}
      </div>
      <div className={cn(inline && "space-y-1.5")}>
        {control}
        {hint && !error && (
          <p id={hintId} className={cn("text-xs text-muted-foreground", !inline && "mt-1.5")}>
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className={cn("flex items-start gap-1.5 text-xs font-medium text-destructive", !inline && "mt-1.5")}>
            <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
