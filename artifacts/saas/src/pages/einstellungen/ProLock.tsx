import { Lock } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";

interface ProLockProps {
  title: string;
  description: string;
  /** Optional statt des Links zu /upgrade (z. B. UpgradeModal). */
  onUpgrade?: () => void;
}

/** Hinweis über Pro-Funktionen in den Einstellungen (Callout mit „Pro"-Badge). */
export function ProLock({ title, description, onUpgrade }: ProLockProps) {
  return (
    <Callout
      tone="info"
      icon={Lock}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {title}
          <Badge tone="brand" size="sm">
            Pro
          </Badge>
        </span>
      }
      action={
        onUpgrade ? (
          <Button type="button" variant="secondary" size="sm" onClick={onUpgrade}>
            Pro-Plan ansehen
          </Button>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link href="/upgrade">Pro-Plan ansehen</Link>
          </Button>
        )
      }
    >
      <p className="text-muted-foreground">{description}</p>
    </Callout>
  );
}
