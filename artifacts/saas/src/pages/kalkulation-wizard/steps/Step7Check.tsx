import { AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Warning } from "@/lib/warnings";
import type { Room } from "@/store/use-store";

interface CompletenessCheck {
  label: string;
  ok: boolean;
}

interface Step7CheckProps {
  completenessScore: number;
  readinessColor: string;
  readinessLabel: string;
  completenessChecks: CompletenessCheck[];
  warnings: Warning[];
  rooms: Room[];
}

export function Step7Check({
  completenessScore,
  readinessColor,
  readinessLabel,
  completenessChecks,
  warnings,
  rooms,
}: Step7CheckProps) {
  return (
    <>
      <div className="mb-5">
        <h3 className="text-2xl font-semibold tracking-tight mb-1">Plausibilitätsprüfung</h3>
        <p className="text-sm text-muted-foreground">
          Checkliste mit allen Warnungen und Auffälligkeiten.
        </p>
      </div>

      <div className="bg-card border border-border/20 rounded-2xl p-5 mb-4">
        <div className="text-center mb-4">
          <p className="text-4xl font-bold text-foreground">{completenessScore}%</p>
          <p className={cn("text-sm font-medium mt-1", readinessColor)}>{readinessLabel}</p>
        </div>

        <div className="space-y-3">
          {completenessChecks.map((check, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                check.ok ? "bg-success/20" : "bg-destructive/20"
              )}>
                {check.ok ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : (
                  <XCircle size={14} className="text-destructive" />
                )}
              </div>
              <span className={cn(
                "text-sm",
                check.ok ? "text-foreground" : "text-destructive"
              )}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-card border border-border/20 rounded-2xl p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Hinweise zur Kalkulation
          </h4>
          <div className="space-y-3">
            {warnings.map((w) => (
              <div key={w.id} className="flex gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  w.severity === "critical"
                    ? "bg-destructive/20 text-destructive"
                    : w.severity === "warning"
                      ? "bg-warning/20 text-warning"
                      : "bg-info/20 text-info"
                )}>
                  {w.severity === "info" ? <Info size={12} /> : <AlertTriangle size={12} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{w.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{w.message}</p>
                  <p className="text-xs text-primary mt-1">{w.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length === 0 && rooms.length > 0 && (
        <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-success shrink-0" />
          <p className="text-sm text-foreground">Keine Warnungen — die Kalkulation sieht gut aus!</p>
        </div>
      )}
    </>
  );
}
