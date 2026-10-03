import * as React from "react";
import { X } from "lucide-react";
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

/**
 * Ein Editor-Overlay für alle Breiten: Drawer (Phone), Sheet (md) oder Dialog (lg).
 * Schließen per Escape, Overlay-Klick, Wischen oder „Schließen" fragt bei
 * `dirty` nach („Weiter bearbeiten" / „Verwerfen").
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
      <div className="flex flex-col-reverse gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:justify-end md:px-6">
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
      {overlay}
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
