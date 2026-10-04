import { useId, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useStore } from "@/store/use-store";
import { cn } from "@/lib/utils";
import { nextThemeMode } from "@/lib/theme";
import { THEME_MODE_LABELS, type ThemeMode } from "@/lib/tokens";
import { countLimitedProjects, getObjectLimit } from "@/lib/feature-gates";
import { isPaidPlan } from "@/lib/billing-config";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS, isNavActive, type NavItem } from "./nav-config";

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

/** Tooltip nur auf der Icon-Leiste (md bis lg) und nur bei feinem Zeiger. */
function RailTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="pointer-coarse:hidden lg:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <RailTooltip label={item.label}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 items-center justify-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11 lg:justify-start",
          active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
        <span className="sr-only lg:not-sr-only lg:truncate">{item.label}</span>
      </Link>
    </RailTooltip>
  );
}

/** Plan-Etikett im Footer: „Basic · n/limit Objekte" bzw. „Pro". */
function PlanBadge() {
  const plan = useStore((s) => s.plan);
  // Wie Start, Konto und Objekte: ohne Archiv und ohne Beispielobjekte.
  const projects = useStore((s) => s.projects);
  if (isPaidPlan(plan)) {
    return (
      <Badge tone="brand" size="sm">
        Pro
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" size="sm" className="tabular-nums">
      Basic · {countLimitedProjects(projects)}/{getObjectLimit()} Objekte
    </Badge>
  );
}

/**
 * Desktop-Navigation (§3.2): ab md Icon-Leiste (`--rail-w`) mit Tooltips,
 * ab lg volle Breite (`--sidebar-w`) mit Gruppen-Überschriften.
 */
export function DesktopSidebar() {
  const [location] = useLocation();
  const theme = useStore((s) => s.theme) as ThemeMode;
  const setTheme = useStore((s) => s.setTheme);
  const baseId = useId();
  const primary = NAV_ITEMS.desktop.primary;
  const account = NAV_ITEMS.desktop.account;
  const PrimaryIcon = primary.icon;
  const AccountIcon = account.icon;
  const primaryActive = isNavActive(primary.href, location);
  const accountActive = isNavActive(account.href, location);
  const currentTheme: ThemeMode = theme in THEME_ICON ? theme : "light";
  const next = nextThemeMode(currentTheme);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label="Seitenleiste"
        className="no-print fixed inset-y-0 left-0 z-nav hidden w-(--rail-w) flex-col border-r border-border bg-card pt-safe pl-safe md:flex lg:w-(--sidebar-w)"
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-center gap-3 px-3 lg:justify-start lg:px-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles aria-hidden="true" className="size-5" strokeWidth={2} />
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-foreground">
              CleanCalc <span className="text-primary">Pro</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">Gebäudereinigung</p>
          </div>
          <span className="sr-only lg:hidden">CleanCalc Pro</span>
        </div>

        {/* Primäraktion */}
        <div className="px-3 pb-2">
          <RailTooltip label={primary.label}>
            <Link
              href={primary.href}
              aria-label={primary.label}
              aria-current={primaryActive ? "page" : undefined}
              className={cn(
                "flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-surface outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card pointer-coarse:h-11",
                primaryActive && "ring-2 ring-primary/30 ring-offset-2 ring-offset-card",
              )}
            >
              <PrimaryIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
              <span className="hidden lg:inline">{primary.label}</span>
            </Link>
          </RailTooltip>
        </div>

        {/* Gruppen */}
        <nav aria-label="Hauptnavigation" className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.desktop.groups.map((group, gi) => {
            const headingId = `${baseId}-${group.id}`;
            return (
              <div key={group.id} className={cn(gi > 0 && "border-t border-border pt-4 lg:border-t-0 lg:pt-0")}>
                <p
                  id={headingId}
                  className="sr-only lg:not-sr-only lg:mb-1 lg:block lg:px-3 lg:text-overline lg:uppercase lg:text-muted-foreground"
                >
                  {group.label}
                </p>
                <ul aria-labelledby={headingId} className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <SidebarLink item={item} active={isNavActive(item.href, location)} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer: Konto & Plan, Farbschema */}
        <div className="flex shrink-0 flex-col items-center gap-2 border-t border-border p-3 pb-[calc(var(--safe-bottom)+0.75rem)] lg:flex-row lg:items-center">
          <RailTooltip label={account.label}>
            <Link
              href={account.href}
              aria-current={accountActive ? "page" : undefined}
              className={cn(
                "flex min-h-10 w-full min-w-0 flex-1 items-center justify-center gap-3 rounded-md px-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring lg:justify-start",
                accountActive ? "bg-primary-soft text-primary" : "text-foreground hover:bg-muted",
              )}
            >
              <AccountIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
              <span className="sr-only lg:not-sr-only lg:min-w-0 lg:flex-1 lg:space-y-1 lg:py-1.5">
                <span className="block truncate text-sm font-medium">{account.label}</span>
                <span className="block">
                  <PlanBadge />
                </span>
              </span>
            </Link>
          </RailTooltip>
          <IconButton
            icon={THEME_ICON[currentTheme]}
            label={`Farbschema: ${THEME_MODE_LABELS[currentTheme]} – wechseln zu ${THEME_MODE_LABELS[next]}`}
            variant="ghost"
            size="sm"
            onClick={() => setTheme(next)}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}
