import { Home } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { StateView } from "@/components/ui/state-view";

export default function NotFound() {
  return (
    <PageTransition>
      <PageShell width="narrow" bodyClassName="pt-[calc(var(--safe-top)+2rem)]">
        <StateView
          kind="not-found"
          titleAs="h1"
          title="Seite nicht gefunden"
          description="Die angeforderte Seite existiert nicht oder wurde verschoben."
          action={{ label: "Zur Startseite", href: "/", icon: Home }}
        />
      </PageShell>
    </PageTransition>
  );
}
