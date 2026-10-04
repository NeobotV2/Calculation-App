import * as React from "react";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { FrequencyChip } from "./FrequencySelect";
import {
  RoomActionsMenu,
  RoomPerformanceDetail,
  RoomsFooterProvider,
  formatArea,
  formatHours,
  hasRowActions,
  roomDisplayName,
  type RoomRowHandlers,
  type RoomsTotal,
} from "./RoomsTable";
import type { RoomGroup } from "./rooms-editor-logic";

export interface RoomCardListProps {
  groups: RoomGroup[];
  rate: number;
  /** Ohne Handler: schreibgeschützt. */
  handlers?: RoomRowHandlers;
  /** Zusätzliche Fußzeilen (`RoomsFooterRow`), z. B. Rüst-/Wegezeit. */
  footer?: React.ReactNode;
  total: RoomsTotal;
  caption?: string;
  className?: string;
}

/**
 * Raumliste für Phones: je Raum eine Zeile mit Name, Raumart · m², Monatspreis,
 * Turnus-Chip (Schnellauswahl) und „⋯“-Menü. Tippen öffnet den Raum-Editor.
 */
export function RoomCardList({
  groups,
  rate,
  handlers,
  footer,
  total,
  caption = "Räume",
  className,
}: RoomCardListProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const detailId = React.useId();
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const showActions = hasRowActions(handlers);
  const showSubtotals = groups.length > 1;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-surface", className)}>
      <ul role="list" aria-label={caption} className="divide-y divide-border">
        {groups.map((g) => (
          <React.Fragment key={g.groupId}>
            <li className="flex items-baseline justify-between gap-3 bg-surface-sunken px-4 py-2">
              <span className="truncate text-overline uppercase text-muted-foreground">{g.groupName}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {g.rooms.length} {g.rooms.length === 1 ? "Raum" : "Räume"} · {formatArea(g.area, 1)} m²
              </span>
            </li>
            {g.rows.map((row) => {
              const room = row.room;
              const name = roomDisplayName(room);
              const isOpen = expanded.has(room.id);
              const panelId = `${detailId}-${room.id}`;
              const metaParts = [
                room.typeName && room.typeName !== name ? room.typeName : null,
                `${formatArea(room.area)} m²`,
                `${formatHours(row.hoursMonthly)} h`,
              ].filter(Boolean);
              const togglesDetails = !handlers?.onEdit;
              return (
                <li key={room.id}>
                  <ListRow
                    title={name}
                    meta={metaParts.join(" · ")}
                    onClick={togglesDetails ? () => toggle(room.id) : () => handlers?.onEdit?.(room)}
                    aria-expanded={togglesDetails ? isOpen : undefined}
                    aria-controls={togglesDetails && isOpen ? panelId : undefined}
                    chevron={false}
                    trailing={
                      <>
                        <div className="flex flex-col items-end gap-1">
                          <Money value={row.priceMonthly} className="font-medium" />
                          <FrequencyChip
                            value={room.frequency}
                            onValueChange={(f) => handlers?.onFrequencyChange?.(room, f)}
                            context={name}
                            disabled={!handlers?.onFrequencyChange}
                          />
                        </div>
                        {showActions && handlers && (
                          <RoomActionsMenu
                            room={room}
                            handlers={handlers}
                            onToggleDetails={() => toggle(room.id)}
                            detailsExpanded={isOpen}
                          />
                        )}
                      </>
                    }
                  />
                  {isOpen && (
                    <div className="border-t border-border bg-surface-sunken px-4 py-3">
                      <RoomPerformanceDetail
                        id={panelId}
                        room={room}
                        rate={rate}
                        onEdit={handlers?.onEdit}
                        shown={{ hoursMonthly: row.hoursMonthly, priceMonthly: row.priceMonthly }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
            {showSubtotals && (
              <li className="flex items-center justify-between gap-3 bg-surface-sunken px-4 py-2 text-xs text-muted-foreground">
                <span className="truncate">Summe {g.groupName}</span>
                <span className="shrink-0 tabular-nums">
                  {formatHours(g.hoursMonthly)} h · <Money value={g.priceMonthly} size="sm" className="text-foreground" />
                </span>
              </li>
            )}
          </React.Fragment>
        ))}
        {footer != null && <RoomsFooterProvider layout={{ variant: "list" }}>{footer}</RoomsFooterProvider>}
        <li className="flex items-center justify-between gap-3 border-t-2 border-border-strong bg-surface-sunken px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">{total.label}</span>
            <span className="block text-xs tabular-nums text-muted-foreground">
              {formatArea(total.area, 1)} m² · {formatHours(total.hoursMonthly)} h
            </span>
          </span>
          <Money value={total.priceMonthly} className="shrink-0 font-semibold" />
        </li>
      </ul>
    </div>
  );
}
