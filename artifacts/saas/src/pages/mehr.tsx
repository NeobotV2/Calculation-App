import { useLocation } from "wouter";
import { useStore } from "@/store/use-store";
import { isPaidPlan } from "@/lib/billing-config";
import { PageTransition } from "@/components/layout/PageTransition";
import { AppFooter } from "@/components/layout/AppFooter";
import {
  Settings,
  User,
  FileStack,
  Download,
  Sun,
  Moon,
  Crown,
  FileText,
  Shield,
  ScrollText,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

interface MehrItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  href?: string;
  action?: () => void;
  subtitle?: string;
  badge?: string;
}

export default function Mehr() {
  const [, setLocation] = useLocation();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const plan = useStore((s) => s.plan);

  const handleExport = () => {
    const exportData = useStore.getState().exportData;
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleancalc-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hauptItems: MehrItem[] = [
    { label: "Einstellungen", icon: Settings, href: "/einstellungen", subtitle: "Firma, Kalkulation, PDF" },
    { label: "Profil & Konto", icon: User, href: "/konto", subtitle: "Anmeldung, Abo, Daten" },
    { label: "Vorlagen", icon: FileStack, href: "/vorlagen", subtitle: "Raumvorlagen verwalten" },
    { label: "Datenexport", icon: Download, action: handleExport, subtitle: "Alle Daten als JSON sichern" },
  ];

  if (!isPaidPlan(plan)) {
    hauptItems.push({ label: "Upgrade auf Pro", icon: Crown, href: "/upgrade", subtitle: "Alle Funktionen freischalten", badge: "PRO" });
  }

  const darstellungItems: MehrItem[] = [
    {
      label: theme === "light" ? "Dunkles Design aktivieren" : "Helles Design aktivieren",
      icon: theme === "light" ? Moon : Sun,
      action: () => setTheme(theme === "light" ? "dark" : "light"),
      subtitle: theme === "light" ? "Aktuell: Hell" : "Aktuell: Dunkel",
    },
  ];

  const supportItems: MehrItem[] = [
    { label: "Hilfe & Support", icon: HelpCircle, subtitle: "support@cleancalc.de", action: () => window.open("mailto:support@cleancalc.de") },
  ];

  const rechtlichesItems: MehrItem[] = [
    { label: "Impressum", icon: FileText, href: "/impressum" },
    { label: "Datenschutz", icon: Shield, href: "/datenschutz" },
    { label: "AGB", icon: ScrollText, href: "/agb" },
  ];

  const renderItem = (item: MehrItem, index: number, isLast: boolean) => {
    const Icon = item.icon;
    const content = (
      <div className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/50 active:bg-secondary ${!isLast ? "border-b border-border/20" : ""}`}>
        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <Icon size={18} className="text-foreground" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            {item.badge && (
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{item.badge}</span>
            )}
          </div>
          {item.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
          )}
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </div>
    );

    if (item.href) {
      return (
        <button key={index} onClick={() => setLocation(item.href!)} className="w-full text-left cursor-pointer">
          {content}
        </button>
      );
    }

    return (
      <button key={index} onClick={item.action} className="w-full text-left cursor-pointer">
        {content}
      </button>
    );
  };

  const renderSection = (title: string, items: MehrItem[]) => (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">
        {title}
      </h2>
      <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
        {items.map((item, i) => renderItem(item, i, i === items.length - 1))}
      </div>
    </section>
  );

  return (
    <PageTransition className="min-h-screen pb-28 md:pb-8 bg-background">
      <div className="safe-header p-6 pb-4 bg-background/95 sticky top-0 z-40 border-b border-border/20 md:pt-6">
        <h1 className="text-4xl font-semibold tracking-tight mt-2 max-w-5xl mx-auto">Mehr</h1>
      </div>

      <div className="p-6 space-y-8 max-w-5xl mx-auto">
        {renderSection("Verwaltung", hauptItems)}
        {renderSection("Darstellung", darstellungItems)}
        {renderSection("Support", supportItems)}
        {renderSection("Rechtliches", rechtlichesItems)}
      </div>

      <div className="max-w-5xl mx-auto">
        <AppFooter />
      </div>
    </PageTransition>
  );
}
