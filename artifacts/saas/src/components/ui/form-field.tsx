import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  /** Stable id; wired to the label (htmlFor) and injected into the control. */
  id: string;
  label: string;
  /** Validation message; when set the control is marked aria-invalid and described by it. */
  error?: string | null;
  /** Optional helper text below the control. */
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  /** A single form control (Input, select, textarea, …). */
  children: ReactElement;
}

/**
 * Barrierefreies Formularfeld: verbindet Label, Hilfetext und Fehlermeldung
 * korrekt mit dem Eingabefeld (htmlFor/id, aria-invalid, aria-describedby).
 * Ersetzt das überall manuell zusammengebaute Label+Input-Markup und behebt
 * die fehlende Label-Zuordnung in den Formularen.
 */
export function FormField({ id, label, error, hint, required, className, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
