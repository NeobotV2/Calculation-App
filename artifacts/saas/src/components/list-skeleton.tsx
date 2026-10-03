import { Skeleton } from "@/components/ui/skeleton";

/** Platzhalter für Listen (Form wie `DataTable` mobil / `ListRow`). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Lädt"
      className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-surface"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex min-h-14 items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Platzhalter für Kennzahlen (Form wie `KpiGroup`). */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Lädt"
      className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-surface"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 bg-card p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Platzhalter für Detailseiten (Kopf, Kennzahlen, Karte, Liste). */
export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Lädt" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-surface lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 bg-card p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-surface">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
      <ListSkeleton rows={3} />
    </div>
  );
}
