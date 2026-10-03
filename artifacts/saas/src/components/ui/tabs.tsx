import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { TriangleAlert, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type TabsVariant = "underline" | "segmented"

const TabsVariantContext = React.createContext<TabsVariant>("underline")

const Tabs = TabsPrimitive.Root

const listClass: Record<TabsVariant, string> = {
  // Überlauf: Touch wischt (ohne Leiste, §8.5); feine Zeiger sehen eine schmale Scrollleiste.
  underline:
    "scrollbar-thin pointer-coarse:no-scrollbar flex w-full items-stretch gap-1 overflow-x-auto border-b border-border",
  segmented:
    "inline-flex h-9 items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground pointer-coarse:h-12",
}

const triggerClass: Record<TabsVariant, string> = {
  underline:
    "relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground pointer-coarse:h-11",
  segmented:
    "inline-flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-surface pointer-coarse:h-10",
}

interface ScrollEdges {
  start: boolean
  end: boolean
}

/**
 * Überlauf einer horizontal scrollenden Tab-Leiste: ob links/rechts weitere
 * Tabs verborgen sind (für die Ausblend-Verläufe). Hält außerdem den aktiven
 * Tab sichtbar (nur horizontales Scrollen der Leiste, nie der Seite).
 */
function useScrollEdges(el: HTMLElement | null): ScrollEdges {
  const [edges, setEdges] = React.useState<ScrollEdges>({ start: false, end: false })

  React.useEffect(() => {
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      const start = el.scrollLeft > 1
      const end = max - el.scrollLeft > 1
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    const revealActive = () => {
      const active = el.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
      if (!active || el.scrollWidth <= el.clientWidth) return
      const left = active.offsetLeft - el.offsetLeft
      const right = left + active.offsetWidth
      if (left < el.scrollLeft) el.scrollLeft = Math.max(0, left - 24)
      else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth + 24
    }

    revealActive()
    update()
    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null
    resize?.observe(el)
    const mutation =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            revealActive()
            update()
          })
        : null
    mutation?.observe(el, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-state"] })
    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      resize?.disconnect()
      mutation?.disconnect()
    }
  }, [el])

  return edges
}

const fadeClass =
  "pointer-events-none absolute top-0 bottom-px w-8 from-background to-transparent transition-opacity duration-150 motion-reduce:transition-none"

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    /** `underline` (Standard, z. B. Modul-Tabs) oder `segmented` (Monat/Jahr, Aktiv/Archiviert). */
    variant?: TabsVariant
  }
>(({ className, variant = "underline", ...props }, ref) => {
  const [listEl, setListEl] = React.useState<HTMLDivElement | null>(null)
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      setListEl(node)
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  const edges = useScrollEdges(variant === "underline" ? listEl : null)

  if (variant !== "underline") {
    return (
      <TabsVariantContext.Provider value={variant}>
        <TabsPrimitive.List ref={ref} className={cn(listClass[variant], className)} {...props} />
      </TabsVariantContext.Provider>
    )
  }

  // Underline: Rahmen trägt die Layout-Klassen; Verläufe zeigen verborgene Tabs an.
  return (
    <TabsVariantContext.Provider value={variant}>
      <div className={cn("relative min-w-0", className)}>
        <TabsPrimitive.List ref={setRefs} className={listClass.underline} {...props} />
        <span
          aria-hidden="true"
          data-tabs-fade="start"
          className={cn(fadeClass, "left-0 bg-linear-to-r", edges.start ? "opacity-100" : "opacity-0")}
        />
        <span
          aria-hidden="true"
          data-tabs-fade="end"
          className={cn(fadeClass, "right-0 bg-linear-to-l", edges.end ? "opacity-100" : "opacity-0")}
        />
      </div>
    </TabsVariantContext.Provider>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Icon vor dem Label. */
  icon?: LucideIcon
  /** Zähler-Badge nach dem Label (z. B. Anzahl Räume). */
  count?: number
  /**
   * Warn-Icon nach dem Label; `true` oder ein Text für Screenreader
   * (Standard: „Hinweise vorhanden").
   */
  warning?: boolean | string
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, icon: Icon, count, warning, children, ...props }, ref) => {
  const variant = React.useContext(TabsVariantContext)
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(triggerClass[variant], className)}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
      {children}
      {count !== undefined && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
      {warning && (
        <>
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
          <span className="sr-only">{typeof warning === "string" ? warning : "Hinweise vorhanden"}</span>
        </>
      )}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
