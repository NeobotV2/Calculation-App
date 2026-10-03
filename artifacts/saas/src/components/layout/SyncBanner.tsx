import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";

/** Text des Offline-Hinweises; auch als Tooltip für deaktivierte Speichern-Buttons (§11). */
export const OFFLINE_MESSAGE =
  "Offline – Änderungen können erst wieder gespeichert werden, wenn eine Verbindung besteht.";

function readOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/** `navigator.onLine` mit online/offline-Listenern. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(readOnline);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setOnline(readOnline());
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/**
 * `true`, wenn im Cloud-Modus keine Verbindung besteht (Speichern unmöglich).
 * Im Demo-/Lokalmodus immer `false`.
 */
export function useCloudOffline(): boolean {
  const { isAuthenticated } = useAuth();
  const online = useOnlineStatus();
  return isAuthenticated && !online;
}

/**
 * Dauerhafter Sync-Hinweis unter dem Seitenanfang (AppShell):
 * Ladefehler (critical, mit [Erneut versuchen]) und Offline (warning, nur Cloud).
 */
export function SyncBanner() {
  const { status, error, hasLoadedOnce, reload } = useSyncStatus();
  const offline = useCloudOffline();
  // Während eines manuellen Neuladens bleibt der Hinweis (mit Spinner) stehen.
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (status !== "loading") setRetrying(false);
  }, [status]);

  const showError = status === "error" || (retrying && status === "loading");
  if (!showError && !offline) return null;

  return (
    <PageContainer width="wide" className="no-print pt-[calc(var(--safe-top)+0.75rem)]">
      {offline ? (
        <Callout tone="warning" icon={WifiOff} live>
          {OFFLINE_MESSAGE}
        </Callout>
      ) : (
        <Callout
          tone="critical"
          live
          title={error || "Daten konnten nicht geladen werden."}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={status === "loading"}
              onClick={() => {
                setRetrying(true);
                reload();
              }}
            >
              {status !== "loading" && <RefreshCw aria-hidden="true" />}
              Erneut versuchen
            </Button>
          }
        >
          {hasLoadedOnce
            ? "Es werden die zuletzt geladenen Daten angezeigt."
            : "Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."}
        </Callout>
      )}
    </PageContainer>
  );
}
