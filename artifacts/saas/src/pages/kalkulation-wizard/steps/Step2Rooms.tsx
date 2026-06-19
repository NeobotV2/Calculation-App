import { Plus, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Room } from "@/store/use-store";

type GroupedRooms = Record<string, { groupName: string; rooms: Room[] }>;

interface Totals {
  area: number;
  cost: number;
}

interface Step2RoomsProps {
  rooms: Room[];
  groupedRooms: GroupedRooms;
  effectiveRate: number;
  totals: Totals;
  openAddRoom: () => void;
  onEditRoom: (room: Room) => void;
  onDeleteRoom: (roomId: string) => void;
}

export function Step2Rooms({
  rooms,
  groupedRooms,
  effectiveRate,
  totals,
  openAddRoom,
  onEditRoom,
  onDeleteRoom,
}: Step2RoomsProps) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Raumgruppen & Flächen</h3>
        <p className="text-sm text-muted-foreground">
          Erfasse die Räume des Objekts nach Gruppen.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl mb-4">
          <p className="text-muted-foreground mb-4">Noch keine Räume erfasst.</p>
          <Button onClick={openAddRoom} variant="outline" className="px-6">
            <Plus size={16} className="mr-2" />
            Ersten Raum hinzufügen
          </Button>
        </div>
      ) : (
        <>
          {Object.entries(groupedRooms).map(([groupId, group]) => {
            const groupArea = group.rooms.reduce((s, r) => s + r.area, 0);
            return (
              <div key={groupId} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">{group.groupName}</h4>
                  <span className="text-xs text-primary font-medium">{formatNumber(groupArea, 0)} m²</span>
                </div>
                <div className="space-y-1.5">
                  {group.rooms.map((room) => {
                    const rc = calcRoom(room, effectiveRate);
                    return (
                      <div
                        key={room.id}
                        className="bg-card border border-border/20 rounded-xl p-3 flex items-center"
                      >
                        <div
                          className="flex-1 min-w-0 pr-3 cursor-pointer"
                          onClick={() => onEditRoom(room)}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-medium text-sm text-foreground truncate">
                              {room.name || room.typeName}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{room.area} m²</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-border" />
                            <span>{FREQUENCY_LABELS[room.frequency]}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pr-2">
                          <p className="font-bold text-foreground text-sm">{formatCurrency(rc.monthlyCost)}</p>
                          <p className="text-xs text-primary font-medium">{formatNumber(rc.monthlyHours, 1)} h</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => onEditRoom(room)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                          >
                            <Edit3 size={14} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => onDeleteRoom(room.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <Button onClick={openAddRoom} variant="outline" className="w-full mt-3" size="lg">
            <Plus size={16} className="mr-2" />
            Weiteren Raum hinzufügen
          </Button>
        </>
      )}

      {rooms.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Räume</p>
              <p className="text-lg font-bold text-foreground">{rooms.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Fläche</p>
              <p className="text-lg font-bold text-foreground">{formatNumber(totals.area, 0)} m²</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monatspreis</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totals.cost)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
