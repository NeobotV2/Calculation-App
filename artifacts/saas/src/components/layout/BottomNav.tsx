import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "./nav-config";

/**
 * Untere Navigation unter md (§3.1): Start · Objekte · Neu · Controlling · Mehr.
 * „Neu" ist eine Plus-Kachel in Primärfarbe; aktiv = Primärfarbe + Indikator oben.
 */
export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="no-print fixed inset-x-0 bottom-0 z-nav border-t border-border bg-card pb-safe pl-safe pr-safe md:hidden"
    >
      <ul className="mx-auto flex h-(--nav-h) max-w-md items-stretch justify-around px-1">
        {NAV_ITEMS.mobile.map((item) => {
          const active = isNavActive(item.href, location);
          const Icon = item.icon;
          const isNew = item.id === "neu";
          return (
            <li key={item.id} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && !isNew && (
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-primary" />
                )}
                {isNew ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      // Erhöhte Kachel: nimmt nur die Höhe eines Icons ein (-mt), damit „Neu“ auf derselben Linie steht wie die übrigen Labels.
                      "-mt-4 flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-surface",
                      active && "ring-2 ring-primary/30 ring-offset-2 ring-offset-card",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                ) : (
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                )}
                <span className="text-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
