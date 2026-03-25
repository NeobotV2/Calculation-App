import { Link, useLocation } from "wouter";
import { Home, Calculator, Building2, BarChart3, Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Start", icon: Home },
  { href: "/kalkulation/neu", label: "Kalkulation", icon: Calculator },
  { href: "/objekte", label: "Objekte", icon: Building2 },
  { href: "/auswertung", label: "Controlling", icon: BarChart3 },
  { href: "/mehr", label: "Mehr", icon: Menu },
];

export function DesktopSidebar() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/" && location !== "/") return false;
    if (href === "/kalkulation/neu") return location.startsWith("/kalkulation");
    if (href === "/mehr") {
      const mehrSubRoutes = ["/mehr", "/einstellungen", "/konto", "/vorlagen", "/upgrade", "/impressum", "/datenschutz", "/agb"];
      return mehrSubRoutes.some((r) => location === r || location.startsWith(r + "/"));
    }
    return location === href || location.startsWith(href + "/");
  };

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border/20 bg-background/98 no-print">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border/20">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">CleanCalc <span className="text-primary">Pro</span></h1>
          <p className="text-[11px] text-muted-foreground">Gebäudereinigung</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-4">
        <div className="text-[10px] text-muted-foreground/50 text-center">
          CleanCalc Pro v1.0
        </div>
      </div>
    </aside>
  );
}
