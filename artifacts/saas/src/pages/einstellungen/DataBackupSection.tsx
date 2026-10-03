import { useRef } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardHeader } from "@/components/ui/card";

interface DataBackupSectionProps {
  isAuthenticated: boolean;
  onExport: () => void;
  /** Gewählte JSON-Datei einlesen (nur Demo-/Lokalmodus). */
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestReset: () => void;
}

/** Einziger Ort für JSON-Export/-Import und das Zurücksetzen der Einstellungen. */
export function DataBackupSection({ isAuthenticated, onExport, onFileChange, onRequestReset }: DataBackupSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Card as="section" aria-labelledby="settings-backup-title">
        <CardHeader
          title={<span id="settings-backup-title">Datensicherung</span>}
          description="Sichern Sie Objekte, Vorlagen und Einstellungen als JSON-Datei."
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onExport}>
            <Download aria-hidden="true" />
            Alle Daten exportieren (JSON)
          </Button>
          {!isAuthenticated && (
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload aria-hidden="true" />
              Daten importieren (JSON)
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          className="sr-only"
          tabIndex={-1}
          aria-label="JSON-Datei für den Import auswählen"
        />
        {isAuthenticated && (
          <Callout tone="neutral" className="mt-4">
            Im Cloud-Modus werden Ihre Daten automatisch gespeichert. Ein Import ist hier nicht verfügbar.
          </Callout>
        )}
      </Card>

      <Card as="section" tone="critical" aria-labelledby="settings-reset-title">
        <CardHeader
          title={<span id="settings-reset-title">Einstellungen zurücksetzen</span>}
          description="Setzt Firmendaten, Verrechnungssatz, MwSt., Turnus, Angebots-Layout und eigene Raumarten auf Standard. Objekte und Vorlagen bleiben erhalten."
        />
        <Button type="button" variant="secondary" onClick={onRequestReset}>
          <RotateCcw aria-hidden="true" />
          Einstellungen zurücksetzen
        </Button>
      </Card>
    </>
  );
}
