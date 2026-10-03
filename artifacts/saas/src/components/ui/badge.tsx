import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import type { Tone } from "@/lib/status"

export type BadgeTone = Tone | "brand" | "outline"
export type BadgeSize = "sm" | "md"

const badgeVariants = cva(
  "inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border font-medium [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-transparent bg-muted text-muted-foreground",
        info: "border-info-border bg-info-soft text-info",
        success: "border-success-border bg-success-soft text-success",
        warning: "border-warning-border bg-warning-soft text-warning",
        critical: "border-destructive-border bg-destructive-soft text-destructive",
        brand: "border-primary/30 bg-primary-soft text-primary",
        outline: "border-border-strong bg-card text-foreground",
      },
      size: {
        sm: "h-5 px-1.5 text-xs [&_svg]:size-3",
        md: "h-6 px-2 text-label [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  }
)

/** Altbestand (shadcn): variant → tone. */
type LegacyBadgeVariant = "default" | "secondary" | "destructive" | "outline"
const legacyVariantTone: Record<LegacyBadgeVariant, BadgeTone> = {
  default: "brand",
  secondary: "neutral",
  destructive: "critical",
  outline: "outline",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  size?: BadgeSize
  /** @deprecated `tone` verwenden. */
  variant?: LegacyBadgeVariant
}

/**
 * Kleines, nicht-interaktives Etikett. Für Status immer `StatusBadge`
 * (Icon + Text + Farbe) verwenden.
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        badgeVariants({ tone: tone ?? (variant ? legacyVariantTone[variant] : undefined), size }),
        className
      )}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
