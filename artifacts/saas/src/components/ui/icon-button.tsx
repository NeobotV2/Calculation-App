import * as React from "react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface IconButtonProps
  extends Omit<ButtonProps, "children" | "variant" | "size" | "asChild" | "aria-label"> {
  /** Pflicht: wird zu `aria-label` (und Tooltip-Text). */
  label: string;
  icon: LucideIcon;
  variant?: "ghost" | "secondary" | "tonal" | "destructive-ghost";
  size?: "sm" | "md";
  /** Tooltip nur bei feinem Zeiger (Maus/Trackpad). Standard: true. */
  tooltip?: boolean;
  /** Rendert einen Link (wouter) statt eines Buttons, z. B. für „Zurück". */
  href?: string;
}

/**
 * Icon-only Button mit verpflichtendem, zugänglichem Namen.
 * Größen: sm 32 px (grober Zeiger 40 px), md 40 px (grober Zeiger 44 px).
 * Funktioniert als `asChild`-Kind von DropdownMenuTrigger/PopoverTrigger.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      icon: Icon,
      variant = "ghost",
      size = "md",
      tooltip = true,
      href,
      className,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const buttonSize = size === "sm" ? "icon-sm" : "icon";
    const content = <Icon aria-hidden="true" strokeWidth={2} />;

    // `aria-describedby` wird bewusst explizit gesetzt: so überschreibt es die
    // Tooltip-Beschreibung von Radix, die den Namen nur doppelt vorlesen würde.
    const button = href ? (
      <Button
        asChild
        ref={ref}
        variant={variant}
        size={buttonSize}
        className={className}
        aria-label={label}
        aria-describedby={ariaDescribedBy}
        {...props}
      >
        <Link href={href}>{content}</Link>
      </Button>
    ) : (
      <Button
        ref={ref}
        type="button"
        variant={variant}
        size={buttonSize}
        className={className}
        aria-label={label}
        aria-describedby={ariaDescribedBy}
        {...props}
      >
        {content}
      </Button>
    );

    if (!tooltip) return button;

    return (
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent className="pointer-coarse:hidden">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);
IconButton.displayName = "IconButton";
