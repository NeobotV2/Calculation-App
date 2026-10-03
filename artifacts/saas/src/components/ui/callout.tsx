import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { TONE_ICON, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const calloutTone: Record<Tone, { box: string; icon: string }> = {
  neutral: { box: "border-border bg-surface-sunken", icon: "text-muted-foreground" },
  info: { box: "border-info-border bg-info-soft", icon: "text-info" },
  success: { box: "border-success-border bg-success-soft", icon: "text-success" },
  warning: { box: "border-warning-border bg-warning-soft", icon: "text-warning" },
  critical: { box: "border-destructive-border bg-destructive-soft", icon: "text-destructive" },
};

export interface CalloutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Aktion(en) unter dem Text, z. B. [Beheben] oder [Erneut versuchen]. */
  action?: React.ReactNode;
  /** Eigenes Icon; `false` blendet es aus. Standard: `TONE_ICON[tone]`. */
  icon?: LucideIcon | false;
  /** Live-Region: `role="alert"` bei critical, sonst `role="status"`. */
  live?: boolean;
}

/** Hinweisbox mit Statusfarbe, Icon, optionalem Titel und Aktion. */
export const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  ({ tone, title, children, action, icon, live = false, className, ...props }, ref) => {
    const Icon = icon === false ? null : (icon ?? TONE_ICON[tone]);
    const styles = calloutTone[tone];
    return (
      <div
        ref={ref}
        role={live ? (tone === "critical" ? "alert" : "status") : undefined}
        className={cn("flex gap-3 rounded-lg border p-4 text-sm text-foreground", styles.box, className)}
        {...props}
      >
        {Icon && <Icon aria-hidden="true" strokeWidth={2} className={cn("mt-0.5 size-4 shrink-0", styles.icon)} />}
        <div className="min-w-0 flex-1 space-y-1">
          {title != null && <p className="font-semibold leading-5">{title}</p>}
          {children != null && <div className="leading-5 [&_p+p]:mt-1">{children}</div>}
          {action != null && <div className="flex flex-wrap items-center gap-2 pt-2">{action}</div>}
        </div>
      </div>
    );
  },
);
Callout.displayName = "Callout";
