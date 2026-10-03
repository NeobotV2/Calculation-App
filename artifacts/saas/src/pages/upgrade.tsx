import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Building2, CircleCheck, Clock, Crown, FileText, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useStore } from "@/store/use-store";
import { PRICING, formatCents, getPlanLimits, isPaidPlan, type PlanId } from "@/lib/billing-config";
import {
  isFoundingOfferAvailable,
  getFoundingOfferRemainingSlots,
  getFoundingOfferMaxSlots,
} from "@/services/founding-offer-service";
import { trackUpgradePageViewed, trackSubscriptionStarted, trackFoundingOfferViewed } from "@/services/analytics-service";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateView } from "@/components/ui/state-view";
import { ConfirmDialog } from "@/components/confirm-dialog";

type PaidPlanKey = Extract<PlanId, "pro_monthly" | "pro_annual" | "founding_annual">;

const BENEFITS = [
  { icon: Building2, text: "Unbegrenzt Objekte und Räume kalkulieren" },
  { icon: FileText, text: "Druckfertige PDF-Angebote für Ihre Auftraggeber" },
  { icon: Sparkles, text: "Vorlagen speichern und wiederverwenden" },
  { icon: Clock, text: "Keine Marge durch Kalkulationsfehler verlieren" },
  { icon: Star, text: "Eigenes Firmenbranding: Logo, Kopf- und Fußzeile" },
];

