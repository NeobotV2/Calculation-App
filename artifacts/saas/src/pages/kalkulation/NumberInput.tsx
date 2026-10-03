import { NumberInput as UiNumberInput, type NumberInputProps as UiNumberInputProps } from "@/components/ui/number-input";

export interface NumberInputProps
  extends Omit<UiNumberInputProps, "value" | "onValueChange" | "unit" | "min"> {
  value: number;
  /** Nur gültige Zahlen ≥ 0; ein geleertes Feld stellt den letzten Wert wieder her. */
  onChange: (v: number) => void;
  /** Einheit im Feld, z. B. „€/h", „%", „Tage". */
  suffix?: string;
}

/**
 * Dünner Adapter auf `ui/number-input` für den Verrechnungssatz-Rechner
 * (Dezimalkomma, Einheit im Feld, Übernahme während der Eingabe).
 */
export function NumberInput({ value, onChange, suffix, ...props }: NumberInputProps) {
  return (
    <UiNumberInput
      value={value}
      unit={suffix}
      min={0}
      onValueChange={(v) => {
        if (v !== undefined && Number.isFinite(v) && v >= 0) onChange(v);
      }}
      {...props}
    />
  );
}
