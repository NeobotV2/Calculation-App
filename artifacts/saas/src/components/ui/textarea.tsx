import * as React from "react"

import { cn } from "@/lib/utils"
import { inputBaseClassName } from "@/components/ui/input"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn("flex min-h-20 py-2 read-only:bg-surface-sunken", inputBaseClassName, className)}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
