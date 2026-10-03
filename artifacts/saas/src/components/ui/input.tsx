import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Gemeinsame Basis für Input, Textarea, Select-Trigger und native <select>.
 * `text-base` auf Phones verhindert den iOS-Zoom beim Fokussieren.
 */
export const inputBaseClassName =
  "w-full min-w-0 rounded-md border border-input bg-card px-3 text-base text-foreground shadow-surface transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground md:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"

export const inputVariants = cva(
  cn(
    "flex read-only:bg-surface-sunken",
    inputBaseClassName,
    "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
  ),
  {
    variants: {
      inputSize: {
        sm: "h-8 pointer-coarse:h-10",
        md: "h-10 pointer-coarse:h-11",
        lg: "h-12",
      },
      align: {
        start: "text-left",
        end: "text-right tabular-nums",
      },
    },
    defaultVariants: {
      inputSize: "md",
      align: "start",
    },
  }
)

export type InputSize = "sm" | "md" | "lg"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Höhe (nicht `size`, das ist das native Attribut). */
  inputSize?: InputSize
  align?: "start" | "end"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, align, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ inputSize, align }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
