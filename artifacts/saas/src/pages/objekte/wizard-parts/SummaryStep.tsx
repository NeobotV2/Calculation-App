import { motion } from "framer-motion";
import { type Room } from "@/store/use-store";
import { calcRoom, calcProjectTotals, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber } from "@/lib/utils";

type ProjectTotals = ReturnType<typeof calcProjectTotals>;

interface SummaryStepProps {
  name: string;
  customer: string;
  location_: string;
  notes: string;
  rooms: Room[];
  effectiveRate: number;
  parsedRate: number | undefined;
  totals: ProjectTotals;
}

export function SummaryStep({
  name,
  customer,
  location_,
  notes,
  rooms,
  effectiveRate,
  parsedRate,
  totals,
}: SummaryStepProps) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-6"
    >
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">
          Zusammenfassung
        </h3>
        <p className="text-sm text-muted-foreground">
          Prüfen Sie die Daten und speichern Sie das Objekt.
        </p>
      </div>

      <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">
          Objektdaten
        </h4>
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Projektname</span>
            <span className="font-medium text-foreground">
              {name.trim() || "Neues Objekt"}
            </span>
          </div>
          {customer.trim() && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kunde</span>
              <span className="font-medium text-foreground">
                {customer.trim()}
              </span>
            </div>
          )}
          {location_.trim() && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Standort</span>
              <span className="font-medium text-foreground">
                {location_.trim()}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Verrechnungssatz</span>
            <span className="font-medium text-foreground">
              {formatCurrency(effectiveRate)}/h
              {!parsedRate && (
                <span className="text-muted-foreground ml-1">
                  (Standard)
                </span>
              )}
            </span>
          </div>
          {notes.trim() && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Notizen</span>
              <span className="font-medium text-foreground max-w-[60%] text-right">
                {notes.trim()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">
          Räume ({rooms.length})
        </h4>
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Keine Räume hinzugefügt
          </p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => {
              const rc = calcRoom(room, effectiveRate);
              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between py-2 border-b border-border/10 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {room.name || room.typeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {room.area} m² ·{" "}
                      {FREQUENCY_LABELS[room.frequency]}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(rc.monthlyCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(rc.monthlyHours, 1)} h/Mo
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">
          Gesamtkalkulation
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Monatspreis
            </p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(totals.cost)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Jahreskosten
            </p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(totals.annualCost)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Stunden/Monat
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(totals.hours, 1)} h
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Gesamtfläche
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(totals.area, 0)} m²
            </p>
          </div>
          {totals.area > 0 && (
            <div className="col-span-2 pt-2 border-t border-primary/20">
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">
                  Preis pro m²
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(totals.pricePerSqm)}/m²
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
