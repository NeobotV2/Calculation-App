import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Crown,
  FileStack,
  FileText,
  LifeBuoy,
  Landmark,
  ScrollText,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import { useStore } from "@/store/use-store";
import { isPaidPlan } from "@/lib/billing-config";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Badge } from "@/components/ui/badge";

interface MehrItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  meta?: string;
  badge?: string;
}

interface MehrGroup {
  id: string;
  title: string;
  items: MehrItem[];
}

function ItemIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground">
      <Icon aria-hidden="true" className="size-4" strokeWidth={2} />
    </span>
  );
}

/**
 * „Mehr" (§3.3): gruppierte Listen für alles, was nicht in der BottomNav liegt.
 * Datenexport und Farbschema liegen ausschließlich in den Einstellungen.
 */
export default function Mehr() {
  const plan = useStore((s) => s.plan);
  const paid = isPaidPlan(plan);

  const groups: MehrGroup[] = [
    {
      id: "arbeiten",
      title: "Arbeiten",
      items: [
        {
          id: "ausschreibung",
          label: "Ausschreibung",
          icon: Landmark,
          href: "/ausschreibung",
          meta: "Leistungsverzeichnis importieren, Bieterspanne berechnen",
        },
        { id: "vorlagen", label: "Vorlagen", icon: FileStack, href: "/vorlagen", meta: "Raumvorlagen verwalten" },
      ],
    },
    {
      id: "stammdaten",
      title: "Stammdaten",
      items: [
        {
          id: "verrechnungssatz",
          label: "Verrechnungssatz",
          icon: Calculator,
          href: "/verrechnungssatz",
          meta: "Lohn, Zuschläge, Gemeinkosten und Gewinnaufschlag",
        },
        {
          id: "einstellungen",
          label: "Einstellungen",
          icon: Settings,
          href: "/einstellungen",
          meta: "Firma, Kalkulation, Prüfregeln, Darstellung, Daten",
        },
      ],
    },
    {
      id: "konto",
      title: "Konto",
      items: [
        { id: "konto", label: "Profil & Konto", icon: UserRound, href: "/konto", meta: "Anmeldung, Plan, Daten" },
        paid
          ? { id: "upgrade", label: "Ihr Plan", icon: Crown, href: "/upgrade", meta: "Pro-Plan aktiv", badge: "Pro" }
          : {
              id: "upgrade",
              label: "Upgrade auf Pro",
              icon: Crown,
              href: "/upgrade",
              meta: "Alle Funktionen freischalten",
              badge: "Pro",
            },
      ],
    },
    {
      id: "support",
      title: "Support",
      items: [
        {
          id: "support",
          label: "Hilfe & Support",
          icon: LifeBuoy,
          href: "mailto:support@cleancalc.de",
          meta: "support@cleancalc.de",
        },
      ],
    },
    {
      id: "rechtliches",
      title: "Rechtliches",
      items: [
        { id: "impressum", label: "Impressum", icon: FileText, href: "/impressum" },
        { id: "datenschutz", label: "Datenschutz", icon: Shield, href: "/datenschutz" },
        { id: "agb", label: "AGB", icon: ScrollText, href: "/agb" },
      ],
    },
  ];

  return (
    <PageTransition>
      <PageShell header={<PageHeader title="Mehr" />} width="narrow">
        {groups.map((group) => (
          <Section key={group.id} id={`mehr-${group.id}`} title={group.title}>
            <Card padding="none">
              <ul className="divide-y divide-border">
                {group.items.map((item) => (
                  <ListRow
                    key={item.id}
                    as="li"
                    href={item.href}
                    leading={<ItemIcon icon={item.icon} />}
                    title={item.label}
                    meta={item.meta}
                    trailing={
                      item.badge ? (
                        <Badge tone="brand" size="sm">
                          {item.badge}
                        </Badge>
                      ) : undefined
                    }
                  />
                ))}
              </ul>
            </Card>
          </Section>
        ))}
      </PageShell>
    </PageTransition>
  );
}
