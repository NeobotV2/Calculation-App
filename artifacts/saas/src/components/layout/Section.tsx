import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Aktion rechts neben dem Titel (z. B. Link „Alle anzeigen" oder Button). */
  action?: React.ReactNode;
  /** Anker-id der Section; der Titel bekommt `${id}-title`. */
  id?: string;
}

/** Seitenabschnitt mit h2 (`text-h2`), optionaler Beschreibung und Aktion. */
export function Section({ title, description, action, id, className, children, ...props }: SectionProps) {
  const autoId = React.useId();
  const headingId = id ? `${id}-title` : `${autoId}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("space-y-4", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id={headingId} className="text-h2 text-foreground">
            {title}
          </h2>
          {description != null && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}
