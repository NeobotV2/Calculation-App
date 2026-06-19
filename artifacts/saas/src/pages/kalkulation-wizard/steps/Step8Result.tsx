import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { calcRoom, FREQUENCY_LABELS } from "@/lib/calc";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import type { Warning } from "@/lib/warnings";
import type { Room } from "@/store/use-store";

interface CompletenessCheck {
  label: string;
  ok: boolean;
}

interface Totals {
  cost: number;
  annualCost: number;
  hours: number;
  area: number;
  pricePerSqm: number;
  ruestzeitHours: number;
  wegezeitHours: number;
}

interface Step8ResultProps {
  totals: Totals;
  completenessScore: number;
  completenessChecks: CompletenessCheck[];
  warnings: Warning[];
  rooms: Room[];
  ruestzeit: number;
  wegezeit: number;
  effectiveRate: number;
}

export function Step8Result({
  totals,
  completenessScore,
  completenessChecks,
  warnings,
  rooms,
  ruestzeit,
  wegezeit,
  effectiveRate,
}: Step8ResultProps) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Ergebnis & Angebot</h3>
        <p className="text-sm text-muted-foreground">
          Zusammenfassung der Kalkulation.
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-4 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Empfohlener Monatspreis</p>
        <p className="text-4xl font-bold text-primary">{formatCurrency(totals.cost)}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {formatCurrency(totals.annualCost)} / Jahr
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Stunden / Monat", value: `${formatNumber(totals.hours, 1)} h` },
          { label: "Stunden / Jahr", value: `${formatNumber(totals.hours * 12, 0)} h` },
          { label: "Fläche gesamt", value: `${formatNumber(totals.area, 0)} m²` },
          { label: "Preis / m²", value: formatCurrency(totals.pricePerSqm) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border/30 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Vollständigkeit</p>
          <p className="text-lg font-bold text-foreground">{completenessScore}%</p>
          {completenessChecks.filter((c) => !c.ok).length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {completenessChecks.filter((c) => !c.ok).map((c) => c.label).join(", ")}
            </p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          completenessScore >= 80 ? "bg-success/20" : completenessScore >= 50 ? "bg-warning/20" : "bg-destructive/20"
        )}>
          {completenessScore >= 80 ? (
            <CheckCircle2 size={24} className="text-success" />
          ) : completenessScore >= 50 ? (
            <AlertTriangle size={24} className="text-warning" />
          ) : (
            <XCircle size={24} className="text-destructive" />
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className={cn(
          "rounded-2xl border p-4 mb-4",
          warnings.some((w) => w.severity === "critical")
            ? "border-destructive/30 bg-destructive/5"
            : "border-warning/30 bg-warning/5"
        )}>
          <p className="text-sm font-medium text-foreground mb-2">
            {warnings.length} Hinweis{warnings.length > 1 ? "e" : ""}
          </p>
          {warnings.map((w) => (
            <p key={w.id} className="text-xs text-muted-foreground">• {w.title}</p>
          ))}
        </div>
      )}

      <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Leistungsverzeichnis
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left py-2 font-medium text-muted-foreground">Raum</th>
                <th className="text-right py-2 font-medium text-muted-foreground">m²</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Turnus</th>
                <th className="text-right py-2 font-medium text-muted-foreground">h/Mo</th>
                <th className="text-right py-2 font-medium text-muted-foreground">€/Mo</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const rc = calcRoom(room, effectiveRate);
                return (
                  <tr key={room.id} className="border-b border-border/10">
                    <td className="py-2 text-foreground">{room.name || room.typeName}</td>
                    <td className="py-2 text-right text-foreground">{room.area}</td>
                    <td className="py-2 text-right text-muted-foreground">{FREQUENCY_LABELS[room.frequency]}</td>
                    <td className="py-2 text-right text-foreground">{formatNumber(rc.monthlyHours, 1)}</td>
                    <td className="py-2 text-right font-medium text-foreground">{formatCurrency(rc.monthlyCost)}</td>
                  </tr>
                );
              })}
              {(ruestzeit > 0 || wegezeit > 0) && (
                <tr className="border-b border-border/10">
                  <td className="py-2 text-muted-foreground" colSpan={3}>
                    Rüst- & Wegezeit
                  </td>
                  <td className="py-2 text-right text-foreground">
                    {formatNumber(totals.ruestzeitHours + totals.wegezeitHours, 1)}
                  </td>
                  <td className="py-2 text-right font-medium text-foreground">
                    {formatCurrency((totals.ruestzeitHours + totals.wegezeitHours) * effectiveRate)}
                  </td>
                </tr>
              )}
              <tr className="font-bold">
                <td className="py-2 text-primary">Gesamt</td>
                <td className="py-2 text-right text-foreground">{formatNumber(totals.area, 0)}</td>
                <td />
                <td className="py-2 text-right text-foreground">{formatNumber(totals.hours, 1)}</td>
                <td className="py-2 text-right text-primary">{formatCurrency(totals.cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
