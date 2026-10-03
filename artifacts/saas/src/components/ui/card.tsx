import * as React from "react"

import { cn } from "@/lib/utils"

export type CardTone = "default" | "brand" | "sunken" | "info" | "success" | "warning" | "critical"
export type CardPadding = "none" | "sm" | "md" | "lg"

const toneClass: Record<CardTone, string> = {
  default: "border-border bg-card text-card-foreground shadow-surface",
  brand: "border-primary/50 bg-card text-card-foreground shadow-surface ring-1 ring-primary/20",
  sunken: "border-border bg-surface-sunken text-foreground",
  info: "border-info-border bg-info-soft text-foreground",
  success: "border-success-border bg-success-soft text-foreground",
  warning: "border-warning-border bg-warning-soft text-foreground",
  critical: "border-destructive-border bg-destructive-soft text-foreground",
}

const paddingClass: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
}

const CardContext = React.createContext<{ padding: CardPadding }>({ padding: "md" })

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  tone?: CardTone
  /** Innenabstand; bei `none` bekommen Header/Footer eigenen Abstand + Trennlinie. */
  padding?: CardPadding
  /** Hover-/Fokus-Rahmen für klickbare Karten (Link/Button im Inneren). */
  interactive?: boolean
  as?: "div" | "section" | "article" | "li"
}

const Card = React.forwardRef<HTMLElement, CardProps>(
  ({ className, tone = "default", padding = "md", interactive = false, as = "div", children, ...props }, ref) => {
    const ctx = React.useMemo(() => ({ padding }), [padding])
    return (
      <CardContext.Provider value={ctx}>
        {React.createElement(
          as,
          {
            ref,
            className: cn(
              "rounded-lg border",
              toneClass[tone],
              paddingClass[padding],
              padding === "none" && "overflow-hidden",
              interactive &&
                "relative cursor-pointer transition-colors hover:border-border-strong hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              className
            ),
            ...props,
          },
          children
        )}
      </CardContext.Provider>
    )
  }
)
Card.displayName = "Card"

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Aktion rechts (z. B. Button, IconButton, Badge). */
  action?: React.ReactNode
  /** Überschriften-Ebene für `title` (Standard h3). */
  titleAs?: "h2" | "h3" | "h4"
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, titleAs, children, ...props }, ref) => {
    const { padding } = React.useContext(CardContext)
    const hasSlots = title != null || description != null || action != null
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-1",
          padding === "none" ? "border-b border-border px-4 py-3" : "mb-4",
          className
        )}
        {...props}
      >
        {hasSlots && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {title != null && <CardTitle as={titleAs}>{title}</CardTitle>}
              {description != null && <CardDescription>{description}</CardDescription>}
            </div>
            {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
          </div>
        )}
        {children}
      </div>
    )
  }
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" | "h4" }
>(({ className, as: Tag = "h3", ...props }, ref) => (
  <Tag
    ref={ref}
    className={cn("text-h3 text-foreground", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { padding } = React.useContext(CardContext)
  return <div ref={ref} className={cn(padding === "none" && "p-4", className)} {...props} />
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { padding } = React.useContext(CardContext)
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border",
        padding === "none" ? "px-4 py-3" : "mt-4 pt-4",
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
