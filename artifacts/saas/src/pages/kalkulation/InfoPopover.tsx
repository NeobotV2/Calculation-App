import { InfoHint } from "@/components/ui/info-hint";

/** Erläuterung hinter einem „i"-Button (Wrapper auf `InfoHint`). */
export function InfoPopover({ text, label = "Erläuterung" }: { text: string; label?: string }) {
  return (
    <InfoHint label={label} align="end">
      <p className="text-sm text-muted-foreground">{text}</p>
    </InfoHint>
  );
}
