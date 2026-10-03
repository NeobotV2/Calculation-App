import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-md bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground data-[state=on]:bg-primary-soft data-[state=on]:text-primary",
        outline:
          "rounded-md border border-border-strong bg-card text-foreground hover:bg-muted data-[state=on]:border-primary/40 data-[state=on]:bg-primary-soft data-[state=on]:text-primary",
        /** Chips für Turnus, Objektart, Filter, Presets, Region. */
        chip:
          "rounded-full border border-border bg-card text-foreground hover:bg-muted data-[state=on]:border-primary/40 data-[state=on]:bg-primary-soft data-[state=on]:text-primary",
      },
      size: {
        default: "h-9 min-w-9 px-2 pointer-coarse:h-11 pointer-coarse:min-w-11",
        sm: "h-8 min-w-8 px-1.5 pointer-coarse:h-10 pointer-coarse:min-w-10",
        lg: "h-10 min-w-10 px-2.5 pointer-coarse:h-12 pointer-coarse:min-w-12",
      },
    },
    compoundVariants: [
      { variant: "chip", size: "default", className: "h-8 min-w-0 px-3 pointer-coarse:h-10 pointer-coarse:min-w-0" },
      { variant: "chip", size: "sm", className: "h-7 min-w-0 px-2.5 text-xs pointer-coarse:h-10 pointer-coarse:min-w-0" },
      { variant: "chip", size: "lg", className: "h-9 min-w-0 px-4 pointer-coarse:h-11 pointer-coarse:min-w-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size }), className)}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
