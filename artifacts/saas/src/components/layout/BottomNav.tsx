import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calculator, FolderKanban, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Übersicht", icon: LayoutDashboard },
  { href: "/kalkulation", label: "Kalkulation", icon: Calculator },
  { href: "/objekte", label: "Objekte", icon: FolderKanban },
  { href: "/auswertung", label: "Auswertung", icon: BarChart3 },
  { href: "/konto", label: "Konto", icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/" && location !== "/") return false;
    return location.startsWith(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/98 border-t border-border/20 pb-safe">
      <div className="flex items-center justify-around px-2 h-20 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 h-full group">
              <div className="transition-all duration-300">
                <Icon size={22} strokeWidth={active ? 2.5 : 2} className={active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}