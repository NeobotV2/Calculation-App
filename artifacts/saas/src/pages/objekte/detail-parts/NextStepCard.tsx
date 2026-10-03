import { Link } from "wouter";
import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NextStep } from "@/lib/offer-readiness";
import { cn } from "@/lib/utils";

export interface NextStepCardProps {
  step: NextStep;
  /** Für `action.kind === "offer"` (z. B. `useOfferAction().trigger`). */
  onOffer: () => void;
  /** Überschriften-Ebene des Titels (Standard h3). */
  titleAs?: "h2" | "h3";
  className?: string;
}

/** „Nächster Schritt“ aus `getNextStep` – eine klare Handlung mit Begründung. */
export function NextStepCard({ step, onOffer, titleAs: Title = "h3", className }: NextStepCardProps) {
  const isOffer = step.action.kind === "offer";
  return (
    <Card tone="brand" padding="sm" className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <p className="text-overline uppercase text-muted-foreground">Nächster Schritt</p>
        <Title className="text-h3 text-foreground">{step.label}</Title>
        {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
      </div>
      {step.action.kind === "href" ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={step.action.href}>
            {step.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button type="button" variant={isOffer ? "primary" : "secondary"} size="sm" onClick={onOffer}>
          <FileText aria-hidden="true" />
          {step.label}
        </Button>
      )}
    </Card>
  );
}
