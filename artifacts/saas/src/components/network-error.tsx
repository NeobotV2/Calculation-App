import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NetworkErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function NetworkError({
  message = "Verbindung fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.",
  onRetry,
}: NetworkErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <WifiOff size={28} className="text-destructive" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">Keine Verbindung</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw size={16} /> Erneut versuchen
        </Button>
      )}
    </div>
  );
}
