import { calcRoom, getEffectivePerformance } from "@/lib/calc";
import { getSurchargeLabel } from "@/data/surcharges";
import { formatNumber } from "@/lib/utils";
import type { Room } from "@/store/use-store";

interface Step4PerformanceProps {
  rooms: Room[];
  effectiveRate: number;
  onEditRoom: (room: Room) => void;
}

export function Step4Performance({ rooms, effectiveRate, onEditRoom }: Step4PerformanceProps) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Leistungsbausteine</h3>
        <p className="text-sm text-muted-foreground">
          Leistungskennzahlen, Zu-/Abschläge und Reinigungszeit pro Raum.
        </p>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl">
          <p className="text-muted-foreground">Füge zuerst Räume hinzu (Schritt 2).</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const rc = calcRoom(room, effectiveRate);
            const effPerf = getEffectivePerformance(room);
            const hasSurcharges = room.soilingLevel || room.furnishingLevel || room.floorType;
            return (
              <div key={room.id} className="bg-card border border-border/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{room.name || room.typeName}</h4>
                    <p className="text-xs text-muted-foreground">{room.groupName} · {room.area} m²</p>
                  </div>
                  <button
                    onClick={() => onEditRoom(room)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Anpassen
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background rounded-lg p-2">
                    <span className="text-muted-foreground">Leistungswert</span>
                    <p className="font-semibold text-foreground">
                      {room.customPerformance || room.typePerformance} m²/h
                      {room.customPerformance && (
                        <span className="text-muted-foreground font-normal ml-1">(angepasst)</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <span className="text-muted-foreground">Eff. Leistung</span>
                    <p className="font-semibold text-primary">{formatNumber(effPerf, 0)} m²/h</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <span className="text-muted-foreground">Zeit / Reinigung</span>
                    <p className="font-semibold text-foreground">{formatNumber(rc.timePerCleaning * 60, 0)} Min.</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <span className="text-muted-foreground">Stunden / Monat</span>
                    <p className="font-semibold text-foreground">{formatNumber(rc.monthlyHours, 1)} h</p>
                  </div>
                </div>
                {hasSurcharges && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {room.soilingLevel && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                        {getSurchargeLabel("soilingLevel", room.soilingLevel)}
                      </span>
                    )}
                    {room.furnishingLevel && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/10 text-info">
                        {getSurchargeLabel("furnishingLevel", room.furnishingLevel)}
                      </span>
                    )}
                    {room.floorType && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {getSurchargeLabel("floorType", room.floorType)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
