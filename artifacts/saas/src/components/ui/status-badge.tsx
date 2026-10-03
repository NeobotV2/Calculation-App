import * as React from "react";
import { Badge, type BadgeSize } from "@/components/ui/badge";
import { TONE_ICON, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  tone: Tone;
  label: string;
  size?: BadgeSize;
  /** Status-Icon aus `TONE_ICON` (Standard: an). */
  icon?: boolean;
}

/** Status als Icon + Text + Farbe (nie Farbe allein). */
export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ tone, label, size = "md", icon = true, className, ...props }, ref) => {
    const Icon = TONE_ICON[tone];
    return (
      <Badge ref={ref} tone={tone} size={size} className={cn(className)} {...props}>
        {icon && <Icon aria-hidden="true" strokeWidth={2} />}
        <span className="truncate">{label}</span>
      </Badge>
    );
  },
);
StatusBadge.displayName = "StatusBadge";
