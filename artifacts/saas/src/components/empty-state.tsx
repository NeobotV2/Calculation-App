import { type LucideIcon } from "lucide-react";
import { StateView } from "@/components/ui/state-view";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Kompakte Darstellung (z. B. in Karten). */
  compact?: boolean;
}

/** Kompatibilitäts-Wrapper um `StateView kind="empty"`. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact,
}: EmptyStateProps) {
  return (
    <StateView
      kind="empty"
      icon={icon}
      title={title}
      description={description}
      compact={compact}
      action={actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined}
      secondaryAction={
        secondaryActionLabel && onSecondaryAction ? { label: secondaryActionLabel, onClick: onSecondaryAction } : undefined
      }
    />
  );
}
