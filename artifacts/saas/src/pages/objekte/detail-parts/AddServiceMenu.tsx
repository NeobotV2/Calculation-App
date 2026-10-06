import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODULE_META, ModuleIcon, type ServiceModule } from "@/components/ui/module-badge";
import { cn } from "@/lib/utils";
import type { Project } from "@/store/use-store";

/** Module, die „+ Leistung“ noch anbieten kann (§8.3). */
export function addableServices(project: Pick<Project, "rooms" | "winterdienst" | "hms">, cleaningVisible: boolean): ServiceModule[] {
  const list: ServiceModule[] = [];
  if (project.rooms.length === 0 && !cleaningVisible) list.push("unterhalt");
  if (project.winterdienst === undefined) list.push("winterdienst");
  if (project.hms === undefined) list.push("hms");
  return list;
}

const DESCRIPTIONS: Record<ServiceModule, string> = {
  unterhalt: "Räume mit Fläche und Turnus",
  winterdienst: "Räumen und Streuen je Saison",
  hms: "Kontrollgänge, Grünpflege, Kleinreparaturen",
};

export interface AddServiceMenuProps {
  project: Project;
  /** Ist der Tab „Unterhaltsreinigung“ bereits sichtbar? Dann wird er nicht angeboten. */
  cleaningVisible: boolean;
  onAdd: (module: ServiceModule) => void;
  className?: string;
}

/**
 * „+ Leistung“ neben den Modul-Tabs: Unterhaltsreinigung (ohne Räume),
 * Winterdienst bzw. Hausmeisterservice (falls noch nicht angelegt).
 * Rendert nichts, wenn alle Leistungen vorhanden sind.
 */
export function AddServiceMenu({ project, cleaningVisible, onAdd, className }: AddServiceMenuProps) {
  const options = addableServices(project, cleaningVisible);
  if (options.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className={cn("shrink-0", className)}>
          <Plus aria-hidden="true" />
          {/* Schmale Spalte (Phone): nur das Plus, damit die Tabs Platz haben. */}
          <span className="hidden @md/tabs:inline" aria-hidden="true">Leistung</span>
          <span className="sr-only">Leistung hinzufügen</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel className="text-overline uppercase text-muted-foreground">Leistung hinzufügen</DropdownMenuLabel>
        {options.map((m) => (
          <DropdownMenuItem key={m} onSelect={() => onAdd(m)} className="items-start gap-3 py-2">
            <ModuleIcon module={m} size="sm" decorative />
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{MODULE_META[m].label}</span>
              <span className="block text-xs text-muted-foreground">{DESCRIPTIONS[m]}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
