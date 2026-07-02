import { useState } from "react";
import { ChevronDown, ShieldAlert, TrendingDown, Users } from "lucide-react";
import type { PriceStrategy, SensitivityCase } from "@/lib/price-strategy";
import type { RiskResult } from "@/lib/risk-score";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   Wirtschaftlichkeits-Cockpit: Ampel, Angebotsstrategie (Mindest-/Zielpreis,
   Verhandlungsspielraum, Deckungsbeitrag), Risiko-Score und Sensitivität —
   ohne versteckte Annahmen, alles aus der bestehenden Kalkulation abgeleitet.
   ───────────────────────────────────────────────────────────────────────── */

const STATUS_META = {
  kritisch: { label: "Unwirtschaftlich", dot: "bg-destructive", text: "text-destructive" },
  pruefen: { label: "Prüfen", dot: "bg-warning", text: "text-warning" },
  gesund: { label: "Wirtschaftlich", dot: "bg-success", text: "text-success" },
} as const;

const RISK_META = {
  niedrig: "bg-success/10 text-success",
  mittel: "bg-warning/10 text-warning",
  hoch: "bg-destructive/10 text-destructive",
} as const;

function marginTone(marginPct: number, target: number): string {
  if (marginPct < 0) return "text-destructive";
  if (marginPct < target) return "text-warning";
  return "text-success";
}

interface Props {
  strategy: PriceStrategy;
  sensitivity: SensitivityCase[];
  risk: RiskResult;
  /** Konfigurierter Gewinn-Aufschlag in % (Anzeige-Hinweis). */
  targetMarkupPct: number;
}

export function WirtschaftlichkeitPanel({ strategy, sensitivity, risk, targetMarkupPct }: Props) {
  const [showRisk, setShowRisk] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const status = STATUS_META[strategy.status];
  const targetMarginPct = strategy.targetMarginPct;

  return (
    <section className="surface-card p-5">
      {/* Kopf: Ampel + Risiko-Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", status.dot)} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            Wirtschaftlichkeit: <span className={status.text}>{status.label}</span>
          </h2>
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", RISK_META[risk.level])}>
          Risiko {risk.score}/100
        </span>
      </div>

      {/* Kennzahlen-Raster */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Marge (v. Umsatz)</p>
          <p className={cn("text-lg font-bold tabular-nums", marginTone(strategy.marginPct, targetMarginPct))}>
            {formatNumber(strategy.marginPct, 1)} %
          </p>
          <p className="text-[11px] text-muted-foreground">
            Ziel {formatNumber(targetMarginPct, 1)} % (= {formatNumber(targetMarkupPct, 0)} % Aufschlag)
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Gewinnbeitrag</p>
          <p className={cn("text-lg font-bold tabular-nums", strategy.contributionMonthly < 0 ? "text-destructive" : "text-foreground")}>
            {formatCurrency(strategy.contributionMonthly)}
          </p>
          <p className="text-[11px] text-muted-foreground">pro Monat, nach Vollkosten</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Personalbedarf</p>
          <p className="text-lg font-bold tabular-nums text-foreground flex items-center gap-1.5">
            <Users size={15} className="text-muted-foreground" aria-hidden="true" />
            {formatNumber(risk.fte, 1)}
          </p>
          <p className="text-[11px] text-muted-foreground">Vollzeit-Äquivalente</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Mindestpreis</p>
          <p className="text-lg font-bold tabular-nums text-destructive">{formatCurrency(strategy.minPriceMonthly)}</p>
          <p className="text-[11px] text-muted-foreground">rote Linie (Vollkosten)</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Zielpreis</p>
          <p className="text-lg font-bold tabular-nums text-primary">{formatCurrency(strategy.targetPriceMonthly)}</p>
          <p className="text-[11px] text-muted-foreground">bei Ziel-Marge</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Spielraum</p>
          <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(strategy.negotiationRoomMonthly)}</p>
          <p className="text-[11px] text-muted-foreground">bis zur roten Linie</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {strategy.priceVerdict && (
          <>
            Markt-Orientierung: Der m²-Preis wirkt <span className="font-medium text-foreground">{strategy.priceVerdict}</span>
            {" "}<span className="text-muted-foreground/70">(Richtwert, unabhängig von Intervallen)</span> ·{" "}
          </>
        )}
        Break-even-Satz {formatCurrency(strategy.breakEvenRate)}/h
      </p>

      {/* Sensitivität */}
      <div className="border-t border-border/30 pt-3">
        <button
          onClick={() => setShowSensitivity((s) => !s)}
          aria-expanded={showSensitivity}
          className="w-full flex items-center justify-between text-left py-1"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TrendingDown size={15} className="text-muted-foreground" aria-hidden="true" />
            Was-wäre-wenn (Sensitivität)
          </span>
          <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", showSensitivity && "rotate-180")} aria-hidden="true" />
        </button>
        {showSensitivity && (
          <div className="mt-2 space-y-1.5">
            {sensitivity.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm rounded-lg bg-secondary/40 px-3 py-2">
                <span className="text-muted-foreground">{s.label}</span>
                <span className={cn("font-semibold tabular-nums", marginTone(s.marginPct, targetMarginPct))}>
                  {formatNumber(s.marginPct, 1)} % Marge
                  {s.belowCost && <span className="ml-1.5 text-[11px] font-medium text-destructive">unter Vollkosten</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risikofaktoren */}
      {risk.factors.length > 0 && (
        <div className="border-t border-border/30 pt-3 mt-3">
          <button
            onClick={() => setShowRisk((s) => !s)}
            aria-expanded={showRisk}
            className="w-full flex items-center justify-between text-left py-1"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldAlert size={15} className="text-muted-foreground" aria-hidden="true" />
              Risikofaktoren ({risk.factors.length})
            </span>
            <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", showRisk && "rotate-180")} aria-hidden="true" />
          </button>
          {showRisk && (
            <div className="mt-2 space-y-2">
              {risk.factors.map((f) => (
                <div key={f.key} className="rounded-xl border border-border/30 bg-card p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm font-medium text-foreground">{f.title}</p>
                    <span className="text-[11px] font-semibold text-muted-foreground shrink-0">+{f.points}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{f.detail}</p>
                  <p className="text-xs text-foreground">→ {f.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
