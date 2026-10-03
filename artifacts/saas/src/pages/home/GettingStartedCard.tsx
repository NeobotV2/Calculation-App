import { Circle, CircleCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface GettingStartedState {
  /** Firmenname (kein Platzhalter), Straße und Ort sind gepflegt. */
  companyComplete: boolean;
  /** Verrechnungssatz ist nicht mehr der unveränderte Standard (22,50 €). */
  rateChecked: boolean;
  /** Mindestens ein Objekt wurde kalkuliert. */
  hasCalculation: boolean;
}

interface Step {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export function getGettingStartedSteps(s: GettingStartedState): Step[] {
  return [
    {
      id: "firma",
      title: "Firmendaten ergänzen",
      description: "Name und Anschrift erscheinen im Briefkopf Ihrer Angebote.",
      href: "/einstellungen/firma",
      done: s.companyComplete,
    },
    {
      id: "satz",
      title: "Verrechnungssatz prüfen",
      description: "Berechnen Sie Ihren Satz aus Lohn, Zuschlägen und Gemeinkosten.",
      href: "/verrechnungssatz",
      done: s.rateChecked,
    },
    {
      id: "kalkulation",
      title: "Erste Kalkulation",
      description: "Kalkulieren Sie ein Objekt mit Räumen, Winterdienst oder Hausmeisterservice.",
      href: "/kalkulation/neu",
      done: s.hasCalculation,
    },
  ];
}

/** Checkliste „Erste Schritte" (§10); wird ausgeblendet, sobald alles erledigt ist. */
export function GettingStartedCard(props: GettingStartedState) {
  const steps = getGettingStartedSteps(props);
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Card padding="none" as="section" aria-labelledby="getting-started-title">
      <CardHeader
        title={<span id="getting-started-title">Erste Schritte</span>}
        titleAs="h2"
        description="In drei Schritten zu Ihrem ersten Angebot."
        action={
          <Badge tone="brand" size="sm" className="tabular-nums">
            {doneCount} von {steps.length} erledigt
          </Badge>
        }
      />
      <ol className="divide-y divide-border">
        {steps.map((step) => {
          const Icon = step.done ? CircleCheck : Circle;
          return (
            <ListRow
              key={step.id}
              as="li"
              href={step.href}
              leading={
                <Icon
                  aria-hidden="true"
                  className={cn("size-5", step.done ? "text-success" : "text-muted-foreground")}
                  strokeWidth={2}
                />
              }
              title={
                <>
                  <span className={cn(step.done && "text-muted-foreground line-through")}>{step.title}</span>
                  <span className="sr-only">{step.done ? " (erledigt)" : " (offen)"}</span>
                </>
              }
              meta={step.done ? "Erledigt" : step.description}
            />
          );
        })}
      </ol>
    </Card>
  );
}
