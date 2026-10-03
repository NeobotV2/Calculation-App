import { Link } from "wouter";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
] as const;

/** Rechtliche Links am Seitenende. */
export function AppFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("no-print pb-6 pt-2", className)}>
      <nav aria-label="Rechtliches">
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {LINKS.map((l, i) => (
            <li key={l.href} className="flex items-center gap-4">
              {i > 0 && <span aria-hidden="true" className="size-1 rounded-full bg-border-strong" />}
              <Link
                href={l.href}
                className="inline-flex items-center rounded-xs underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-10"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
