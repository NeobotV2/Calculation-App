import * as React from "react";
import { X } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
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
import { createBackGuard } from "@/components/ui/back-guard";
import { useMediaQuery } from "@/lib/theme";
import { MEDIA } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /**
   * `md` (Standard): ab md rechtes Sheet (`max-w-md`) – Einzel-Datensätze.
   * `lg`: ab md zentrierter Dialog (`max-w-3xl`) – ganze Modul-Editoren.
   * Unter md immer ein Bottom-Drawer.
   */
  size?: "md" | "lg";
  /** Ungespeicherte Änderungen → Schließen fragt „Änderungen verwerfen?". */
  dirty?: boolean;
  /** Fußleiste (Buttons), bleibt beim Scrollen sichtbar. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Klassen für den scrollbaren Inhaltsbereich. */
  bodyClassName?: string;
  className?: string;
  /** Fokus beim Öffnen (z. B. erstes Feld statt Schließen-Button). */
  onOpenAutoFocus?: (event: Event) => void;
}

interface ResponsiveSheetContextValue {
  /** Schließen wie X/Escape/Overlay/Wischen: fragt bei `dirty` nach. */
  requestClose: () => void;
}

const ResponsiveSheetContext = React.createContext<ResponsiveSheetContextValue | null>(null);

/** Zugriff auf das umgebende `ResponsiveSheet` (z. B. für eigene Abbrechen-Buttons). */
export function useResponsiveSheet(): ResponsiveSheetContextValue {
  const ctx = React.useContext(ResponsiveSheetContext);
  if (!ctx) throw new Error("useResponsiveSheet() ist nur innerhalb von <ResponsiveSheet> verfügbar.");
  return ctx;
}

/**
 * „Abbrechen" für die Fußleiste: schließt wie X/Escape und fragt bei `dirty`
 * nach („Änderungen verwerfen?"), statt Eingaben stillschweigend zu verwerfen.
 */
export function ResponsiveSheetCancel({
  children = "Abbrechen",
  variant = "secondary",
  ...props
}: Omit<ButtonProps, "type" | "onClick" | "asChild">) {
  const { requestClose } = useResponsiveSheet();
  return (
    <Button type="button" variant={variant} onClick={requestClose} {...props}>
      {children}
    </Button>
  );
}

/**
 * Haftendes Ergebnis am unteren Rand des Sheet-Inhalts (ab md): bündig mit der
 * Fußleiste (gleicht das Innen-Padding des Inhalts aus) und mit eigener Fläche,
 * damit kein gescrollter Inhalt darunter oder an den Ecken durchscheint.
 */
export const SHEET_STICKY_RESULT = "md:sticky md:-bottom-4 md:z-sticky md:-mx-6 md:bg-card md:px-6 md:pb-4 md:pt-2";

/**
 * Nebenaktionen der Fußleiste (z. B. „Abbrechen“ und „Speichern & nächste …“):
 * auf dem Phone nebeneinander, damit die Fußleiste flach bleibt und das
 * Formular sichtbar; ab sm reihen sie sich wie gewohnt ein.
 */
export function ResponsiveSheetFooterRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 *:min-w-0 *:flex-1 sm:contents">{children}</div>;
}

/**
 * Browser-/Android-Zurück bei ungespeicherten Änderungen: erst nachfragen
 * („Änderungen verwerfen?“), statt Seite und Eingaben zu verlassen (§ Sheets).
 */
function useBackRequestsClose(active: boolean, requestClose: () => void) {
  const requestRef = React.useRef(requestClose);
  requestRef.current = requestClose;
  // Nach einem „Zurück“ neu scharf schalten (z. B. nach „Weiter bearbeiten“).
  const [round, setRound] = React.useState(0);
  React.useEffect(() => {
    if (!active || typeof window === "undefined" || !window.history) return undefined;
    const guard = createBackGuard(window, () => {
      requestRef.current();
      setRound((r) => r + 1);
    });
    guard.arm();
    return () => guard.disarm();
  }, [active, round]);
}

/**
 * Ein Editor-Overlay für alle Breiten: Drawer (Phone), Sheet (md) oder Dialog (lg).
 * Schließen per Escape, Overlay-Klick, Wischen, „Schließen", Browser-/Android-
 * Zurück oder `ResponsiveSheetCancel` fragt bei `dirty` nach („Weiter
 * bearbeiten" / „Verwerfen").
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  dirty = false,
  footer,
  children,
  bodyClassName,
  className,
  onOpenAutoFocus,
}: ResponsiveSheetProps) {
  const isMdUp = useMediaQuery(MEDIA.md, true);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  const requestClose = React.useCallback(() => {
    if (dirty) setConfirmOpen(true);
    else onOpenChange(false);
  }, [dirty, onOpenChange]);

  useBackRequestsClose(open && dirty, requestClose);

  const contextValue = React.useMemo<ResponsiveSheetContextValue>(() => ({ requestClose }), [requestClose]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) onOpenChange(true);
      else requestClose();
    },
    [onOpenChange, requestClose],
  );

  const header = (TitleComp: React.ElementType, DescComp: React.ElementType) => (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3 md:px-6 md:py-4">
      <div className="min-w-0 flex-1 space-y-1">
        <TitleComp className="text-h2 text-foreground">{title}</TitleComp>
        {description != null && <DescComp className="text-sm text-muted-foreground">{description}</DescComp>}
      </div>
      <IconButton label="Schließen" icon={X} onClick={requestClose} tooltip={false} className="-mr-2 shrink-0" />
    </div>
  );

  const body = (
    <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6", bodyClassName)}>
      {children}
    </div>
  );

  const footerNode =
    footer != null ? (
      <div className="flex flex-col-reverse gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end md:px-6">
        {footer}
      </div>
    ) : null;

  const descriptionProps = description == null ? { "aria-describedby": undefined } : {};

  let overlay: React.ReactNode;
  if (!isMdUp) {
    overlay = (
      <Drawer open={open} onOpenChange={handleOpenChange} dismissible={!dirty}>
        <DrawerContent className={cn("flex flex-col", className)} onOpenAutoFocus={onOpenAutoFocus} {...descriptionProps}>
          {header(DrawerTitle, DrawerDescription)}
          {body}
          {footerNode}
        </DrawerContent>
      </Drawer>
    );
  } else if (size === "lg") {
    overlay = (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          hideClose
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn("flex max-h-[90dvh] max-w-3xl flex-col gap-0 overflow-hidden p-0", className)}
          {...descriptionProps}
        >
          {header(DialogTitle, DialogDescription)}
          {body}
          {footerNode}
        </DialogContent>
      </Dialog>
    );
  } else {
    overlay = (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          hideClose
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn("gap-0 p-0 pt-safe sm:max-w-md", className)}
          {...descriptionProps}
        >
          {header(SheetTitle, SheetDescription)}
          {body}
          <div className="pb-safe">{footerNode}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <ResponsiveSheetContext.Provider value={contextValue}>{overlay}</ResponsiveSheetContext.Provider>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>Ihre ungespeicherten Eingaben gehen verloren.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              Verwerfen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
