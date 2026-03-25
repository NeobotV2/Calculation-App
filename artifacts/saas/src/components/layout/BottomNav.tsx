import { Link, useLocation } from "wouter";
import { Home, Calculator, Building2, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Start", icon: Home },
  { href: "/stundensatz", label: "Kalkulation", icon: Calculator },
  { href: "/objekte", label: "Objekte", icon: Building2 },
  { href: "/auswertung", label: "Controlling", icon: BarChart3 },
  { href: "/mehr", label: "Mehr", icon: Menu },
];

export function BottomNav() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/" && location !== "/") return false;
    if (href === "/mehr") {
      const mehrSubRoutes = ["/mehr", "/einstellungen", "/konto", "/vorlagen", "/upgrade", "/impressum", "/datenschutz", "/agb"];
      return mehrSubRoutes.some((r) => location === r || location.startsWith(r + "/"));
    }
    return location === href || location.startsWith(href + "/");
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/30 no-print md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-2 h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full min-w-[44px] min-h-[44px] active:scale-95 transition-transform"
            >
              <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                active ? "bg-primary/10" : ""
              )}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className={cn("text-[10px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
