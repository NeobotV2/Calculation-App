import * as React from "react";
import { cn, parseDecimal } from "@/lib/utils";
import { inputVariants, type InputSize } from "@/components/ui/input";

export interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "size" | "inputMode"
  > {
  value: number | undefined;
  /** Gültige Zahl (während der Eingabe) bzw. `undefined` für ein geleertes Feld (beim Verlassen). */
  onValueChange: (value: number | undefined) => void;
  /** Einheit im Feld rechts, z. B. "€", "m²", "%", "Min.". */
  unit?: string;
  /** Maximale Nachkommastellen (Anzeige und Rundung beim Verlassen). */
  decimals?: number;
  /**
   * „1.200“ als Tausendergruppierung lesen. Standard: nur bei `decimals` < 3
   * (Beträge, Flächen, Anzahlen). Längen (m, lfm) setzen `false`: Ein Punkt
   * ist dort immer Dezimaltrennzeichen („4.375“ vom Laser-Messgerät = 4,375).
   */
  thousandsDot?: boolean;
  min?: number;
  max?: number;
  inputSize?: InputSize;
  /** Standard: rechtsbündig. */
  align?: "start" | "end";
  /** Klassen für den äußeren Wrapper. */
  wrapperClassName?: string;
}

function toText(value: number | undefined, decimals?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return value.toLocaleString("de-DE", {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals ?? 4,
  });
}

/**
 * Eingabetext lesen wie das Feld: „1.200“ ist eine Tausendergruppierung nur
 * mit `thousandsDot` (Standard: bei `decimals` < 3); sonst ist ein einzelner
 * Punkt das Dezimaltrennzeichen (Längen: „4.375“ = 4,375).
 */
export function readNumberInput(raw: string, opts: { decimals?: number; thousandsDot?: boolean } = {}): number | undefined {
  const groupDots = opts.thousandsDot ?? (opts.decimals !== undefined && opts.decimals < 3);
  return parseDecimal(raw, { thousandsDot: groupDots });
}

function roundTo(value: number, decimals?: number): number {
  if (decimals === undefined) return value;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Zahlenfeld mit Dezimalkomma: `inputMode="decimal"`, rechtsbündig,
 * Einheit im Feld. Gültige Eingaben werden sofort übernommen; beim Verlassen
 * wird gerundet, auf min/max begrenzt bzw. bei ungültiger Eingabe der letzte
 * Wert wiederhergestellt.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      unit,
      decimals,
      thousandsDot,
      min,
      max,
      inputSize,
      align = "end",
      className,
      wrapperClassName,
      onFocus,
      onBlur,
      onKeyDown,
      id,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const [text, setText] = React.useState(() => toText(value, decimals));
    const [focused, setFocused] = React.useState(false);
    const unitId = React.useId();

    // Externe Änderungen übernehmen, solange nicht editiert wird.
    React.useEffect(() => {
      if (!focused) setText(toText(value, decimals));
    }, [value, decimals, focused]);

    const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max);
    const parse = (raw: string) => readNumberInput(raw, { decimals, thousandsDot });

    const commit = () => {
      const trimmed = text.trim();
      if (trimmed === "") {
        if (value !== undefined) onValueChange(undefined);
        setText("");
        return;
      }
      const parsed = parse(trimmed);
      if (parsed === undefined) {
        setText(toText(value, decimals));
        return;
      }
      let next = roundTo(parsed, decimals);
      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;
      if (next !== value) onValueChange(next);
      setText(toText(next, decimals));
    };

    const describedBy = [ariaDescribedBy, unit ? unitId : undefined].filter(Boolean).join(" ") || undefined;

    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={text}
          aria-describedby={describedBy}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const parsed = parse(raw);
            if (parsed !== undefined && inRange(parsed) && parsed !== value) onValueChange(parsed);
          }}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            commit();
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            onKeyDown?.(e);
          }}
          className={cn(inputVariants({ inputSize, align }), className)}
          style={unit ? { paddingRight: `calc(1.25rem + ${unit.length}ch)` } : undefined}
          {...props}
        />
        {unit && (
          <span
            id={unitId}
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {unit}
          </span>
        )}
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";
