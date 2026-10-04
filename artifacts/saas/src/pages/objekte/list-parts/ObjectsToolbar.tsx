import { useId } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { IconButton } from "@/components/ui/icon-button";
import {
  OBJECTS_CHIP_LABELS,
  OBJECTS_MODULE_FILTER_LABELS,
  OBJECTS_SORT_LABELS,
  type ObjectsChip,
  type ObjectsFilterState,
  type ObjectsModuleFilter,
  type ObjectsSort,
  type ObjectsSortKey,
  type ObjectsTab,
} from "./objects-filter";

export interface ObjectsToolbarProps {
  filter: ObjectsFilterState;
  onFilterChange: (next: ObjectsFilterState) => void;
  counts: Record<ObjectsTab, number>;
  /** Sortierung (nur unter md als Auswahl sichtbar; ab md über die Spaltenköpfe). */
  sort: ObjectsSort;
  onSortChange: (next: ObjectsSort) => void;
}

const CHIPS: ObjectsChip[] = ["all", "weak", "high_hours", "review"];
const MODULES: ObjectsModuleFilter[] = ["all", "winterdienst", "hms"];

/** Sortieroptionen der mobilen Auswahl (Wert = "key:dir"). */
const MOBILE_SORTS: { key: ObjectsSortKey; dir: "asc" | "desc"; label: string }[] = [
  { key: "updated", dir: "desc", label: "Zuletzt geändert" },
  { key: "price", dir: "desc", label: "Monatspreis (hoch → niedrig)" },
  { key: "margin", dir: "asc", label: "Marge (niedrig → hoch)" },
  { key: "area", dir: "desc", label: "Fläche (groß → klein)" },
  { key: "hours", dir: "desc", label: "Std./Monat (hoch → niedrig)" },
  { key: "name", dir: "asc", label: "Name (A–Z)" },
];

/**
 * Werkzeugleiste der Objektliste: Suche, Aktiv/Archiviert (segmentiert, als
 * TabsList — die Liste ist das Tab-Panel), Chip-Filter und Leistungsfilter.
 */
export function ObjectsToolbar({ filter, onFilterChange, counts, sort, onSortChange }: ObjectsToolbarProps) {
  const baseId = useId();
  const set = (patch: Partial<ObjectsFilterState>) => onFilterChange({ ...filter, ...patch });
  const sortValue = `${sort.id}:${sort.dir}`;
  const mobileSortKnown = MOBILE_SORTS.some((s) => `${s.key}:${s.dir}` === sortValue);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            role="searchbox"
            enterKeyHint="search"
            aria-label="Objekte suchen"
            placeholder="Name, Kunde, Standort …"
            value={filter.search}
            onChange={(e) => set({ search: e.target.value })}
            className="pl-9 pr-10"
          />
          {filter.search && (
            <IconButton
              label="Suche leeren"
              icon={X}
              size="sm"
              tooltip={false}
              onClick={() => set({ search: "" })}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            />
          )}
        </div>
        <TabsList variant="segmented" aria-label="Objekte anzeigen" className="w-full md:w-auto">
          <TabsTrigger value="active" count={counts.active}>
            Aktiv
          </TabsTrigger>
          <TabsTrigger value="archived" count={counts.archived}>
            Archiviert
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ToggleGroup
          type="single"
          variant="chip"
          size="sm"
          value={filter.chip}
          onValueChange={(v) => set({ chip: (v || "all") as ObjectsChip })}
          aria-label="Objekte filtern"
        >
          {CHIPS.map((c) => (
            <ToggleGroupItem key={c} value={c}>
              {OBJECTS_CHIP_LABELS[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`${baseId}-module`} className="sr-only">
            Leistung
          </label>
          <NativeSelect
            id={`${baseId}-module`}
            inputSize="sm"
            wrapperClassName="sm:w-56"
            value={filter.module}
            onChange={(e) => set({ module: e.target.value as ObjectsModuleFilter })}
          >
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {OBJECTS_MODULE_FILTER_LABELS[m]}
              </option>
            ))}
          </NativeSelect>

          <div className="md:hidden">
            <label htmlFor={`${baseId}-sort`} className="sr-only">
              Sortierung
            </label>
            <NativeSelect
              id={`${baseId}-sort`}
              inputSize="sm"
              wrapperClassName="sm:w-64"
              value={sortValue}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(":") as [ObjectsSortKey, "asc" | "desc"];
                onSortChange({ id: key, dir });
              }}
            >
              {!mobileSortKnown && (
                <option value={sortValue}>
                  {OBJECTS_SORT_LABELS[sort.id]} ({sort.dir === "asc" ? "aufsteigend" : "absteigend"})
                </option>
              )}
              {MOBILE_SORTS.map((s) => (
                <option key={`${s.key}:${s.dir}`} value={`${s.key}:${s.dir}`}>
                  Sortierung: {s.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>
    </div>
  );
}
