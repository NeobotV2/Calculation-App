import * as React from "react";
import { ChevronDown } from "lucide-react";
import { NativeSelect } from "@/components/ui/select";
import type { InputSize } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FREQUENCY_OPTIONS, getFrequencyOption } from "@/data/frequencies";
import { cn } from "@/lib/utils";
import type { FrequencyKey } from "@/store/use-store";

function isFrequencyKey(value: string): value is FrequencyKey {
  return FREQUENCY_OPTIONS.some((o) => o.key === value);
}

export interface FrequencySelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "defaultValue"> {
  value: FrequencyKey;
  onValueChange: (frequency: FrequencyKey) => void;
  /** `long` (Standard): „5x wöchentlich“; `short`: „5x/Wo“ (Tabellen). */
  labels?: "long" | "short";
  inputSize?: InputSize;
  wrapperClassName?: string;
}

/**
 * Turnus-Auswahl (natives `<select>`, alle 9 Turnusse aus `data/frequencies`).
 * Für Formulare und Tabellenzellen; Beschriftung über `id`+Label oder `aria-label`.
 */
export const FrequencySelect = React.forwardRef<HTMLSelectElement, FrequencySelectProps>(
  ({ value, onValueChange, labels = "long", inputSize = "md", wrapperClassName, className, ...props }, ref) => (
    <NativeSelect
      ref={ref}
      value={value}
      inputSize={inputSize}
      wrapperClassName={wrapperClassName}
      className={className}
      onChange={(e) => {
        const next = e.target.value;
        if (isFrequencyKey(next) && next !== value) onValueChange(next);
      }}
      {...props}
    >
      {FREQUENCY_OPTIONS.map((o) => (
        <option key={o.key} value={o.key}>
          {labels === "short" ? o.short : o.label}
        </option>
      ))}
    </NativeSelect>
  ),
);
FrequencySelect.displayName = "FrequencySelect";

export interface FrequencyChipProps {
  value: FrequencyKey;
  onValueChange: (frequency: FrequencyKey) => void;
  /** Zusatz für den zugänglichen Namen, z. B. der Raumname. */
  context?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Kompakter Turnus-Chip (Phone-Karten): zeigt die Kurzform („5x/Wo“) und
 * öffnet eine Schnellauswahl mit allen 9 Turnussen.
 */
export function FrequencyChip({ value, onValueChange, context, disabled = false, className }: FrequencyChipProps) {
  const option = getFrequencyOption(value);
  const short = option?.short ?? value;
  const long = option?.label ?? value;
  const label = `Turnus${context ? ` für ${context}` : ""}: ${long} – ändern`;

  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex h-7 items-center rounded-full border border-border bg-card px-2.5 text-xs font-medium text-foreground",
          className,
        )}
        title={long}
      >
        {short}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border border-border bg-card pl-2.5 pr-1.5 text-xs font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary/40 data-[state=open]:bg-primary-soft data-[state=open]:text-primary pointer-coarse:h-10",
            className,
          )}
        >
          {short}
          <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Turnus</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (isFrequencyKey(next) && next !== value) onValueChange(next);
          }}
        >
          {FREQUENCY_OPTIONS.map((o) => (
            <DropdownMenuRadioItem key={o.key} value={o.key}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
