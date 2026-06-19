import { AlertTriangle, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { Warning } from "@/lib/warnings";

export function WarningsPanel({
  warnings,
  expanded,
  onToggle,
}: {
  warnings: Warning[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (warnings.length === 0) return null;
  return (
    <div className={`rounded-2xl border mb-6 overflow-hidden ${
      warnings.some((w) => w.severity === "critical")
        ? "border-destructive/30 bg-destructive/5"
        : warnings.some((w) => w.severity === "warning")
          ? "border-warning/30 bg-warning/5"
          : "border-info/30 bg-info/5"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4"
      >
        <AlertTriangle size={18} aria-hidden="true" className={
          warnings.some((w) => w.severity === "critical")
            ? "text-destructive"
            : warnings.some((w) => w.severity === "warning")
              ? "text-warning"
              : "text-info"
        } />
        <span className="font-medium text-sm text-foreground flex-1 text-left">
          {warnings.length} Hinweis{warnings.length > 1 ? "e" : ""} zur Kalkulation
        </span>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" aria-hidden="true" /> : <ChevronDown size={16} className="text-muted-foreground" aria-hidden="true" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {warnings.map((w) => (
            <div key={w.id} className="flex gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                w.severity === "critical"
                  ? "bg-destructive/20 text-destructive"
                  : w.severity === "warning"
                    ? "bg-warning/20 text-warning"
                    : "bg-info/20 text-info"
              }`}>
                {w.severity === "info" ? <Info size={12} aria-hidden="true" /> : <AlertTriangle size={12} aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{w.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{w.message}</p>
                <p className="text-xs text-primary mt-1">{w.action}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
