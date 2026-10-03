import { useEffect } from "react";
import { useLocation } from "wouter";
import { CircleCheck, Crown, Lock, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type UpgradeTrigger, UPGRADE_TRIGGER_COPY, getPlanLimits } from "@/lib/billing-config";
import { trackPaywallViewed, trackPaywallDismissed, trackUpgradeCtaClicked } from "@/services/analytics-service";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
  triggerReason?: UpgradeTrigger;
}

type Cell = string | boolean;

const FREE = getPlanLimits("free");

const COMPARISON: { label: string; basic: Cell; pro: Cell }[] = [
  { label: "Objekte", basic: String(FREE.maxObjects), pro: "Unbegrenzt" },
  { label: "Räume pro Objekt", basic: String(FREE.maxRoomsPerProject), pro: "Unbegrenzt" },
  { label: "PDF-Angebote", basic: false, pro: true },
  { label: "Vorlagen speichern", basic: false, pro: true },
  { label: "Eigene Leistungswerte", basic: false, pro: true },
  { label: "Firmenlogo & Branding", basic: false, pro: true },
];

function ComparisonCell({ value, highlight }: { value: Cell; highlight?: boolean }) {
  if (typeof value === "string") {
    return <span className={highlight ? "font-medium text-primary" : "text-muted-foreground"}>{value}</span>;
  }
  return value ? (
    <>
      <CircleCheck aria-hidden="true" className={`mx-auto size-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <span className="sr-only">Enthalten</span>
    </>
  ) : (
    <>
      <Minus aria-hidden="true" className="mx-auto size-4 text-muted-foreground" />
      <span className="sr-only">Nicht enthalten</span>
    </>
  );
}

/**
 * Hinweis auf eine Pro-Funktion (Plan-Gate). API unverändert; jetzt ein
 * zugänglicher Dialog (Fokusfalle, Escape, „Schließen").
 */
export function UpgradeModal({ open, onClose, reason, triggerReason }: UpgradeModalProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (open) {
      trackPaywallViewed(triggerReason || "general");
    }
  }, [open, triggerReason]);

  const handleClose = () => {
    trackPaywallDismissed(triggerReason);
    onClose();
  };

  const handleUpgrade = () => {
    trackUpgradeCtaClicked("paywall_modal");
    onClose();
    setLocation("/upgrade");
  };

  const triggerCopy = triggerReason ? UPGRADE_TRIGGER_COPY[triggerReason] : null;
  const displayReason = triggerCopy?.text || reason;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Crown aria-hidden="true" className="size-5" />
          </div>
          <DialogTitle>{triggerCopy?.headline || "Funktion im Pro-Plan verfügbar"}</DialogTitle>
          {displayReason ? (
            <DialogDescription className="flex items-start gap-2">
              <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{displayReason}</span>
            </DialogDescription>
          ) : (
            <DialogDescription>Mit dem Pro-Plan nutzen Sie alle Funktionen ohne Einschränkungen.</DialogDescription>
          )}
        </DialogHeader>

        <table className="w-full text-sm">
          <caption className="mb-2 text-left text-overline uppercase text-muted-foreground">
            Basic und Pro im Vergleich
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 text-left font-medium text-muted-foreground">
                <span className="sr-only">Funktion</span>
              </th>
              <th scope="col" className="w-24 py-2 text-center text-xs font-semibold text-muted-foreground">
                Basic
              </th>
              <th scope="col" className="w-24 py-2 text-center text-xs font-semibold text-primary">
                Pro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {COMPARISON.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="py-2 text-left font-normal text-foreground">
                  {row.label}
                </th>
                <td className="py-2 text-center text-xs">
                  <ComparisonCell value={row.basic} />
                </td>
                <td className="py-2 text-center text-xs">
                  <ComparisonCell value={row.pro} highlight />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Nicht jetzt
          </Button>
          <Button type="button" onClick={handleUpgrade}>
            <Crown aria-hidden="true" />
            Pro-Plan ansehen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
