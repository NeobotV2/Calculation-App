import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { useAuth } from "@/lib/auth-context";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { User, LogOut, ShieldAlert, Crown, CheckCircle2, AlertTriangle, FileText, Shield, ScrollText, ChevronRight, Mail, RefreshCw, Key, Trash2, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getObjectLimit, getRoomLimit, isPaidPlan } from "@/lib/feature-gates";
import { getPlanMeta, isFoundingPlan } from "@/lib/billing-config";
import { isNative } from "@/lib/capacitor";
import { trackUpgradeCtaClicked } from "@/services/analytics-service";
import { AppFooter } from "@/components/layout/AppFooter";

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

  const [showReset, setShowReset] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailConfirmed = authUser?.email_confirmed_at != null;

  const activeProjects = projects.filter(p => p.status !== "archived").length;
  const objectLimit = getObjectLimit();
  const roomLimit = getRoomLimit();
  const projectPercent = isPaidPlan(plan) ? 0 : Math.min(100, Math.round((activeProjects / objectLimit) * 100));
  const largestProjectRooms = projects.reduce((max, p) => Math.max(max, p.rooms.length), 0);
  const roomsPercent = isPaidPlan(plan) ? 0 : Math.min(100, Math.round((largestProjectRooms / roomLimit) * 100));
  const planMeta = getPlanMeta(plan);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (isAuthenticated) {
      await signOut();
    }
    clearSession();
    setIsLoggingOut(false);
    toast.success("Abgemeldet");
    setLocation("/login");
  };

  const handleReset = () => {
    resetAll();
    toast.success("Alle Daten gelöscht");
    setLocation("/splash");
  };

  const handlePasswordChange = () => {
    if (isAuthenticated) {
      setLocation("/passwort-vergessen");
    } else {
      toast.info("Passwort-Änderung ist nur mit einem registrierten Account möglich.");
    }
  };

  const handleDeleteAccount = () => {
    toast.info("Account-Löschung wird in einer zukünftigen Version verfügbar sein. Kontaktiere uns per E-Mail.");
    setShowDeleteAccount(false);
  };

  return (
    <PageTransition className="min-h-screen pb-28 md:pb-8 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20 md:pt-6">
        <h1 className="text-4xl font-semibold tracking-tight mt-2 max-w-5xl mx-auto">Profil & Plan</h1>
      </div>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {isDemo && !isAuthenticated && (
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-foreground">Demo-Modus</p>
              <p className="text-xs text-muted-foreground mt-1">Du bist nicht angemeldet. Deine Daten werden nur lokal gespeichert und gehen beim Löschen des Browsers verloren.</p>
              <Button variant="outline" size="sm" className="mt-3 border-warning/30 text-foreground hover:bg-warning/10" onClick={() => setLocation("/login")}>Jetzt anmelden</Button>
            </div>
          </div>
        )}

        <div className="bg-card border border-border/40 rounded-3xl p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-semibold text-foreground border border-border/50 shrink-0">
            {user?.name?.charAt(0) || companyName.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-2xl text-foreground mb-1 truncate">{user?.name || companyName}</h2>
            <p className="text-muted-foreground text-sm mb-3">{user?.email || "demo@cleancalc.pro"}</p>
            <div className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1 rounded-md text-xs font-medium text-foreground">
              <User size={14} /> {user?.role || "Inhaber"}
            </div>
          </div>
        </div>

        {isAuthenticated && !emailConfirmed && (
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-start gap-3">
            <Mail size={20} className="text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">E-Mail nicht bestätigt</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bitte bestätige deine E-Mail-Adresse ({authUser?.email}), um alle Funktionen nutzen zu können.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-warning/30 text-foreground hover:bg-warning/10"
                disabled={isResendingVerification || resendCooldown > 0}
                onClick={async () => {
                  if (!authUser?.email) return;
                  setIsResendingVerification(true);
                  const result = await resendConfirmation(authUser.email);
                  setIsResendingVerification(false);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    toast.success("Bestätigungs-E-Mail gesendet!");
                    setResendCooldown(60);
                    const interval = setInterval(() => {
                      setResendCooldown((prev) => {
                        if (prev <= 1) { clearInterval(interval); return 0; }
                        return prev - 1;
                      });
                    }, 1000);
                  }
                }}
              >
                {isResendingVerification ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Wird gesendet...
                  </span>
                ) : resendCooldown > 0 ? (
                  `Erneut senden (${resendCooldown}s)`
                ) : (
                  <>
                    <RefreshCw size={14} className="mr-1" /> E-Mail erneut senden
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {isAuthenticated && emailConfirmed && (
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 size={16} className="text-success" />
            <span className="text-xs text-muted-foreground">E-Mail bestätigt</span>
          </div>
        )}

        {!isPaidPlan(plan) && (
          <div className="bg-card border border-border/40 rounded-3xl p-6">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-4">Nutzung</p>
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-foreground">Aktive Objekte</span>
                <span className="text-sm text-muted-foreground">{activeProjects} / {objectLimit}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${projectPercent >= 100 ? "bg-destructive" : projectPercent >= 66 ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${projectPercent}%` }}
                />
              </div>
              {projectPercent >= 100 && (
                <p className="text-xs text-destructive mt-2">Objektlimit erreicht — mit dem Pro-Plan kalkulieren Sie unbegrenzt viele Objekte parallel.</p>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-border/20">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-foreground">Räume (größtes Objekt)</span>
                <span className="text-sm text-muted-foreground">{largestProjectRooms} / {roomLimit}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${roomsPercent >= 100 ? "bg-destructive" : roomsPercent >= 66 ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${roomsPercent}%` }}
                />
              </div>
              {roomsPercent >= 100 && (
                <p className="text-xs text-destructive mt-2">Raumlimit erreicht — im Pro-Plan gibt es keine Beschränkung bei der Raumanzahl.</p>
              )}
            </div>
          </div>
        )}

        <div className={`rounded-3xl p-1 border ${isPaidPlan(plan) ? "border-primary/50 bg-primary/5" : "border-border/40 bg-card"}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Ihr Plan</p>
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {planMeta.label}
                  {isPaidPlan(plan) && <Crown size={24} className="text-primary" />}
                  {isFoundingPlan(plan) && <Sparkles size={18} className="text-primary" />}
                </h3>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-base text-foreground">
                <CheckCircle2 size={20} className="text-primary" /> <span>{isPaidPlan(plan) ? "Unbegrenzt Objekte & Räume" : `${objectLimit} kostenlose${objectLimit === 1 ? "s" : ""} Objekt${objectLimit > 1 ? "e" : ""}`}</span>
              </div>
              <div className="flex items-center gap-3 text-base text-foreground">
                <CheckCircle2 size={20} className="text-primary" /> <span>{isPaidPlan(plan) ? "Druckfertige PDF-Angebote" : "Angebotsvorschau"}</span>
              </div>
              <div className="flex items-center gap-3 text-base text-foreground">
                <CheckCircle2 size={20} className="text-primary" /> <span>{isPaidPlan(plan) ? "Vorlagen, Branding & individuelle Leistungswerte" : "Standard-Leistungswerte"}</span>
              </div>
            </div>

            {!isPaidPlan(plan) && (
              <Button onClick={() => { trackUpgradeCtaClicked("konto"); setLocation("/upgrade"); }} className="w-full h-14 text-lg">Pro-Plan ansehen</Button>
            )}
          </div>
        </div>

        {isPaidPlan(plan) && (
          <div className="bg-card border border-border/40 rounded-3xl p-6">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-4">Abonnement</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-medium text-foreground">{planMeta.label}</span>
              </div>
              {isFoundingPlan(plan) && (
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs text-foreground">Founding Member — Ihr Sondertarif bleibt dauerhaft erhalten.</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium text-success">Aktiv</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nächste Verlängerung</span>
                <span className="text-sm text-muted-foreground">—</span>
              </div>
              <div className="pt-3 border-t border-border/20 space-y-2">
                {isNative ? (
                  <Button
                    variant="outline"
                    className="w-full justify-between h-11 text-sm bg-background"
                    onClick={() => {
                      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      const url = isIos
                        ? "https://apps.apple.com/account/subscriptions"
                        : "https://play.google.com/store/account/subscriptions";
                      window.open(url, "_blank");
                    }}
                  >
                    <span className="flex items-center gap-2">
                      Abo verwalten
                    </span>
                    <ExternalLink size={14} className="text-muted-foreground" />
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    Abonnements werden über den App Store / Google Play verwaltet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-3 ml-1">Konto-Verwaltung</h3>
          <button
            onClick={handlePasswordChange}
            className="w-full flex items-center justify-between h-12 px-4 bg-card border border-border/40 rounded-xl text-sm text-foreground hover:bg-secondary transition-colors rounded-b-none"
          >
            <span className="flex items-center gap-3">
              <Key size={16} className="text-muted-foreground" />
              Passwort ändern
            </span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="w-full flex items-center justify-between h-12 px-4 bg-card border border-border/40 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-t-none border-t-0"
          >
            <span className="flex items-center gap-3">
              <Trash2 size={16} />
              Account löschen
            </span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-3 ml-1">Rechtliches</h3>
          {[
            { href: "/impressum", icon: FileText, label: "Impressum" },
            { href: "/datenschutz", icon: Shield, label: "Datenschutzerklärung" },
            { href: "/agb", icon: ScrollText, label: "AGB" },
          ].map((item, i, arr) => (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`w-full flex items-center justify-between h-12 px-4 bg-card border border-border/40 text-sm text-foreground hover:bg-secondary transition-colors ${i === 0 ? "rounded-xl rounded-b-none" : i === arr.length - 1 ? "rounded-xl rounded-t-none border-t-0" : "rounded-none border-t-0"}`}
            >
              <span className="flex items-center gap-3">
                <item.icon size={16} className="text-muted-foreground" />
                {item.label}
              </span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-4">
          {(isLoggedIn || isAuthenticated) && (
            <Button
              variant="outline"
              className="w-full justify-start h-14 text-base bg-card"
              onClick={() => setShowLogout(true)}
              disabled={isLoggingOut}
            >
              <LogOut size={20} className="text-muted-foreground mr-3" />
              {isLoggingOut ? "Wird abgemeldet..." : "Abmelden"}
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full justify-start h-14 text-base border-destructive/30 text-destructive hover:bg-destructive/10 bg-card"
            onClick={() => setShowReset(true)}
          >
            <ShieldAlert size={20} className="mr-3" /> Alle Daten löschen
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        title="Abmelden?"
        description="Möchtest du dich wirklich abmelden? Im Demo-Modus bleiben deine lokalen Daten erhalten."
        confirmLabel="Abmelden"
      />

      <ConfirmDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={handleReset}
        title="Alle Daten löschen?"
        description="ACHTUNG: Dies löscht sämtliche Objekte, Vorlagen und Einstellungen unwiderruflich. Die App wird zurückgesetzt."
        confirmLabel="Alles löschen"
        destructive
      />

      <ConfirmDialog
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
        title="Account löschen?"
        description="Die Account-Löschung wird in einer zukünftigen Version direkt in der App möglich sein. Aktuell kontaktiere uns bitte per E-Mail."
        confirmLabel="Verstanden"
      />

      <div className="max-w-5xl mx-auto">
        <AppFooter />
      </div>
    </PageTransition>
  );
}
