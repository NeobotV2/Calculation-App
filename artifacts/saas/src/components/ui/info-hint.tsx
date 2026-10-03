import * as React from "react";
import { Info } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface InfoHintProps {
  /** Zugänglicher Name des „i"-Buttons, z. B. „Erklärung: Deckungsbeitrag". */
  label: string;
  /** Inhalt des Popovers (Formel, Erläuterung). */
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

/** Kleines „i" neben Labels; öffnet per Klick/Tipp eine Erläuterung. */
export function InfoHint({ label, children, side = "top", align = "center", className }: InfoHintProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          label={label}
          icon={Info}
          size="sm"
          tooltip={false}
          className={cn(
            "size-6 rounded-full text-muted-foreground hover:text-foreground pointer-coarse:-my-2 pointer-coarse:size-10 [&_svg:not([class*='size-'])]:size-3.5",
            className,
          )}
        />
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="text-sm leading-5">
        {children}
      </PopoverContent>
    </Popover>
  );
}