interface PlanOption {
  key: PaidPlanKey;
  name: string;
  description: string;
  monthly: string;
  detail: string;
  saving?: string;
  extra?: string;
}

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const plan = useStore((s) => s.plan);
  const upgradePlan = useStore((s) => s.upgradePlan);
  const [pending, setPending] = useState<PlanOption | null>(null);

  const foundingAvailable = isFoundingOfferAvailable();
  const remainingSlots = getFoundingOfferRemainingSlots();
  const maxSlots = getFoundingOfferMaxSlots();
  const paid = isPaidPlan(plan);
  const freeLimits = getPlanLimits("free");

  useEffect(() => {
    if (!isPaidPlan(plan)) {
      trackUpgradePageViewed();
      if (foundingAvailable) trackFoundingOfferViewed();
    }
    // Nur beim Öffnen der Seite (Analytics unverändert).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (paid) {
    return (
      <PageTransition>
        <PageShell width="narrow" header={<PageHeader title="Pro-Plan" back={{ href: "/konto", label: "Profil & Konto" }} width="narrow" />}>
          <StateView
            kind="empty"
            icon={Crown}
            title="Pro-Plan aktiv"
            description="Sie haben vollen Zugang zu allen Pro-Funktionen. Viel Erfolg mit Ihren Kalkulationen!"
            action={{ label: "Zur Startseite", href: "/" }}
          />
        </PageShell>
      </PageTransition>
    );
  }

  const options: PlanOption[] = [
    ...(foundingAvailable
      ? [
          {
            key: "founding_annual" as const,
            name: "Gründer-Tarif",
            description: `Exklusiv für die ersten ${maxSlots} Nutzer`,
            monthly: formatCents(PRICING.foundingAnnual.effectiveMonthlyFromAnnualCents),
            detail: `${formatCents(PRICING.foundingAnnual.annualPriceCents)} / Jahr · danach regulär ${formatCents(PRICING.proAnnual.annualPriceCents)} / Jahr`,
            saving: `${Math.round((1 - PRICING.foundingAnnual.annualPriceCents / PRICING.proAnnual.annualPriceCents) * 100)} % sparen`,
            extra: `Noch ${remainingSlots} von ${maxSlots} Plätzen verfügbar`,
          },
        ]
      : []),
    {
      key: "pro_annual",
      name: "Pro Jährlich",
      description: "Jährliche Abrechnung",
      monthly: formatCents(PRICING.proAnnual.effectiveMonthlyFromAnnualCents),
      detail: `${formatCents(PRICING.proAnnual.annualPriceCents)} / Jahr`,
      saving: foundingAvailable
        ? undefined
        : `${Math.round((1 - PRICING.proAnnual.annualPriceCents / (PRICING.proMonthly.monthlyPriceCents * 12)) * 100)} % sparen gegenüber monatlich`,
    },
    {
      key: "pro_monthly",
      name: "Pro Monatlich",
      description: "Monatlich kündbar, keine Mindestlaufzeit",
      monthly: formatCents(PRICING.proMonthly.monthlyPriceCents),
      detail: "Monatliche Abrechnung",
    },
  ];
  const recommended: PaidPlanKey = foundingAvailable ? "founding_annual" : "pro_annual";
  const recommendedOption = options.find((o) => o.key === recommended) ?? options[0];

  const confirmPlan = (option: PlanOption) => {
    trackSubscriptionStarted(option.key, plan);
    upgradePlan(option.key);
    toast.success("Pro-Plan aktiviert – Sie können jetzt ohne Einschränkungen kalkulieren.");
    setLocation("/");
  };

  return (
    <PageTransition>
      <PageShell
        width="narrow"
        header={
          <PageHeader
            title="Kalkulieren ohne Kompromisse"
            subtitle="Vollständige Angebote, exakte Margen, professionelle Dokumente – alles in einer App."
            back={{ href: "/konto", label: "Profil & Konto" }}
            width="narrow"
          />
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm font-medium text-foreground">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <Section title="Pläne">
          <ul className="space-y-4">
            <li>
              <Card as="article" aria-label="Basic">
                <CardHeader
                  title="Basic"
                  description={`Kostenlos – ${freeLimits.maxObjects === 1 ? "ein Objekt" : `${freeLimits.maxObjects} Objekte`} mit bis zu ${freeLimits.maxRoomsPerProject} Räumen, Angebotsvorschau`}
                  action={
                    <Badge tone="neutral" size="sm">
                      <CircleCheck aria-hidden="true" />
                      Aktueller Plan
                    </Badge>
                  }
                />
              </Card>
            </li>
            {options.map((o) => {
              const isRecommended = o.key === recommended;
              return (
                <li key={o.key}>
                  <Card as="article" tone={isRecommended ? "brand" : "default"} aria-label={o.name}>
                    <CardHeader
                      title={o.name}
                      description={o.description}
                      action={
                        isRecommended ? (
                          <Badge tone="brand" size="sm">
                            <Star aria-hidden="true" />
                            Empfohlen
                          </Badge>
                        ) : undefined
                      }
                    />
                    <p className="flex items-baseline gap-1">
                      <span className="text-money tabular-nums text-foreground">{o.monthly}</span>
                      <span className="text-sm text-muted-foreground">/ Monat</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{o.detail}</p>
                    {(o.extra || o.saving) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {o.extra && (
                          <Badge tone="brand" size="sm">
                            {o.extra}
                          </Badge>
                        )}
                        {o.saving && (
                          <Badge tone="success" size="sm">
                            {o.saving}
                          </Badge>
                        )}
                      </div>
                    )}
                    <CardFooter>
                      <Button
                        type="button"
                        variant={isRecommended ? "primary" : "secondary"}
                        onClick={() => setPending(o)}
                      >
                        {o.name} wählen
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              );
            })}
          </ul>
        </Section>

        <div className="space-y-3">
          <Button type="button" size="lg" className="w-full" onClick={() => setPending(recommendedOption)}>
            <Crown aria-hidden="true" />
            Jetzt Pro freischalten
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Sichere Zahlung. Jederzeit kündbar.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Es gelten unsere AGB und Datenschutzbestimmungen. Abonnements verlängern sich automatisch.
          </p>
        </div>
      </PageShell>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) confirmPlan(pending);
        }}
        title={pending ? `${pending.name} aktivieren?` : "Plan aktivieren?"}
        description={
          pending
            ? `${pending.monthly} / Monat (${pending.detail}). Der Pro-Plan wird sofort freigeschaltet.`
            : ""
        }
        confirmLabel="Aktivieren"
      />
    </PageTransition>
  );
}
