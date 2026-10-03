import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Bestätigen als destruktiver (roter) Button, z. B. „Löschen". */
  destructive?: boolean;
  /** Beschriftung von „Abbrechen". */
  cancelLabel?: string;
  /**
   * Optionale dritte Wahl zwischen Abbrechen und Bestätigen
   * (z. B. „Entwurf behalten"). Schließt den Dialog danach.
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Bestätigungsdialog (AlertDialog: Fokusfalle, Escape, zugängliche Rollen).
 * API unverändert; `onConfirm` und danach `onClose` werden aufgerufen.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Bestätigen",
  destructive = false,
  cancelLabel = "Abbrechen",
  secondaryLabel,
  onSecondary,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          {secondaryLabel && onSecondary && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onSecondary();
                onClose();
              }}
            >
              {secondaryLabel}
            </Button>
          )}
          {/* Radix schließt danach selbst → onOpenChange(false) → onClose() */}
          <AlertDialogAction
            variant={destructive ? "destructive" : "primary"}
            onClick={() => onConfirm()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
