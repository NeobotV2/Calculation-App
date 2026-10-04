import { Toaster as Sonner } from "sonner";
import { useMediaQuery, useResolvedTheme } from "@/lib/theme";
import { MEDIA, Z_INDEX } from "@/lib/tokens";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Abstand oben: unter der Statusleiste (Notch). */
const TOP_OFFSET = "calc(var(--safe-top) + 0.75rem)";
/** Abstand unten auf Phones: über der BottomNav. */
const BOTTOM_OFFSET_MOBILE = "calc(var(--nav-h) + var(--safe-bottom) + 0.75rem)";

/** Abstand unten ab md: über einer fixierten Aktionsleiste (`--sticky-bar-h`, StickyActionBar). */
const BOTTOM_OFFSET_DESKTOP = "calc(var(--sticky-bar-h, 0px) + 1.5rem)";

/**
 * Toasts folgen dem App-Theme (nicht dem OS). Position: unter `md` oben mittig,
 * ab `md` unten rechts — oberhalb einer StickyActionBar, damit „Weiter“ &
 * Co. klickbar bleiben. Ein explizit übergebenes `position` hat Vorrang.
 */
const Toaster = ({ position, style, ...props }: ToasterProps) => {
  const theme = useResolvedTheme();
  const isMdUp = useMediaQuery(MEDIA.md, true);
  const resolvedPosition = position ?? (isMdUp ? "bottom-right" : "top-center");
  const offset = isMdUp
    ? { top: "1.5rem", bottom: BOTTOM_OFFSET_DESKTOP, left: "1.5rem", right: "1.5rem" }
    : { top: TOP_OFFSET, bottom: BOTTOM_OFFSET_MOBILE, left: "1rem", right: "1rem" };

  return (
    <Sonner
      theme={theme}
      position={resolvedPosition}
      offset={offset}
      mobileOffset={{ top: TOP_OFFSET, bottom: BOTTOM_OFFSET_MOBILE, left: "1rem", right: "1rem" }}
      containerAriaLabel="Benachrichtigungen"
      className="toaster group z-toast"
      style={{ zIndex: Z_INDEX.toast, ...style }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-lg group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:shadow-overlay",
          title: "group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:bg-card group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
