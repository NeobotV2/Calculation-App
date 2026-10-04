import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { adoptedRate, calcHourlyRate, getDefaultConfig, suggestedDefaultRate } from "@/lib/hourly-rate-calc";
import { ResultSummary } from "./ResultSummary";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/ | /g, " ").replace(/\s+/g, " ");

describe("ResultSummary — Verrechnungssatz wie übernommen", () => {
  it("shows the adopted (rounded-up) rate, the same value that is saved", () => {
    const config = getDefaultConfig();
    const breakdown = calcHourlyRate(config);
    const rate = adoptedRate(breakdown);
    expect(rate).toBe(suggestedDefaultRate());
    const html = text(renderToStaticMarkup(<ResultSummary config={config} breakdown={breakdown} savedRate={rate} />));
    const shown = rate.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Ergebnis und „Aktuell gespeichert“ zeigen denselben Satz.
    expect(html).toMatch(new RegExp(`Verrechnungssatz ${shown.replace(".", "\\.")}`));
    expect(html).toContain(`Aktuell gespeichert: ${shown}`);
    if (Math.round(breakdown.stundenverrechnungssatz * 100) !== Math.round(rate * 100)) {
      expect(html).toContain("Auf den vollen Cent aufgerundet");
    }
  });

  it("no rounding note when the calculated rate is a whole cent amount", () => {
    const config = getDefaultConfig();
    const breakdown = { ...calcHourlyRate(config), stundenverrechnungssatz: 30 };
    const html = text(renderToStaticMarkup(<ResultSummary config={config} breakdown={breakdown} />));
    expect(html).not.toContain("aufgerundet");
  });
});
