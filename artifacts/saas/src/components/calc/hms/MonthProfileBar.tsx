import { cn, formatNumber } from "@/lib/utils";
import { monthProfile, peakMonthsLabel } from "./hms-ui";

const MONTH_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
] as const;

export interface MonthProfileBarProps {
  /** 12 Werte (Index 0 = Januar), z. B. `HmsResult.monthlyLaborHours`. */
  hours: readonly number[];
  /** Tabellen-Caption für Screenreader. */
  caption?: string;
  className?: string;
}

/**
 * Monatsprofil als 12 Säulen (Stunden je Monat). Spitzenmonate in
 * `bg-module-hms`, übrige `bg-module-hms-soft`. Eine sr-only Tabelle
 * wiederholt alle Werte.
 */
export function MonthProfileBar({ hours, caption = "Arbeitsstunden je Monat", className }: MonthProfileBarProps) {
  const entries = monthProfile(hours);
  const peak = Math.max(0, ...entries.map((e) => e.hours));

  return (
    <figure className={cn("space-y-2", className)}>
      <div aria-hidden="true" className="flex h-24 items-end gap-1">
        {entries.map((e) => (
          <div key={e.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className={cn(
                "w-full rounded-t-xs",
                e.isPeak ? "bg-module-hms" : "bg-module-hms-soft ring-1 ring-inset ring-border",
              )}
              style={{ height: peak > 0 && e.hours > 0 ? `${Math.max(3, (e.hours / peak) * 100)}%` : "0%" }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-1">
        {entries.map((e) => (
          <span
            key={e.month}
            className={cn(
              "min-w-0 flex-1 text-center text-overline uppercase",
              e.isPeak ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {/* Phones: Anfangsbuchstabe (J F M …); volle Namen in der Tabelle für Screenreader. */}
            <span className="sm:hidden">{e.short.charAt(0)}</span>
            <span className="hidden sm:inline">{e.short}</span>
          </span>
        ))}
      </div>
      <figcaption className="text-xs text-muted-foreground">
        {peak > 0 ? (
          <>
            Spitze: <span className="font-medium text-foreground">{peakMonthsLabel(hours)}</span> mit{" "}
            <span className="tabular-nums">{formatNumber(peak, 1)} h</span>
          </>
        ) : (
          "Keine Stunden geplant."
        )}
      </figcaption>
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Monat</th>
              <th scope="col">Stunden</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.month}>
                <th scope="row">{MONTH_LONG[e.month - 1]}</th>
                <td>
                  {formatNumber(e.hours, 1)} h{e.isPeak ? " (Spitze)" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
