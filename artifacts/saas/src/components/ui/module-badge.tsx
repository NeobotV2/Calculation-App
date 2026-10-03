import * as React from "react";
import { Snowflake, SprayCan, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Leistungsmodule. Modulfarben sind reine Identität, niemals Status. */
export type ServiceModule = "unterhalt" | "winterdienst" | "hms";

export interface ModuleMeta {
  label: string;
  short: string;
  icon: LucideIcon;
  /** Textfarbe (Icon/Label). */
  text: string;
  /** Getönte Fläche. */
  soft: string;
  /** Vollfarbe, z. B. für Anteilsbalken. */
  fill: string;
  /** CSS-Farbwert für Charts (chart-1..3). */
  chartColor: string;
}

export const MODULE_ORDER: readonly ServiceModule[] = ["unterhalt", "winterdienst", "hms"];

export const MODULE_META: Record<ServiceModule, ModuleMeta> = {
  unterhalt: {
    label: "Unterhaltsreinigung",
    short: "Reinigung",
    icon: SprayCan,
    text: "text-module-cleaning",
    soft: "bg-module-cleaning-soft",
    fill: "bg-module-cleaning",
    chartColor: "hsl(var(--chart-1))",
  },
  winterdienst: {
    label: "Winterdienst",
    short: "Winter",
    icon: Snowflake,
    text: "text-module-winter",
    soft: "bg-module-winter-soft",
    fill: "bg-module-winter",
    chartColor: "hsl(var(--chart-2))",
  },
  hms: {
    label: "Hausmeisterservice",
    short: "HMS",
    icon: Wrench,
    text: "text-module-hms",
    soft: "bg-module-hms-soft",
    fill: "bg-module-hms",
    chartColor: "hsl(var(--chart-3))",
  },
};

type ModuleSize = "sm" | "md";

const tileSize: Record<ModuleSize, string> = {
  sm: "size-6 rounded-sm [&_svg]:size-3.5",
  md: "size-8 rounded-md [&_svg]:size-4",
};

export interface ModuleIconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  module: ServiceModule;
  size?: ModuleSize;
  /** Zeigt das Label (volle Bezeichnung) neben der Kachel. */
  showLabel?: boolean;
}

/** Icon-Kachel des Moduls (`bg-module-x-soft text-module-x`). */
export function ModuleIcon({ module, size = "md", showLabel = false, className, ...props }: ModuleIconProps) {
  const meta = MODULE_META[module];
  const Icon = meta.icon;
  const tile = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        meta.soft,
        meta.text,
        tileSize[size],
        !showLabel && className,
      )}
      {...(showLabel ? { "aria-hidden": true } : { role: "img", "aria-label": meta.label, ...props })}
    >
      <Icon aria-hidden="true" strokeWidth={2} />
    </span>
  );
  if (!showLabel) return tile;
  return (
    <span className={cn("inline-flex items-center gap-2", size === "sm" ? "text-xs" : "text-sm", className)} {...props}>
      {tile}
      <span className="font-medium text-foreground">{meta.label}</span>
    </span>
  );
}

export interface ModuleBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  module: ServiceModule;
  size?: ModuleSize;
  /**
   * Text anzeigen (Standard: true). sm zeigt die Kurzform, md die volle
   * Bezeichnung. Ohne Text bleibt das Label für Screenreader erhalten.
   */
  showLabel?: boolean;
}

/** Kompaktes Modul-Etikett (Icon + Name) für Listen, Köpfe und Tabellen. */
export function ModuleBadge({ module, size = "md", showLabel = true, className, ...props }: ModuleBadgeProps) {
  const meta = MODULE_META[module];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm font-medium",
        meta.soft,
        meta.text,
        size === "sm" ? "h-5 px-1.5 text-xs [&_svg]:size-3" : "h-6 px-2 text-label [&_svg]:size-3.5",
        className,
      )}
      title={showLabel ? undefined : meta.label}
      {...props}
    >
      <Icon aria-hidden="true" strokeWidth={2} />
      {showLabel && size === "md" ? (
        <span>{meta.label}</span>
      ) : showLabel ? (
        <>
          <span aria-hidden="true">{meta.short}</span>
          <span className="sr-only">{meta.label}</span>
        </>
      ) : (
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
