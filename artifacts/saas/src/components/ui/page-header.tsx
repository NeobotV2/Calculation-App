import { type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Ellipsis, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageContainer, type PageWidth } from "@/components/layout/PageContainer";

export interface PageHeaderAction {
  id?: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export interface PageHeaderProps {
  /** Genau ein h1 pro Seite. */
  title: string;
  /** Untertitel unter dem Titel (Altbestand; neu eher `meta`). */
  subtitle?: ReactNode;
  /** Kleine Zeile über dem Titel (`text-overline uppercase`). */
  eyebrow?: ReactNode;
  /** Zurück-Link als IconButton („Zurück zu {label}"). */
  back?: { href: string; label: string };
  /** Metazeile unter dem Titel (z. B. Kunde · Objektart · ModuleBadges). */
  meta?: ReactNode;
  /** Status neben dem Titel (z. B. `StatusBadge`). */
  status?: ReactNode;
  /** Primäraktion(en); immer sichtbar. */
  actions?: ReactNode;
  /** Ab md als Secondary-Buttons sichtbar, darunter im Menü „Weitere Aktionen". */
  secondaryActions?: PageHeaderAction[];
  /** Immer im Menü „Weitere Aktionen". */
  menuActions?: PageHeaderAction[];
  /** Klebt am oberen Rand (mit Trennlinie). */
  sticky?: boolean;
  /** Breite des inneren Containers (Standard „default"). */
  width?: PageWidth;
  className?: string;
}

function ActionMenuItem({ action, className }: { action: PageHeaderAction; className?: string }) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon && <Icon aria-hidden="true" />}
      {action.label}
    </>
  );
  if (action.href && !action.disabled) {
    return (
      <DropdownMenuItem asChild destructive={action.destructive} className={className}>
        <Link href={action.href}>{content}</Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem
      destructive={action.destructive}
      disabled={action.disabled}
      onSelect={() => action.onClick?.()}
      className={className}
    >
      {content}
    </DropdownMenuItem>
  );
}

function SecondaryButton({ action }: { action: PageHeaderAction }) {
  const Icon = action.icon;
  const variant = action.destructive ? "destructive-ghost" : "secondary";
  if (action.href && !action.disabled) {
    return (
      <Button asChild variant={variant}>
        <Link href={action.href}>
          {Icon && <Icon aria-hidden="true" />}
          {action.label}
        </Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} onClick={action.onClick} disabled={action.disabled}>
      {Icon && <Icon aria-hidden="true" />}
      {action.label}
    </Button>
  );
}

/**
 * Einheitlicher Seitenkopf: optional Zurück, Eyebrow, h1 (`text-h1`), Status,
 * Meta, Aktionen. Unter md bleibt nur die Primäraktion sichtbar, der Rest
 * liegt im Menü „Weitere Aktionen".
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  back,
  meta,
  status,
  actions,
  secondaryActions = [],
  menuActions = [],
  sticky = false,
  width = "default",
  className,
}: PageHeaderProps) {
  const hasSecondary = secondaryActions.length > 0;
  const hasMenu = menuActions.length > 0;
  const showMenu = hasSecondary || hasMenu;

  return (
    <header
      className={cn(
        sticky
          ? "sticky top-0 z-sticky border-b border-border bg-background pb-3 pt-[calc(var(--safe-top)+0.75rem)]"
          : "pb-2 pt-[calc(var(--safe-top)+1.25rem)] md:pt-[calc(var(--safe-top)+2rem)]",
        className,
      )}
    >
      <PageContainer width={width}>
        {/* Umbrechen statt Titel zerstückeln: Aktionen rutschen auf schmalen Phones in eine eigene Zeile. */}
        <div className="flex flex-wrap items-start gap-3">
          {back && (
            <IconButton
              href={back.href}
              label={`Zurück zu ${back.label}`}
              icon={ArrowLeft}
              className="-ml-2 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1 basis-48">
            {eyebrow != null && (
              <p className="mb-1 text-overline uppercase text-muted-foreground">{eyebrow}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 hyphens-auto break-words text-h1 text-foreground">{title}</h1>
              {status}
            </div>
            {subtitle != null && subtitle !== "" && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            {meta != null && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">{meta}</div>
            )}
          </div>
          {(actions != null || showMenu) && (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {hasSecondary && (
                <div className="hidden items-center gap-2 md:flex">
                  {secondaryActions.map((a, i) => (
                    <SecondaryButton key={a.id ?? `${a.label}-${i}`} action={a} />
                  ))}
                </div>
              )}
              {actions}
              {showMenu && (
                <div className={cn(!hasMenu && "md:hidden")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label="Weitere Aktionen" icon={Ellipsis} variant="secondary" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {secondaryActions.map((a, i) => (
                        <ActionMenuItem key={a.id ?? `${a.label}-${i}`} action={a} className="md:hidden" />
                      ))}
                      {hasSecondary && hasMenu && <DropdownMenuSeparator className="md:hidden" />}
                      {menuActions.map((a, i) => (
                        <ActionMenuItem key={a.id ?? `${a.label}-${i}`} action={a} />
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}
        </div>
      </PageContainer>
    </header>
  );
}
