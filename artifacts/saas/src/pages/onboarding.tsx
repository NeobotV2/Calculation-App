import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, CirclePlay, Cloud, Smartphone, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { FormField } from "@/components/ui/form-field";
import { PageTransition } from "@/components/layout/PageTransition";
import { consumeIntendedPath } from "@/components/layout/nav-config";
import { useStore } from "@/store/use-store";
import { DEFAULT_COMPANY_NAME } from "@/lib/offer-readiness";
import { cn } from "@/lib/utils";
import { trackOnboardingStarted, trackOnboardingCompleted, trackOnboardingSkipped } from "@/services/analytics-service";

const ROLES = ["Inhaber / GF", "Vertrieb", "Objektleitung", "Kalkulation"];
const TOTAL_STEPS = 5;
const DEFAULT_RATE = 22.5;

/** Große Auswahlkachel (Rolle, Startart, Account). */
function ChoiceButton({
  icon: Icon,
  title,
  description,
  selected,
  emphasis = false,
  onClick,
}: {
  icon: typeof Building2;
  title: string;
  description?: string;
  selected?: boolean;
  emphasis?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:min-h-16",
        selected || emphasis
          ? "border-primary/50 bg-primary-soft hover:bg-primary-soft"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          selected || emphasis ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-h3 text-foreground">{title}</span>
        {description && <span className="mt-1 block text-sm text-muted-foreground">{description}</span>}
      </span>
    </button>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | undefined>(DEFAULT_RATE);
  const [wantsAccount, setWantsAccount] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  // Fokus auf die Schritt-Überschrift (Screenreader/Tastatur), nicht beim ersten Schritt.
  useEffect(() => {
    if (step > 1) headingRef.current?.focus();
  }, [step]);

  const rate = hourlyRate !== undefined && hourlyRate > 0 ? hourlyRate : DEFAULT_RATE;

  const finish = (loadDemo: boolean, target: string) => {
    trackOnboardingCompleted(loadDemo);
    completeOnboarding({
      role: role || "Benutzer",
      companyName: companyName.trim() || DEFAULT_COMPANY_NAME,
      hourlyRate: rate,
      loadDemo,
    });
    if (wantsAccount) {
      setLocation("/register");
      return;
    }
    // „/" setzt einen gemerkten Deep-Link fort (AuthGuard); eine bewusste
    // Startwahl („Leer starten") hat Vorrang und verwirft ihn.
    if (target !== "/") consumeIntendedPath();
    setLocation(target);
  };

  const handleSkip = () => {
    trackOnboardingSkipped();
    // Überspringen lädt KEINE Beispieldaten.
    completeOnboarding({
      role: role || "Benutzer",
      companyName: companyName.trim() || DEFAULT_COMPANY_NAME,
      hourlyRate: rate,
      loadDemo: false,
    });
    setLocation("/");
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submitCompany = () => {
    if (!companyName.trim()) {
      setCompanyError("Bitte geben Sie Ihren Firmennamen ein.");
      return;
    }
    next();
  };

  const headingClass = "text-h1 text-foreground outline-none";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+1.5rem)]">
        <div className="mb-8 flex items-center gap-3">
          {step > 1 ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={back} aria-label="Zurück">
              <ArrowLeft aria-hidden="true" />
            </Button>
          ) : (
            <span className="size-8 pointer-coarse:size-10" aria-hidden="true" />
          )}
          <div
            role="progressbar"
            aria-label="Fortschritt der Einrichtung"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={step}
            aria-valuetext={`Schritt ${step} von ${TOTAL_STEPS}`}
            className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          {step < TOTAL_STEPS ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
              Überspringen
            </Button>
          ) : (
            <span className="w-24" aria-hidden="true" />
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <PageTransition key="step1" className="flex flex-1 flex-col justify-center">
              <div className="mb-10 text-center">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Sparkles aria-hidden="true" className="size-8" />
                </div>
                <h1 className={headingClass}>
                  Willkommen bei CleanCalc <span className="text-primary">Pro</span>
                </h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Die Kalkulationslösung für Gebäudereiniger. Kalkulieren Sie Ihr erstes Objekt kostenlos – mit
                  Unterhaltsreinigung, Winterdienst und Hausmeisterservice.
                </p>
              </div>
              <Button type="button" size="lg" className="w-full" onClick={next}>
                Los geht’s
                <ArrowRight aria-hidden="true" />
              </Button>
            </PageTransition>
          )}

          {step === 2 && (
            <PageTransition key="step2" className="flex flex-1 flex-col">
              <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
                Wie ist Ihre Rolle?
              </h1>
              <p className="mb-6 mt-2 text-base text-muted-foreground">Das hilft uns, die App für Sie anzupassen.</p>
              <div className="space-y-3" role="group" aria-label="Rolle">
                {ROLES.map((r) => (
                  <ChoiceButton
                    key={r}
                    icon={UserRound}
                    title={r}
                    selected={role === r}
                    onClick={() => {
                      setRole(r);
                      next();
                    }}
                  />
                ))}
              </div>
            </PageTransition>
          )}

          {step === 3 && (
            <PageTransition key="step3" className="flex flex-1 flex-col">
              <form
                className="flex flex-1 flex-col"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCompany();
                }}
              >
                <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
                  Firma und Verrechnungssatz
                </h1>
                <p className="mb-6 mt-2 text-base text-muted-foreground">Diese Angaben können Sie jederzeit ändern.</p>
                <div className="flex-1 space-y-5">
                  <FormField id="onboarding-company" label="Firmenname" required error={companyError}>
                    <Input
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        if (companyError) setCompanyError(null);
                      }}
                      placeholder="z. B. Glanz & Rein GmbH"
                      autoComplete="organization"
                      inputSize="lg"
                    />
                  </FormField>
                  <FormField
                    id="onboarding-rate"
                    label="Verrechnungssatz"
                    hint="Netto je Stunde. Den genauen Satz berechnen Sie später im Verrechnungssatz-Rechner."
                  >
                    <NumberInput
                      value={hourlyRate}
                      onValueChange={setHourlyRate}
                      unit="€/h"
                      decimals={2}
                      min={0}
                      inputSize="lg"
                      placeholder="22,50"
                    />
                  </FormField>
                </div>
                <Button type="submit" size="lg" className="mt-8 w-full">
                  Weiter
                  <ArrowRight aria-hidden="true" />
                </Button>
              </form>
            </PageTransition>
          )}

          {step === 4 && (
            <PageTransition key="step4" className="flex flex-1 flex-col justify-center">
              <h1 ref={headingRef} tabIndex={-1} className={cn(headingClass, "text-center")}>
                Account erstellen?
              </h1>
              <p className="mb-8 mt-3 text-center text-base text-muted-foreground">
                Sichern Sie Ihre Daten in der Cloud. Sie können die App auch zuerst ohne Account testen.
              </p>
              <div className="space-y-3">
                <ChoiceButton
                  icon={Cloud}
                  title="Account erstellen"
                  description="Daten sicher in der Cloud, auf allen Geräten"
                  emphasis
                  onClick={() => {
                    setWantsAccount(true);
                    next();
                  }}
                />
                <ChoiceButton
                  icon={Smartphone}
                  title="Erst ohne Account testen"
                  description="Daten bleiben lokal auf diesem Gerät"
                  onClick={() => {
                    setWantsAccount(false);
                    next();
                  }}
                />
              </div>
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Im Basic-Plan kalkulieren Sie ein Objekt kostenlos. Für unbegrenzte Objekte und PDF-Export steht der
                Pro-Plan bereit.
              </p>
            </PageTransition>
          )}

          {step === 5 && (
            <PageTransition key="step5" className="flex flex-1 flex-col justify-center">
              <h1 ref={headingRef} tabIndex={-1} className={cn(headingClass, "text-center")}>
                Wie möchten Sie starten?
              </h1>
              <p className="mb-8 mt-3 text-center text-base text-muted-foreground">
                Sie können sofort loslegen – kostenlos und unverbindlich.
              </p>
              <div className="space-y-3">
                <ChoiceButton
                  icon={CirclePlay}
                  title="Mit Beispieldaten erkunden"
                  description="Zwei Beispielobjekte zeigen, wie Kalkulation und Angebot funktionieren."
                  emphasis
                  onClick={() => finish(true, "/")}
                />
                <ChoiceButton
                  icon={Building2}
                  title="Leer starten"
                  description="Direkt die erste eigene Kalkulation anlegen."
                  onClick={() => finish(false, "/kalkulation/neu")}
                />
              </div>
              {wantsAccount && (
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Anschließend erstellen Sie Ihren Account.
                </p>
              )}
            </PageTransition>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
