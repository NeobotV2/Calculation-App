import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  /**
   * `default`: Abschnittstitel (`text-h2`).
   * `eyebrow`: kleine Großbuchstaben-Überschrift (`text-overline uppercase`).
   */
  variant?: "default" | "eyebrow";
  /** Überschriften-Ebene (Standard h2). */
  as?: "h2" | "h3";
  id?: string;
}

/** Abschnittsüberschrift mit optionaler Aktion rechts. */
export function SectionHeading({ children, action, className, variant = "default", as: Tag = "h2", id }: SectionHeadingProps) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <Tag
        id={id}
        className={
          variant === "eyebrow"
            ? "text-overline uppercase text-muted-foreground"
            : "text-h2 text-foreground"
        }
      >
        {children}
      </Tag>
      {action}
    </div>
  );
}
