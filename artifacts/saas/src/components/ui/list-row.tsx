import * as React from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onClick"> {
  /** Links: Icon, ModuleIcon, Avatar … */
  leading?: React.ReactNode;
  title: React.ReactNode;
  /** Zweite Zeile (gedämpft), z. B. Kunde · Fläche. */
  meta?: React.ReactNode;
  /** Rechts: Betrag, Badge, IconButton/DropdownMenu (bleibt eigenständig klickbar). */
  trailing?: React.ReactNode;
  /** Ganze Zeile als Link (wouter-Route oder externe URL/mailto/tel). */
  href?: string;
  /** Ganze Zeile als Button (wenn kein `href`). */
  onClick?: () => void;
  /** Pfeil rechts; Standard: an, sobald `href` oder `onClick` gesetzt ist. */
  chevron?: boolean;
  /** Hervorhebung (z. B. aktive Auswahl). */
  selected?: boolean;
  disabled?: boolean;
  as?: "div" | "li";
  /** Am Zeilen-Button bzw. -Link (nicht am Container), z. B. wenn `onClick` Details aufklappt. */
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}

const EXTERNAL = /^(https?:|mailto:|tel:)/i;

/**
 * Listenzeile (min. 56 px). Mit `href`/`onClick` ist die ganze Zeile per
 * Overlay klickbar; Elemente in `trailing` liegen darüber und bleiben bedienbar.
 * Titel und Text-Meta umbrechen auf bis zu drei Zeilen (nie auf wenige Zeichen gekürzt).
 */
export function ListRow({
  leading,
  title,
  meta,
  trailing,
  href,
  onClick,
  chevron,
  selected = false,
  disabled = false,
  as = "div",
  className,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
  ...props
}: ListRowProps) {
  const interactive = !disabled && (!!href || !!onClick);
  const showChevron = chevron ?? interactive;

  const overlayAria = { "aria-expanded": ariaExpanded, "aria-controls": ariaControls };
  const overlayClass =
    "text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring";

  // Bis zu drei Zeilen statt „Objektbege…“: Katalogleistungen teilen oft denselben Anfang.
  const titleClass = "line-clamp-3 break-words";
  let titleNode: React.ReactNode = <span className={titleClass}>{title}</span>;
  if (interactive && href) {
    titleNode = EXTERNAL.test(href) ? (
      <a
        href={href}
        className={overlayClass}
        {...overlayAria}
        {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <span className={titleClass}>{title}</span>
      </a>
    ) : (
      <Link href={href} className={overlayClass} {...overlayAria}>
        <span className={titleClass}>{title}</span>
      </Link>
    );
  } else if (interactive && onClick) {
    titleNode = (
      <button type="button" onClick={onClick} className={cn(overlayClass, "w-full")} {...overlayAria}>
        <span className={titleClass}>{title}</span>
      </button>
    );
  }

  return React.createElement(
    as,
    {
      className: cn(
        "relative flex min-h-14 items-center gap-3 px-4 py-3",
        interactive && "transition-colors hover:bg-muted/50",
        selected && "bg-primary-soft",
        disabled && "opacity-50",
        className,
      ),
      "aria-disabled": disabled || undefined,
      ...props,
    },
    leading != null && <div className="flex shrink-0 items-center">{leading}</div>,
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-foreground">{titleNode}</div>
      {meta != null && (
        <div
          className={cn(
            "mt-0.5 min-w-0 break-words text-xs text-muted-foreground",
            // Text: höchstens drei Zeilen; eigene Struktur (Badges, Icons) gestaltet der Aufrufer.
            (typeof meta === "string" || typeof meta === "number") && "line-clamp-3",
          )}
        >
          {meta}
        </div>
      )}
    </div>,
    trailing != null && <div className="relative z-10 flex shrink-0 items-center gap-2">{trailing}</div>,
    showChevron && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />,
  );
}
