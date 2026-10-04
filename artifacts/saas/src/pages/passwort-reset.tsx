import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { FormField } from "@/components/ui/form-field";
import { Sparkles, Lock, CircleCheck } from "lucide-react";

export default function PasswortReset() {
  const [, setLocation] = useLocation();
  const { updatePassword, isSupabaseReady, isAuthenticated } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseReady) {
      setError("Backend nicht konfiguriert.");
    }
  }, [isSupabaseReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);
    const result = await updatePassword(password);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setLocation("/"), 2000);
    }
  };

  if (success) {
    return (
      <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
        <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 text-center outline-none">
          <div className="mb-8 flex justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
              <CircleCheck className="size-8" aria-hidden="true" strokeWidth={2} />
            </span>
          </div>
          <h1 className="mb-3 text-h1 text-foreground">Passwort geändert</h1>
          <p role="status" className="text-base text-muted-foreground">
            Ihr Passwort wurde erfolgreich geändert. Sie werden weitergeleitet…
          </p>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="flex min-h-dvh flex-col bg-background px-4 pb-safe pt-safe">
      <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 outline-none">
        <div className="mb-10 flex justify-center">
          <span className="flex size-20 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-raised">
            <Sparkles className="size-10" strokeWidth={2} aria-hidden="true" />
          </span>
        </div>

        <h1 className="mb-3 text-center text-h1 text-foreground">Neues Passwort</h1>
        <p className="mb-10 text-center text-base text-muted-foreground">Wählen Sie ein neues Passwort für Ihr Konto.</p>

        {error && (
          <Callout tone="critical" live className="mb-6">
            <p id="password-reset-error">{error}</p>
          </Callout>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField id="new-password" label="Neues Passwort" hint="Mindestens 6 Zeichen">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputSize="lg"
              autoComplete="new-password"
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "password-reset-error" : undefined}
            />
          </FormField>
          <FormField id="confirm-password" label="Passwort bestätigen">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              inputSize="lg"
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "password-reset-error" : undefined}
            />
          </FormField>

          <Button type="submit" size="lg" className="mt-6 w-full" loading={isLoading}>
            {isLoading ? (
              "Wird gespeichert…"
            ) : (
              <>
                <Lock aria-hidden="true" /> Passwort ändern
              </>
            )}
          </Button>
        </form>
      </main>
    </PageTransition>
  );
}
