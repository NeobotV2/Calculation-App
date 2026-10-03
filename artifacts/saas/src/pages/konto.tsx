import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  CircleCheck,
  Crown,
  ExternalLink,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  UserX,
} from "lucide-react";
import { useStore } from "@/store/use-store";
import { useAuth } from "@/lib/auth-context";
import { getObjectLimit, getRoomLimit, isPaidPlan } from "@/lib/feature-gates";
import { getPlanMeta, isFoundingPlan } from "@/lib/billing-config";
import { isNative } from "@/lib/capacitor";
import { trackUpgradeCtaClicked } from "@/services/analytics-service";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageShell } from "@/components/layout/PageShell";
import { Section } from "@/components/layout/Section";
import { AppFooter } from "@/components/layout/AppFooter";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { ListRow } from "@/components/ui/list-row";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DELETE_CONFIRM_WORD = "LÖSCHEN";
const SUPPORT_EMAIL = "support@cleancalc.de";

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const fill = pct >= 100 ? "bg-destructive" : pct >= 66 ? "bg-warning" : "bg-primary";
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full transition-[width] motion-reduce:transition-none", fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-foreground">
      <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

export default function Konto() {
  const [, setLocation] = useLocation();
  const user = useStore((s) => s.user);
  const companyName = useStore((s) => s.companyName);
  const plan = useStore((s) => s.plan);
  const projects = useStore((s) => s.projects);
  const clearSession = useStore((s) => s.clearSession);
  const resetAll = useStore((s) => s.resetAll);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isDemo = useStore((s) => s.isDemo);
  const { signOut, isAuthenticated, user: authUser, resendConfirmation } = useAuth();

  const [showLogout, setShowLogout] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetWord, setResetWord] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimer = useRef<number | null>(null);
  const resetFieldId = useId();

  useEffect(
    () => () => {
      if (cooldownTimer.current !== null) window.clearInterval(cooldownTimer.current);
    },
    [],
  );

  const paid = isPaidPlan(plan);
  const planMeta = getPlanMeta(plan);
  const emailConfirmed = authUser?.email_confirmed_at != null;
  const activeProjects = projects.filter((p) => p.status !== "archived").length;
  const largestProjectRooms = projects.reduce((max, p) => Math.max(max, p.rooms.length), 0);
  const objectLimit = getObjectLimit();
  const roomLimit = getRoomLimit();
  const displayName = user?.name || companyName;
  const initial = (displayName || "?").trim().charAt(0).toUpperCase() || "?";
  const resetConfirmed = resetWord.trim() === DELETE_CONFIRM_WORD;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (isAuthenticated) await signOut();
      clearSession();
      toast.success("Sie wurden abgemeldet.");
      setLocation("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleReset = () => {
    resetAll();
    setShowReset(false);
    toast.success("Alle Daten wurden gelöscht.");
    setLocation("/splash");
  };

  const handlePasswordChange = () => {
    if (isAuthenticated) setLocation("/passwort-vergessen");
    else toast.info("Ein Passwort lässt sich nur mit einem registrierten Account ändern.");
  };

  const handleResend = async () => {
    if (!authUser?.email || isResending || resendCooldown > 0) return;
    setIsResending(true);
    const result = await resendConfirmation(authUser.email);
    setIsResending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Bestätigungs-E-Mail gesendet.");
    setResendCooldown(60);
    if (cooldownTimer.current !== null) window.clearInterval(cooldownTimer.current);
    cooldownTimer.current = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current !== null) window.clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const openSubscriptionManagement = () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.open(
      isIos ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <PageTransition>
      <PageShell width="narrow" header={<PageHeader title="Profil & Konto" width="narrow" />}>
        {isDemo && !isAuthenticated && (
          <Callout
            tone="warning"
            title="Demo-Modus"
            action={
              <Button asChild size="sm" variant="secondary">
                <Link href="/login">Jetzt anmelden</Link>
              </Button>
            }
          >
            Sie sind nicht angemeldet. Ihre Daten werden nur lokal auf diesem Gerät gespeichert und gehen verloren, wenn
            Sie die Browserdaten löschen.
          </Callout>
        )}

        {/* Profil */}
        <Card as="section" aria-label="Profil">
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-h2 text-foreground"
            >
              {initial}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-h3 text-foreground">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email || authUser?.email || "Kein Account"}</p>
              <Badge tone="neutral" size="sm">
                <UserRound aria-hidden="true" />
                {user?.role || "Inhaber"}
              </Badge>
            </div>
          </div>
        </Card>

        {isAuthenticated && !emailConfirmed && (
          <Callout
            tone="warning"
            icon={Mail}
            title="E-Mail-Adresse nicht bestätigt"
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={isResending}
                disabled={resendCooldown > 0}
                onClick={() => void handleResend()}
              >
                {!isResending && <RefreshCw aria-hidden="true" />}
                {resendCooldown > 0 ? `Erneut senden (${resendCooldown} s)` : "E-Mail erneut senden"}
              </Button>
            }
          >
            Bitte bestätigen Sie Ihre E-Mail-Adresse ({authUser?.email}), um alle Funktionen nutzen zu können.
          </Callout>
        )}
        {isAuthenticated && emailConfirmed && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck aria-hidden="true" className="size-4 text-success" />
            E-Mail-Adresse bestätigt
          </p>
        )}

        {/* Plan */}
        <Section title="Plan">
          <Card tone={paid ? "brand" : "default"}>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  {paid ? planMeta.label : "Basic"}
                  {paid && <Crown aria-hidden="true" className="size-4 text-primary" />}
                  {isFoundingPlan(plan) && <Sparkles aria-hidden="true" className="size-4 text-primary" />}
                </span>
              }
              description="Ihr aktueller Plan"
              action={
                <Badge tone={paid ? "brand" : "neutral"} size="sm">
                  Aktueller Plan
                </Badge>
              }
            />
            <ul className="space-y-2">
              <Feature>
                {paid
                  ? "Unbegrenzt Objekte und Räume"
                  : `${objectLimit} kostenlose${objectLimit === 1 ? "s" : ""} Objekt${objectLimit === 1 ? "" : "e"}`}
              </Feature>
              <Feature>{paid ? "Druckfertige PDF-Angebote" : "Angebotsvorschau"}</Feature>
              <Feature>{paid ? "Vorlagen, Branding und eigene Leistungswerte" : "Standard-Leistungswerte"}</Feature>
            </ul>

            {!paid && (
              <div className="mt-5 space-y-4 border-t border-border pt-5">
                <UsageBar label="Aktive Objekte" used={activeProjects} limit={objectLimit} />
                <UsageBar label="Räume (größtes Objekt)" used={largestProjectRooms} limit={roomLimit} />
                {(activeProjects >= objectLimit || largestProjectRooms >= roomLimit) && (
                  <p className="text-sm text-muted-foreground">
                    Limit erreicht – mit dem Pro-Plan kalkulieren Sie unbegrenzt viele Objekte und Räume.
                  </p>
                )}
              </div>
            )}

            {paid ? (
              <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="flex items-center gap-1 font-medium text-success">
                    <CircleCheck aria-hidden="true" className="size-4" />
                    Aktiv
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Nächste Verlängerung</dt>
                  <dd className="text-muted-foreground">–</dd>
                </div>
                {isFoundingPlan(plan) && (
                  <p className="pt-2 text-sm text-muted-foreground">
                    Founding Member – Ihr Sondertarif bleibt dauerhaft erhalten.
                  </p>
                )}
              </dl>
            ) : null}

            <CardFooter>
              {paid ? (
                isNative ? (
                  <Button type="button" variant="secondary" onClick={openSubscriptionManagement}>
                    Abo verwalten
                    <ExternalLink aria-hidden="true" />
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Abonnements werden über den App Store bzw. Google Play verwaltet.</p>
                )
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    trackUpgradeCtaClicked("konto");
                    setLocation("/upgrade");
                  }}
                >
                  <Crown aria-hidden="true" />
                  Pro-Plan ansehen
                </Button>
              )}
            </CardFooter>
          </Card>
        </Section>

        {/* Konto-Verwaltung */}
        <Section title="Konto">
          <Card padding="none">
            <ul className="divide-y divide-border">
              <ListRow
                as="li"
                leading={<KeyRound aria-hidden="true" className="size-4 text-muted-foreground" />}
                title="Passwort ändern"
                onClick={handlePasswordChange}
              />
              <ListRow
                as="li"
                leading={<UserX aria-hidden="true" className="size-4 text-muted-foreground" />}
                title="Account löschen"
                meta="Über den Support"
                onClick={() => setShowDeleteAccount(true)}
              />
              {(isLoggedIn || isAuthenticated) && (
                <ListRow
                  as="li"
                  leading={<LogOut aria-hidden="true" className="size-4 text-muted-foreground" />}
                  title={isLoggingOut ? "Wird abgemeldet…" : "Abmelden"}
                  onClick={() => setShowLogout(true)}
                  disabled={isLoggingOut}
                />
              )}
            </ul>
          </Card>
        </Section>

        {/* Gefahrenbereich */}
        <Section title="Gefahrenbereich">
          <Card tone="critical" as="div">
            <CardHeader
              title="Alle Daten löschen"
              description="Löscht sämtliche Objekte, Vorlagen, Entwürfe und Einstellungen auf diesem Gerät unwiderruflich. Die App wird zurückgesetzt."
            />
            <Button
              type="button"
              variant="secondary"
              className="text-destructive"
              onClick={() => {
                setResetWord("");
                setShowReset(true);
              }}
            >
              <Trash2 aria-hidden="true" />
              Alle Daten löschen…
            </Button>
          </Card>
        </Section>

        <AppFooter />
      </PageShell>

      <ConfirmDialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={() => void handleLogout()}
        title="Abmelden?"
        description="Möchten Sie sich wirklich abmelden? Im Demo-Modus bleiben Ihre lokalen Daten erhalten."
        confirmLabel="Abmelden"
      />

      <ConfirmDialog
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={() => {
          window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Account löschen")}`;
        }}
        title="Account löschen?"
        description={`Die Account-Löschung ist in der App noch nicht möglich. Kontaktieren Sie uns per E-Mail an ${SUPPORT_EMAIL} – wir löschen Ihren Account und alle Cloud-Daten.`}
        confirmLabel="E-Mail schreiben"
        cancelLabel="Schließen"
      />

      <AlertDialog
        open={showReset}
        onOpenChange={(open) => {
          if (!open) setShowReset(false);
        }}
      >
        <AlertDialogContent>
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              if (resetConfirmed) handleReset();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Alle Daten löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sämtliche Objekte, Vorlagen und Einstellungen werden unwiderruflich gelöscht. Geben Sie zur Bestätigung{" "}
                <strong className="font-semibold text-foreground">{DELETE_CONFIRM_WORD}</strong> ein.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <FormField id={resetFieldId} label={`Zur Bestätigung „${DELETE_CONFIRM_WORD}“ eingeben`}>
              <Input
                value={resetWord}
                onChange={(e) => setResetWord(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </FormField>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Abbrechen</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={!resetConfirmed}>
                Alles löschen
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
