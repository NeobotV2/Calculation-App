import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Einheitlicher Seitenkopf (h1 + optionaler Untertitel + Aktionen).
 * Ersetzt das mehrfach kopierte `safe-header`-Markup auf den Seiten und
 * sorgt für konsistente Typografie und Abstände.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("safe-header px-6 pt-14 md:pt-8 pb-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle != null && subtitle !== "" && (
            <p className="text-muted-foreground text-base mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
