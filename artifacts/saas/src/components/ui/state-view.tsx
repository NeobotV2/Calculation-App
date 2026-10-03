import * as React from "react";
import { Link } from "wouter";
import { FileQuestion, Inbox, LoaderCircle, OctagonAlert, WifiOff, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StateViewKind = "empty" | "loading" | "error" | "not-found" | "offline";

export interface StateViewAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface StateViewProps {
  kind: StateViewKind;
  title: string;
  description?: React.ReactNode;
  /** Primäre Aktion (bei „empty" immer angeben). */
  action?: StateViewAction;
  secondaryAction?: StateViewAction;
  /** Weniger Innenabstand, kleineres Icon (z. B. in Karten/Tabs). */
  compact?: boolean;
  /** Eigenes Icon statt des Standard-Icons der Art. */
  icon?: LucideIcon;
  /** Überschriften-Ebene (Standard h2; als alleiniger Seiteninhalt h1). */
  titleAs?: "h1" | "h2" | "h3";
  className?: string;
  children?: React.ReactNode;
}

const KIND_ICON: Record<StateViewKind, LucideIcon> = {
  empty: Inbox,
  loading: LoaderCircle,
  error: OctagonAlert,
  "not-found": FileQuestion,
  offline: WifiOff,
};

const KIND_TILE: Record<StateViewKind, string> = {
  empty: "bg-muted text-muted-foreground",
  loading: "bg-muted text-muted-foreground",
  error: "bg-destructive-soft text-destructive",
  "not-found": "bg-muted text-muted-foreground",
  offline: "bg-warning-soft text-warning",
};

function ActionButton({ action, variant }: { action: StateViewAction; variant: "primary" | "secondary" }) {
  const Icon = action.icon;
  const inner = (
    <>
      {Icon && <Icon aria-hidden="true" />}
      {action.label}
    </>
  );
  if (action.href && !action.disabled) {
    return (
      <Button asChild variant={variant}>
        <Link href={action.href}>{inner}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick} disabled={action.disabled}>
      {inner}
    </Button>
  );
}

/** Einheitliche Leer-, Lade-, Fehler-, Nicht-gefunden- und Offline-Zustände. */
export function StateView({
  kind,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  icon,
  titleAs: Title = "h2",
  className,
  children,
}: StateViewProps) {
  const Icon = icon ?? KIND_ICON[kind];
  const role = kind === "loading" ? "status" : kind === "error" ? "alert" : undefined;

  return (
    <div
      role={role}
      aria-live={kind === "loading" ? "polite" : undefined}
      aria-busy={kind === "loading" || undefined}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-12 md:py-16",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          compact ? "size-10 [&_svg]:size-5" : "size-12 [&_svg]:size-6",
          KIND_TILE[kind],
        )}
      >
        <Icon aria-hidden="true" strokeWidth={2} className={cn(kind === "loading" && "animate-spin")} />
      </div>
      <div className="max-w-sm space-y-1">
        <Title className={cn("text-foreground", compact ? "text-h3" : "text-h2")}>{title}</Title>
        {description != null && description !== "" && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {children}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center">
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
          {action && <ActionButton action={action} variant="primary" />}
        </div>
      )}
    </div>
  );
}
