import { Clock, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface Totals {
  hours: number;
  ruestzeitHours: number;
  wegezeitHours: number;
  cost: number;
}

interface Step5SetupTimeProps {
  ruestzeit: number;
  setRuestzeit: (v: number) => void;
  wegezeit: number;
  setWegezeit: (v: number) => void;
  totals: Totals;
}

export function Step5SetupTime({
  ruestzeit,
  setRuestzeit,
  wegezeit,
  setWegezeit,
  totals,
}: Step5SetupTimeProps) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Rüstzeit & Wegezeit</h3>
        <p className="text-sm text-muted-foreground">
          Zeit für Anfahrt, Material holen, Umziehen — separat kalkuliert.
        </p>
      </div>

      <div className="bg-card border-2 border-primary/20 rounded-2xl p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-primary" />
            <label className="text-sm font-semibold text-foreground">Rüstzeit pro Einsatz</label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Ankommen, Material holen, Umziehen, Aufräumen am Ende
          </p>
          <div className="flex gap-2 flex-wrap mb-3">
            {[0, 10, 15, 20, 30].map((v) => (
              <button
                key={v}
                onClick={() => setRuestzeit(v)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border min-w-[60px]",
                  ruestzeit === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border/40 text-muted-foreground hover:border-border"
                )}
              >
                {v} Min.
              </button>
            ))}
          </div>
          <Input
            inputMode="numeric"
            value={ruestzeit.toString()}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 0) setRuestzeit(v);
              else if (e.target.value === "") setRuestzeit(0);
            }}
            placeholder="Minuten"
            className="bg-background h-12 text-lg font-semibold"
          />
        </div>

        <div className="border-t border-border/20 pt-5">
          <div className="flex items-center gap-2 mb-2">
            <Car size={18} className="text-primary" />
            <label className="text-sm font-semibold text-foreground">Wegezeit pro Einsatz</label>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Fahrt zum Objekt, ggf. zwischen Etagen oder Gebäudeteilen
          </p>
          <div className="flex gap-2 flex-wrap mb-3">
            {[0, 10, 15, 20, 30, 45].map((v) => (
              <button
                key={v}
                onClick={() => setWegezeit(v)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border min-w-[60px]",
                  wegezeit === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border/40 text-muted-foreground hover:border-border"
                )}
              >
                {v} Min.
              </button>
            ))}
          </div>
          <Input
            inputMode="numeric"
            value={wegezeit.toString()}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 0) setWegezeit(v);
              else if (e.target.value === "") setWegezeit(0);
            }}
            placeholder="Minuten"
            className="bg-background h-12 text-lg font-semibold"
          />
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Auswirkung auf Gesamtstunden
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reinigungsstunden / Monat</span>
            <span className="font-medium text-foreground">
              {formatNumber(totals.hours - totals.ruestzeitHours - totals.wegezeitHours, 1)} h
            </span>
          </div>
          {ruestzeit > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">+ Rüstzeit / Monat</span>
              <span className="font-medium text-foreground">
                {formatNumber(totals.ruestzeitHours, 1)} h
              </span>
            </div>
          )}
          {wegezeit > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">+ Wegezeit / Monat</span>
              <span className="font-medium text-foreground">
                {formatNumber(totals.wegezeitHours, 1)} h
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-primary border-t border-primary/20 pt-2">
            <span>= Gesamtstunden / Monat</span>
            <span>{formatNumber(totals.hours, 1)} h</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-foreground">= Monatspreis</span>
            <span className="text-primary">{formatCurrency(totals.cost)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
