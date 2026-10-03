import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * Hierarchie: ein `primary` je Bereich (Seitenkopf, Sticky-Bar, Dialog-Footer),
 * `secondary` für Alternativen, `ghost` in Toolbars, `destructive` nur in
 * Bestätigungsdialogen, `destructive-ghost` in Menüs.
 * Aliasse für Altbestand: default → primary, outline/glass → secondary,
 * size default → md.
 */
const PRIMARY = "bg-primary text-primary-foreground shadow-surface hover:bg-primary/90"
const SECONDARY = "border border-border-strong bg-card text-foreground shadow-surface hover:bg-muted"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: PRIMARY,
        secondary: SECONDARY,
        tonal: "bg-primary-soft text-primary hover:bg-primary/15",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground shadow-surface hover:bg-destructive/90",
        "destructive-ghost": "text-destructive hover:bg-destructive-soft",
        link: "text-primary underline-offset-4 hover:underline",
        // Aliasse (Altbestand)
        default: PRIMARY,
        outline: SECONDARY,
        glass: SECONDARY,
      },
      size: {
        sm: "h-8 px-3 pointer-coarse:h-10",
        md: "h-10 px-4 pointer-coarse:h-11",
        lg: "h-11 px-5 text-base pointer-coarse:h-12",
        "icon-sm": "size-8 pointer-coarse:size-10",
        icon: "size-10 pointer-coarse:size-11",
        // Alias (Altbestand)
        default: "h-10 px-4 pointer-coarse:h-11",
      },
    },
    compoundVariants: [
      { variant: "link", className: "h-auto px-0 pointer-coarse:h-auto pointer-coarse:min-h-10" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>
export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>
export type ButtonSize = NonNullable<ButtonVariantProps["size"]>

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean
  /** Zeigt einen Spinner, setzt `aria-busy` und deaktiviert den Button. */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className)
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={classes}
          aria-busy={loading || undefined}
          aria-disabled={disabled || loading || undefined}
          {...props}
        >
          {children}
        </Slot>
      )
    }
    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
