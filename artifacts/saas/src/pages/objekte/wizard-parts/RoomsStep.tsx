import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Edit3, Copy, FileStack, ChevronDown } from "lucide-react";
import { type Room, type Template } from "@/store/use-store";
import { calcRoom, calcProjectTotals, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ProjectTotals = ReturnType<typeof calcProjectTotals>;

interface RoomsStepProps {
  rooms: Room[];
  effectiveRate: number;
  totals: ProjectTotals;
  templates: Template[];
  onAddRoom: () => void;
  onEditRoom: (room: Room) => void;
  onDuplicateRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onApplyTemplate: (templateId: string) => void;
}

export function RoomsStep({
  rooms,
  effectiveRate,
  totals,
  templates,
  onAddRoom,
  onEditRoom,
  onDuplicateRoom,
  onDeleteRoom,
  onApplyTemplate,
}: RoomsStepProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const templatePicker = templates.length > 0 && (
    <div className="mb-4">
      <button
        onClick={() => setShowTemplates((s) => !s)}
        aria-expanded={showTemplates}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border/30 bg-card hover:bg-secondary transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileStack size={16} className="text-muted-foreground" aria-hidden="true" />
          Aus Vorlage laden
        </span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${showTemplates ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {showTemplates && (
        <div className="mt-2 space-y-1.5">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => {
                onApplyTemplate(tpl.id);
                setShowTemplates(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/30 bg-card hover:bg-secondary transition-colors text-left"
            >
              <span className="text-sm font-medium text-foreground truncate pr-3">{tpl.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {tpl.rooms.length} {tpl.rooms.length === 1 ? "Raum" : "Räume"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-6"
    >
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">
          Räume & Zu-/Abschläge
        </h3>
        <p className="text-sm text-muted-foreground">
          Erfassen Sie das Leistungsverzeichnis — ähnliche Räume lassen sich duplizieren.
        </p>
      </div>

      {templatePicker}

      {rooms.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl mb-4">
          <p className="text-muted-foreground mb-4">
            Noch keine Räume erfasst.
          </p>
          <Button
            onClick={onAddRoom}
            variant="outline"
            className="px-6"
          >
            <Plus size={16} className="mr-2" aria-hidden="true" />
            Ersten Raum hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {rooms.map((room) => {
            const rc = calcRoom(room, effectiveRate);
            return (
              <div
                key={room.id}
                className="bg-card border border-border/20 rounded-2xl p-4 flex items-center group"
              >
                <div
                  className="flex-1 min-w-0 pr-3 cursor-pointer"
                  onClick={() => onEditRoom(room)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {room.name || room.typeName}
                    </h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {room.groupName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{room.area} m²</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-border" />
                    <span>{FREQUENCY_LABELS[room.frequency]}</span>
                    {(room.soilingLevel ||
                      room.furnishingLevel ||
                      room.floorType) && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-border" />
                        <span className="text-primary">
                          Zu-/Abschläge
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 pr-2">
                  <p className="font-bold text-foreground text-sm">
                    {formatCurrency(rc.monthlyCost)}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    {formatNumber(rc.monthlyHours, 1)} h
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onEditRoom(room)}
                    aria-label={`Raum „${room.name || room.typeName}" bearbeiten`}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                  >
                    <Edit3
                      size={14}
                      className="text-muted-foreground"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    onClick={() => onDuplicateRoom(room.id)}
                    aria-label={`Raum „${room.name || room.typeName}" duplizieren`}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                  >
                    <Copy size={14} className="text-muted-foreground" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => onDeleteRoom(room.id)}
                    aria-label={`Raum „${room.name || room.typeName}" entfernen`}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} className="text-destructive" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}

          <Button
            onClick={onAddRoom}
            variant="outline"
            className="w-full mt-3"
            size="lg"
          >
            <Plus size={16} className="mr-2" aria-hidden="true" />
            Weiteren Raum hinzufügen
          </Button>
        </div>
      )}

      {rooms.length > 0 && (
        /* Bleibt bei langen Raumlisten am unteren Rand sichtbar (über der ActionBar). */
        <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm -mx-2 px-2 pt-2 pb-1 rounded-t-2xl">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Räume
              </p>
              <p className="text-lg font-bold text-foreground">
                {rooms.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Fläche
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatNumber(totals.area, 0)} m²
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Monatspreis
              </p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(totals.cost)}
              </p>
            </div>
          </div>
        </div>
        </div>
      )}
    </motion.div>
  );
}
