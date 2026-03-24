import { Link } from "wouter";

export function AppFooter() {
  return (
    <div className="px-6 pb-6 pt-2">
      <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/60">
        <Link href="/impressum" className="hover:text-muted-foreground transition-colors">Impressum</Link>
        <span className="w-0.5 h-0.5 rounded-full bg-border" />
        <Link href="/datenschutz" className="hover:text-muted-foreground transition-colors">Datenschutz</Link>
        <span className="w-0.5 h-0.5 rounded-full bg-border" />
        <Link href="/agb" className="hover:text-muted-foreground transition-colors">AGB</Link>
      </div>
    </div>
  );
}
