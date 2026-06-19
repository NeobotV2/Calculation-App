import { cn } from "@/lib/utils";
import type { FrequencyKey, Room } from "@/store/use-store";
import { FREQUENCY_OPTIONS } from "../constants";

type GroupedRooms = Record<string, { groupName: string; rooms: Room[] }>;

interface Step3FrequencyProps {
  rooms: Room[];
  groupedRooms: GroupedRooms;
  setAllFrequencies: (freq: FrequencyKey) => void;
  updateRoomFrequency: (roomId: string, freq: FrequencyKey) => void;
}

export function Step3Frequency({
  rooms,
  groupedRooms,
  setAllFrequencies,
  updateRoomFrequency,
}: Step3FrequencyProps) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Reinigungsturnus</h3>
        <p className="text-sm text-muted-foreground">
          Wähle die Reinigungsfrequenz — global oder pro Raumgruppe.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl">
          <p className="text-muted-foreground">Füge zuerst Räume hinzu (Schritt 2).</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              Globaler Turnus (alle Räume)
            </label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setAllFrequencies(f.key)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    rooms.every((r) => r.frequency === f.key)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/40 text-muted-foreground hover:border-border"
                  )}
                >
                  {f.short}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Pro Raumgruppe anpassen
            </label>
            {Object.entries(groupedRooms).map(([groupId, group]) => (
              <div key={groupId} className="bg-card border border-border/20 rounded-2xl p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">{group.groupName}</h4>
                {group.rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                    <span className="text-sm text-foreground truncate flex-1 pr-3">
                      {room.name || room.typeName}
                      <span className="text-xs text-muted-foreground ml-1">({room.area} m²)</span>
                    </span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {FREQUENCY_OPTIONS.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => updateRoomFrequency(room.id, f.key)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[11px] font-medium transition-colors",
                            room.frequency === f.key
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border border-border/30 text-muted-foreground"
                          )}
                        >
                          {f.short}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
