import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

export interface ArchivedBannerProps {
  /** Stellt das Objekt wieder her (Fehler zeigt der Aufrufer, z. B. per Toast). */
  onRestore: () => Promise<void> | void;
  className?: string;
}

/** Hinweis für archivierte Objekte (§8.6): schreibgeschützt, mit [Wiederherstellen]. */
export function ArchivedBanner({ onRestore, className }: ArchivedBannerProps) {
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      await onRestore();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Callout
      tone="neutral"
      icon={Archive}
      className={className}
      action={
        <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => void restore()}>
          <ArchiveRestore aria-hidden="true" />
          Wiederherstellen
        </Button>
      }
    >
      Archiviert – dieses Objekt ist schreibgeschützt.
    </Callout>
  );
}
