import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Check, ChevronDown, ListPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { HmsCatalogItem } from "@/data/hausmeisterservice";
import type { HmsConfig } from "@/lib/service-modules/types";
import { cn } from "@/lib/utils";
import { addCatalogItems, addedCatalogIds, catalogGroups, missingPresetTasks, presetTargetLabel } from "./hms-ui";

export interface CatalogPickerProps {
  value: HmsConfig;
  onChange: (next: HmsConfig) => void;
  /** Objektart für „Vorschlag für {Objektart} übernehmen“ (unbekannt ⇒ Standardauswahl). */
  objectType?: string;
  /** Öffnet das TaskSheet für eine eigene Leistung (Einheit pauschal). */
  onCustom: () => void;
  /** Katalog anfangs aufgeklappt (Standard: solange keine Leistung erfasst ist). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Leistungskatalog nach Kategorien als Chips „+ {Leistung}“. Bereits erfasste
 * Leistungen tragen ✓ und sind deaktiviert. Dazu [Vorschlag übernehmen] und
 * [Eigene Leistung].
 */
export function CatalogPicker({ value, onChange, objectType, onCustom, defaultOpen, className }: CatalogPickerProps) {
  const uid = React.useId();
  const [open, setOpen] = React.useState(defaultOpen ?? value.tasks.length === 0);
  const groups = React.useMemo(() => catalogGroups(), []);
  const added = addedCatalogIds(value);
  const missing = missingPresetTasks(value, objectType);
  const target = presetTargetLabel(objectType);

  const add = (items: readonly HmsCatalogItem[]) => onChange(addCatalogItems(value, items, uuidv4));

  const applyPreset = () => {
    if (missing.length === 0) return;
    add(missing);
    toast.success(
      missing.length === 1 ? "1 Leistung aus dem Vorschlag hinzugefügt" : `${missing.length} Leistungen aus dem Vorschlag hinzugefügt`,
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={applyPreset}
          disabled={missing.length === 0}
          // Langer Objektart-Name: auf Phones umbrechen statt über den Kartenrand zu laufen.
          className="h-auto min-h-8 max-w-full whitespace-normal py-1.5 text-left pointer-coarse:h-auto pointer-coarse:min-h-10"
        >
          <ListPlus aria-hidden="true" />
          {missing.length > 0
            ? `Vorschlag für ${target} übernehmen (${missing.length})`
            : `Vorschlag für ${target} übernommen`}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCustom}>
          <Plus aria-hidden="true" />
          Eigene Leistung
        </Button>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="group -ml-2" aria-controls={`${uid}-catalog`}>
            <ChevronDown aria-hidden="true" className="transition-transform group-data-[state=open]:rotate-180" />
            {open ? "Leistungskatalog ausblenden" : "Leistungskatalog anzeigen"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent id={`${uid}-catalog`} className="space-y-4 pt-2">
          {groups.map((g) => (
            <div key={g.category} role="group" aria-labelledby={`${uid}-${g.category}`} className="space-y-2">
              <h4 id={`${uid}-${g.category}`} className="text-overline uppercase text-muted-foreground">
                {g.label}
              </h4>
              <ul className="flex flex-wrap gap-2">
                {g.items.map((item) => {
                  const isAdded = added.has(item.id);
                  return (
                    <li key={item.id} className="max-w-full">
                      <Button
                        type="button"
                        variant={isAdded ? "tonal" : "secondary"}
                        size="sm"
                        disabled={isAdded}
                        onClick={() => add([item])}
                        className="h-auto min-h-8 max-w-full whitespace-normal rounded-full py-1.5 text-left pointer-coarse:h-auto pointer-coarse:min-h-10"
                      >
                        {isAdded ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                        <span>{item.label}</span>
                        {isAdded && <span className="sr-only">(bereits hinzugefügt)</span>}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
