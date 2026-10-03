import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS, settingsHref, type SettingsSectionId } from "./settings-sections";

/** Linke Unternavigation der Einstellungen (ab lg). */
export function SettingsNav({ active, className }: { active: SettingsSectionId; className?: string }) {
  return (
    <nav aria-label="Einstellungsbereiche" className={className}>
      <ul className="space-y-1">
        {SETTINGS_SECTIONS.map((s) => {
          const Icon = s.icon;
          const current = s.id === active;
          return (
            <li key={s.id}>
              <Link
                href={settingsHref(s.id)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  current ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bereichsliste der Einstellungen (Phone/Tablet ohne gewählten Bereich). */
export function SettingsSectionList() {
  return (
    <nav aria-label="Einstellungsbereiche">
      <Card padding="none" as="div">
        <ul className="divide-y divide-border">
          {SETTINGS_SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <ListRow
                key={s.id}
                as="li"
                href={settingsHref(s.id)}
                leading={
                  <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icon className="size-4" strokeWidth={2} />
                  </span>
                }
                title={s.label}
                meta={s.description}
              />
            );
          })}
        </ul>
      </Card>
    </nav>
  );
}
