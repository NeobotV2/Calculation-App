import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { FormField } from "@/components/ui/form-field";
import { Sparkles, ArrowLeft, Mail, CircleCheck } from "lucide-react";

export default function PasswortVergessen() {
  const [, setLocation] = useLocation();
  const { resetPassword, isSupabaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      return;
    }

    if (!isSupabaseReady) {
      setError("Backend nicht konfiguriert. Bitte kontaktieren Sie den Support.");
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
              <CircleCheck className="size-8" aria-hidden="true" strokeWidth={2} />
            </span>
          </div>
          <h1 className="mb-3 text-center text-h1 text-foreground">E-Mail gesendet</h1>
          <p className="mb-10 text-center text-base text-muted-foreground">
            Falls ein Konto mit <span className="font-medium text-foreground">{email}</span> existiert, haben wir Ihnen einen Link zum Zurücksetzen Ihres Passworts gesendet.
          </p>
          <Button variant="secondary" size="lg" className="w-full" onClick={() => setLocation("/login")}>
            <ArrowLeft aria-hidden="true" /> Zurück zur Anmeldung
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div className="mb-10 flex justify-center">
          <span className="flex size-20 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-raised">
            <Sparkles className="size-10" strokeWidth={2} aria-hidden="true" />
          </span>
        </div>

        <h1 className="mb-3 text-center text-h1 text-foreground">Passwort vergessen?</h1>
        <p className="mb-10 text-center text-base text-muted-foreground">
          Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum Zurücksetzen.
        </p>

        {error && (
          <Callout tone="critical" live className="mb-6">
            <p id="reset-error">{error}</p>
          </Callout>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField id="reset-email" label="E-Mail-Adresse">
            <Input
              type="email"
              placeholder="name@firma.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputSize="lg"
              autoComplete="email"
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "reset-error" : undefined}
            />
          </FormField>

          <Button type="submit" size="lg" className="mt-6 w-full" loading={isLoading}>
            {isLoading ? (
              "Wird gesendet…"
            ) : (
              <>
                <Mail aria-hidden="true" /> Link senden
              </>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-base font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
