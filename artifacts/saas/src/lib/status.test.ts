import { describe, it, expect } from "vitest";
import {
  TONES,
  TONE_CLASSES,
  TONE_ICON,
  marginStatusLabel,
  marginTone,
  riskLabel,
  riskTone,
  severityLabel,
  severityTone,
  strategyLabel,
  strategyTone,
  verdictLabel,
  verdictTone,
  worstTone,
} from "./status";

describe("marginTone", () => {
  it("is critical below zero", () => {
    expect(marginTone(-0.1, 10)).toBe("critical");
    expect(marginTone(-25, 0)).toBe("critical");
  });

  it("is warning between zero and the target", () => {
    expect(marginTone(0, 10)).toBe("warning");
    expect(marginTone(9.99, 10)).toBe("warning");
  });

  it("is success at or above the target", () => {
    expect(marginTone(10, 10)).toBe("success");
    expect(marginTone(35, 10)).toBe("success");
    expect(marginTone(0, 0)).toBe("success");
  });

  it("is neutral for non-finite margins", () => {
    expect(marginTone(Number.NaN, 10)).toBe("neutral");
  });

  it("has a matching status word (never colour alone)", () => {
    expect(marginStatusLabel(-0.1, 10)).toBe("Verlust");
    expect(marginStatusLabel(9.99, 10)).toBe("unter Ziel");
    expect(marginStatusLabel(10, 10)).toBe("Ziel erreicht");
    expect(marginStatusLabel(Number.NaN, 10)).toBe("");
  });
});

describe("strategy", () => {
  it("maps the economic status to tone and label", () => {
    expect(strategyTone("gesund")).toBe("success");
    expect(strategyTone("pruefen")).toBe("warning");
    expect(strategyTone("kritisch")).toBe("critical");
    expect(strategyLabel("gesund")).toBe("Wirtschaftlich");
    expect(strategyLabel("pruefen")).toBe("Prüfen");
    expect(strategyLabel("kritisch")).toBe("Unwirtschaftlich");
  });
});

describe("risk", () => {
  it("maps the risk level to tone and label", () => {
    expect(riskTone("niedrig")).toBe("success");
    expect(riskTone("mittel")).toBe("warning");
    expect(riskTone("hoch")).toBe("critical");
    expect(riskLabel("niedrig")).toBe("Geringes Risiko");
    expect(riskLabel("mittel")).toBe("Mittleres Risiko");
    expect(riskLabel("hoch")).toBe("Hohes Risiko");
  });
});

describe("severity", () => {
  it("maps warning severities", () => {
    expect(severityTone("critical")).toBe("critical");
    expect(severityTone("warning")).toBe("warning");
    expect(severityTone("info")).toBe("info");
    expect(severityLabel("critical")).toBe("Kritisch");
    expect(severityLabel("warning")).toBe("Warnung");
    expect(severityLabel("info")).toBe("Hinweis");
  });
});

describe("verdict", () => {
  it("maps Nachkalkulation verdicts", () => {
    expect(verdictTone("besser")).toBe("success");
    expect(verdictTone("im_plan")).toBe("success");
    expect(verdictTone("schlechter")).toBe("warning");
    expect(verdictLabel("besser")).toBe("Besser als geplant");
    expect(verdictLabel("im_plan")).toBe("Im Plan");
    expect(verdictLabel("schlechter")).toBe("Über Plan");
  });
});

describe("tone tables", () => {
  it("define classes and an icon for every tone", () => {
    for (const tone of TONES) {
      const c = TONE_CLASSES[tone];
      expect(c.text).toMatch(/^text-/);
      expect(c.soft).toContain("bg-");
      expect(c.border).toMatch(/^border-/);
      expect(TONE_ICON[tone]).toBeTruthy();
    }
  });

  it("uses only design tokens (no raw palette colours)", () => {
    const all = TONES.flatMap((t) => Object.values(TONE_CLASSES[t])).join(" ");
    expect(all).not.toMatch(/\b(?:text|bg|border)-(?:red|green|amber|yellow|blue|gray|slate|black|white)\b/);
  });

  it("picks the worst tone", () => {
    expect(worstTone([])).toBe("neutral");
    expect(worstTone(["success", "info"])).toBe("info");
    expect(worstTone(["warning", "critical", "success"])).toBe("critical");
  });
});
