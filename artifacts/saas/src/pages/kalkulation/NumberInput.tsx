import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function NumberInput({
  value,
  onChange,
  suffix,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  className?: string;
}) {
  const [raw, setRaw] = useState(value.toString().replace(".", ","));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setRaw(value.toString().replace(".", ","));
    }
  }, [value, focused]);

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(raw.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setRaw(value.toString().replace(".", ","));
    }
  };

  return (
    <div className="relative">
      <Input
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        inputMode="decimal"
        className={cn("bg-background border-border/50 h-11 pr-12", className)}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
