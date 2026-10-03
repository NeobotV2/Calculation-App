import * as React from "react";
import { LayoutTemplate, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { StateView } from "@/components/ui/state-view";
import { formatDate } from "@/lib/utils";
import { useStore, type Template } from "@/store/use-store";
import { formatArea } from "./rooms/RoomsTable";

export interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Gewählte Vorlage. Plan-Gating und Übernahme der Räume macht der Aufrufer. */
  onPick: (template: Template) => void;
  /** Vorlagen statt der aus dem Store (z. B. für Tests). */
  templates?: Template[];
  title?: string;
  description?: string;
}

/** Ab dieser Anzahl erscheint ein Suchfeld. */
const SEARCH_THRESHOLD = 6;

function templateArea(t: Template): number {
  return t.rooms.reduce((sum, r) => sum + (Number.isFinite(r.area) ? r.area : 0), 0);
}

/**
 * Auswahl einer gespeicherten Vorlage (nur Räume). Zeigt Name, Raumanzahl und
 * Σ Fläche; ohne Vorlagen einen leeren Zustand mit Weg zur Vorlagenverwaltung.
 */
export function TemplatePicker({
  open,
  onOpenChange,
  onPick,
  templates: templatesProp,
  title = "Vorlage laden",
  description = "Die Räume der Vorlage werden übernommen. Vorlagen enthalten nur Räume.",
}: TemplatePickerProps) {
  const storeTemplates = useStore((s) => s.templates);
  const templates = templatesProp ?? storeTemplates;
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const sorted = React.useMemo(
    () => [...templates].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [templates],
  );
  const q = query.trim().toLowerCase();
  const visible = q ? sorted.filter((t) => t.name.toLowerCase().includes(q)) : sorted;

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={title} description={description} size="md">
      {templates.length === 0 ? (
        <StateView
          kind="empty"
          compact
          titleAs="h3"
          icon={LayoutTemplate}
          title="Noch keine Vorlagen"
          description="Speichern Sie ein Objekt als Vorlage, um seine Räume hier wiederzuverwenden."
          action={{ label: "Zu den Vorlagen", href: "/vorlagen" }}
        />
      ) : (
        <div className="space-y-3">
          {templates.length >= SEARCH_THRESHOLD && (
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label="Vorlagen durchsuchen"
                placeholder="Vorlage suchen …"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground" role="status">
              Keine Vorlage gefunden.
            </p>
          ) : (
            <ul role="list" aria-label="Vorlagen" className="-mx-4 divide-y divide-border md:-mx-6">
              {visible.map((t) => {
                const count = t.rooms.length;
                const meta = [
                  `${count} ${count === 1 ? "Raum" : "Räume"}`,
                  `${formatArea(templateArea(t), 0)} m²`,
                  t.createdAt ? `angelegt ${formatDate(t.createdAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <ListRow
                    key={t.id}
                    as="li"
                    className="md:px-6"
                    leading={
                      <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <LayoutTemplate aria-hidden="true" className="size-4" />
                      </span>
                    }
                    title={t.name}
                    meta={meta}
                    onClick={() => {
                      onPick(t);
                      onOpenChange(false);
                    }}
                  />
                );
              })}
            </ul>
          )}
        </div>
      )}
    </ResponsiveSheet>
  );
}
