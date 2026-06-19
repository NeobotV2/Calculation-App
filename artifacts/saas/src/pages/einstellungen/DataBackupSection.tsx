import type { RefObject } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataBackupSectionProps {
  isAuthenticated: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onExport: () => void;
  onImport: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestReset: () => void;
}

/** Data export/import and reset-to-defaults (danger zone). */
export function DataBackupSection({
  isAuthenticated,
  fileInputRef,
  onExport,
  onImport,
  onFileChange,
  onRequestReset,
}: DataBackupSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
        <Download size={16} /> Daten & Sicherung
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
        <Button variant="outline" onClick={onExport} className="w-full justify-start h-12 text-sm bg-background">
          <Download size={16} className="mr-3 text-muted-foreground" /> Alle Daten exportieren (JSON)
        </Button>
        {!isAuthenticated && (
          <Button variant="outline" onClick={onImport} className="w-full justify-start h-12 text-sm bg-background">
            <Upload size={16} className="mr-3 text-muted-foreground" /> Daten importieren (JSON)
          </Button>
        )}
        <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={onFileChange} className="hidden" />
        <Button variant="outline" onClick={onRequestReset} className="w-full justify-start h-12 text-sm bg-background border-warning/30 text-warning hover:bg-warning/10">
          <RotateCcw size={16} className="mr-3" /> Einstellungen zurücksetzen
        </Button>
      </div>
    </section>
  );
}
