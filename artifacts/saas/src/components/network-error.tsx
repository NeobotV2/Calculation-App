import { RefreshCw } from "lucide-react";
import { StateView } from "@/components/ui/state-view";

interface NetworkErrorProps {
  message?: string;
  onRetry?: () => void;
}

/** Kompatibilitäts-Wrapper um `StateView kind="offline"`. */
export function NetworkError({
  message = "Verbindung fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
  onRetry,
}: NetworkErrorProps) {
  return (
    <StateView
      kind="offline"
      title="Keine Verbindung"
      description={message}
      action={onRetry ? { label: "Erneut versuchen", onClick: onRetry, icon: RefreshCw } : undefined}
    />
  );
}
