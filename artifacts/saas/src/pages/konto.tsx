import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { User, LogOut, ShieldAlert, Crown, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { BASIC_LIMITS } from "@/lib/feature-gates";

export default function Konto() {
  const [, setLocation] = useLocation();
  const user = useStore((s) => s.user);
  const companyName = useStore((s) => s.companyName);
  const plan = useStore((s) => s.plan);
  const projects = useStore((s) => s.projects);
  const logout = useStore((s) => s.logout);
  const resetAll = useStore((s) => s.resetAll);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const isDemo = useStore((s) => s.isDemo);

  const [showReset, setShowReset] = useState(false);

  const activeProjects = projects.filter(p => p.status !== "archived").length;
  const projectLimit = plan === "pro" ? Infinity : BASIC_LIMITS.maxProjects;
  const projectPercent = plan === "pro" ? 0 : Math.min(100, Math.round((activeProjects / projectLimit) * 100));
  const largestProjectRooms = projects.reduce((max, p) => Math.max(max, p.rooms.length), 0);
  const roomsPercent = plan === "pro" ? 0 : Math.min(100, Math.round((largestProjectRooms / BASIC_LIMITS.maxRoomsPerProject) * 100));

  const handleLogout = () => {
    logout();
    toast.success("Abgemeldet");
    setLocation("/login");
  };

  const handleReset = () => {
    resetAll();
    toast.success("Alle Daten gelöscht");
    setLocation("/splash");
  };

  return (
    <PageTransition className="min-h-screen pb-28 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20">
        <h1 className="text-4xl font-semibold tracking-tight mt-2">Konto</h1>
      </div>

      <div className="p-6 space-y-6">
        {isDemo && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-yellow-200">Demo-Modus</p>
              <p className="text-xs text-yellow-200/70 mt-1">Du bist nicht angemeldet. Deine Daten werden nur lokal gespeichert und gehen beim Löschen des Browsers verloren.</p>
              <Button variant="outline" size="sm" className="mt-3 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10" onClick={() => setLocation("/login")}>Jetzt anmelden</Button>
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

        {plan === "basic" && (
          <div className="bg-card border border-border/40 rounded-3xl p-6">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-4">Nutzung</p>
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-foreground">Aktive Objekte</span>
                <span className="text-sm text-muted-foreground">{activeProjects} / {BASIC_LIMITS.maxProjects}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${projectPercent >= 100 ? "bg-destructive" : projectPercent >= 66 ? "bg-yellow-500" : "bg-primary"}`}
                  style={{ width: `${projectPercent}%` }}
                />
              </div>
              {projectPercent >= 100 && (
                <p className="text-xs text-destructive mt-2">Limit erreicht — upgrade auf Pro für unbegrenzte Objekte.</p>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-border/20">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-foreground">Räume (größtes Objekt)</span>
                <span className="text-sm text-muted-foreground">{largestProjectRooms} / {BASIC_LIMITS.maxRoomsPerProject}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${roomsPercent >= 100 ? "bg-destructive" : roomsPercent >= 66 ? "bg-yellow-500" : "bg-primary"}`}
                  style={{ width: `${roomsPercent}%` }}
                />
              </div>
              {roomsPercent >= 100 && (
                <p className="text-xs text-destructive mt-2">Raumlimit erreicht — upgrade auf Pro für unbegrenzte Räume.</p>
              )}
            </div>
          </div>
        )}

        <div className={`rounded-3xl p-1 border ${plan === "pro" ? "border-primary/50 bg-primary/5" : "border-border/40 bg-card"}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-2">Dein Plan</p>
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {plan === "pro" ? "Pro Version" : "Basic (Kostenlos)"}
                  {plan === "pro" && <Crown size={24} className="text-primary" />}
                </h3>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-base text-foreground">
                <CheckCircle2 size={20} className="text-primary" /> <span>{plan === "pro" ? "Unbegrenzte Objekte" : "3 Objekte"}</span>
              </div>
              <div className="flex items-center gap-3 text-base text-foreground">
                <CheckCircle2 size={20} className="text-primary" /> <span>{plan === "pro" ? "PDF-Angebote exportieren" : "In-App Ansicht"}</span>
              </div>
              <div className="flex items-center gap-3 text-base text-foreground">
                <CheckCircle2 size={20} className="text-primary" /> <span>{plan === "pro" ? "Vorlagen & Leistungswerte" : "Standard-Leistungswerte"}</span>
              </div>
            </div>

            {plan === "basic" && (
              <Button onClick={() => setLocation("/upgrade")} className="w-full h-14 text-lg">Jetzt auf Pro upgraden</Button>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          {isLoggedIn && (
            <Button variant="outline" className="w-full justify-start h-14 text-base bg-card" onClick={handleLogout}>
              <LogOut size={20} className="text-muted-foreground mr-3" /> Abmelden
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
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={handleReset}
        title="Alle Daten löschen?"
        description="ACHTUNG: Dies löscht sämtliche Objekte, Vorlagen und Einstellungen unwiderruflich. Die App wird zurückgesetzt."
        confirmLabel="Alles löschen"
        destructive
      />

      <BottomNav />
    </PageTransition>
  );
}
