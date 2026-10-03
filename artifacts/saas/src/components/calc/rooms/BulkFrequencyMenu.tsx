import { CalendarSync, Check, ChevronDown } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FREQUENCY_OPTIONS } from "@/data/frequencies";
import type { FrequencyKey } from "@/store/use-store";

export interface BulkFrequencyMenuProps {
  /** Wird mit dem gewählten Turnus aufgerufen (Bestätigung/Preis-Delta macht der Aufrufer). */
  onSelect: (frequency: FrequencyKey) => void;
  /** Gemeinsamer Turnus aller Räume (Häkchen) oder null bei gemischten Turnussen. */
  current?: FrequencyKey | null;
  /** Anzahl der Räume (für den Hinweis im Menü). */
  roomCount?: number;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

/** „Turnus für alle“ – setzt den Turnus aller Räume auf einen der 9 Werte. */
export function BulkFrequencyMenu({
  onSelect,
  current = null,
  roomCount,
  disabled = false,
  variant = "ghost",
  size = "md",
  className,
}: BulkFrequencyMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button type="button" variant={variant} size={size} className={className} disabled={disabled}>
          <CalendarSync aria-hidden="true" />
          Turnus für alle
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        <DropdownMenuLabel>
          {roomCount !== undefined ? `Turnus für alle ${roomCount} Räume` : "Turnus für alle Räume"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FREQUENCY_OPTIONS.map((o) => {
          const active = current === o.key;
          return (
            <DropdownMenuItem key={o.key} onSelect={() => onSelect(o.key)} className="justify-between gap-4">
              <span>{o.label}</span>
              {active ? (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <Check aria-hidden="true" className="size-4" />
                  <span className="sr-only">(aktuell)</span>
                </span>
              ) : (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {o.visitsPerMonth.toLocaleString("de-DE", { maximumFractionDigits: 2 })}×/Mo
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
