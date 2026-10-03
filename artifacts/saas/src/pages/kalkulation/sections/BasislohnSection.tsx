import { Euro } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Money } from "@/components/ui/money";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { HourlyRateConfig, EmploymentType } from "@/lib/hourly-rate-calc";
import { Section } from "../Section";
import { NumberInput } from "../NumberInput";
import { EMPLOYMENT_LABELS } from "../constants";

const EMPLOYMENT_TYPES: EmploymentType[] = ["minijob", "teilzeit", "vollzeit"];

export function BasislohnSection({
  config,
  open,
  onToggle,
  updateConfig,
}: {
  config: HourlyRateConfig;
  open: boolean;
  onToggle: () => void;
  updateConfig: (patch: Partial<HourlyRateConfig>) => void;
}) {
  return (
    <Section
      title="Basislohn"
      icon={Euro}
      open={open}
      onToggle={onToggle}
      badge={<Money value={config.baseLohn} size="sm" period="hour" />}
      tooltip="Der tarifliche oder vereinbarte Bruttostundenlohn Ihrer Reinigungskräfte. Grundlage für alle weiteren Berechnungen."
    >
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-label text-muted-foreground">Beschäftigungsart</legend>
        <ToggleGroup
          type="single"
          variant="chip"
          value={config.employmentType}
          onValueChange={(v) => {
            if (v) updateConfig({ employmentType: v as EmploymentType });
          }}
          aria-label="Beschäftigungsart"
        >
          {EMPLOYMENT_TYPES.map((type) => (
            <ToggleGroupItem key={type} value={type}>
              {EMPLOYMENT_LABELS[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {config.employmentType === "minijob" && (
          <p className="text-xs text-muted-foreground">Minijob-Grenze 2026: max. 603 € pro Monat</p>
        )}
      </fieldset>
      <FormField id="rate-base-lohn" label="Brutto-Stundenlohn (Tariflohn LG 1 ab 01/2026)">
        <NumberInput value={config.baseLohn} onChange={(v) => updateConfig({ baseLohn: v })} suffix="€/h" decimals={2} />
      </FormField>
    </Section>
  );
}
