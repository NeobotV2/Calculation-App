import { Save, Undo2 } from "lucide-react";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { Button } from "@/components/ui/button";
import type { PageWidth } from "@/components/layout/PageContainer";

export interface SaveBarProps {
  /** Ungespeicherte Änderungen vorhanden (Leiste nur dann sichtbar). */
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Cloud-Modus ohne Verbindung: Speichern deaktiviert, Hinweis als Text und Tooltip. */
  offlineMessage?: string | null;
  width?: PageWidth;
}

/**
 * Eine gemeinsame Speichern-Leiste der Einstellungen (StickyActionBar, über
 * der BottomNav): „Ungespeicherte Änderungen" [Verwerfen] [Speichern].
 */
export function SaveBar({ dirty, saving, onSave, onDiscard, offlineMessage, width = "default" }: SaveBarProps) {
  if (!dirty && !saving) return null;
  const offline = !!offlineMessage;
  return (
    <StickyActionBar chrome="app" width={width} label="Ungespeicherte Änderungen">
      <div className="min-w-0 flex-1">
        <p role="status" className="truncate text-sm font-medium text-foreground">
          Ungespeicherte Änderungen
        </p>
        {offline && <p className="truncate text-xs text-warning">{offlineMessage}</p>}
      </div>
      <Button type="button" variant="secondary" onClick={onDiscard} disabled={saving}>
        <Undo2 aria-hidden="true" />
        Verwerfen
      </Button>
      <Button
        type="button"
        onClick={onSave}
        loading={saving}
        disabled={offline}
        title={offline ? (offlineMessage ?? undefined) : undefined}
      >
        <Save aria-hidden="true" />
        Speichern
      </Button>
    </StickyActionBar>
  );
}
