import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Konsistente Abschnittsüberschrift (Label-Stil, Großbuchstaben).
 * Ersetzt das wiederholte
 * `text-[13px] font-semibold uppercase tracking-widest text-muted-foreground`-Markup.
 */
export function SectionHeading({ children, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}
