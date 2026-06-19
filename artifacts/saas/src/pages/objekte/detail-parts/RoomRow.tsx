import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import type { Room } from "@/store/use-store";
import { calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function RoomRow({
  room,
  index,
  total,
  effectiveRate,
  onEdit,
  onMove,
  onDelete,
}: {
  room: Room;
  index: number;
  total: number;
  effectiveRate: number;
  onEdit: () => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const rc = calcRoom(room, effectiveRate);
  return (
    <div
      className="glass-card p-4 flex items-center group cursor-pointer hover:bg-secondary transition-colors"
      onClick={onEdit}
    >
      <div className="flex flex-col gap-0.5 mr-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onMove(index, "up"); }}
          disabled={index === 0}
          aria-label="Raum nach oben verschieben"
          className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${index === 0 ? "opacity-20" : "hover:bg-muted"}`}
        >
          <ChevronUp size={14} className="text-muted-foreground" aria-hidden="true" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(index, "down"); }}
          disabled={index === total - 1}
          aria-label="Raum nach unten verschieben"
          className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${index === total - 1 ? "opacity-20" : "hover:bg-muted"}`}
        >
          <ChevronDown size={14} className="text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm text-foreground truncate">{room.name || room.typeName}</h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide whitespace-nowrap">{room.groupName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{room.area} m²</span>
          <span className="w-0.5 h-0.5 rounded-full bg-border" />
          <span>{FREQUENCY_LABELS[room.frequency]}</span>
        </div>
      </div>
      <div className="text-right shrink-0 pr-2">
        <p className="font-bold text-foreground">{formatCurrency(rc.monthlyCost)}</p>
        <p className="text-xs text-primary font-medium">{formatNumber(rc.monthlyHours, 1)} h</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label={`Raum „${room.name || room.typeName}" löschen`}
        className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 shrink-0"
      >
        <Trash2 size={14} className="text-destructive" aria-hidden="true" />
      </button>
    </div>
  );
}
