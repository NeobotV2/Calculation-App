/* ─────────────────────────────────────────────────────────────────────────
   Ausschreibung: Seitenzustand ⇄ Store-Slice `tenderDraft`.
   Lokaler Zustand für flüssiges Tippen, verzögert (debounced) im Store
   gesichert und beim Verlassen der Seite sofort geschrieben. Ein leerer
   Entwurf wird nicht gespeichert (Slice = null).
   ───────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store/use-store";
import { createEmptyTenderDraft, isTenderDraftEmpty, type TenderDraft } from "@/lib/drafts";

export const TENDER_DRAFT_DEBOUNCE_MS = 400;

export type TenderDraftPatch = Partial<Omit<TenderDraft, "version" | "savedAt">>;

export interface TenderDraftApi {
  draft: TenderDraft;
  /** Felder ändern (Objekt-Patch oder Funktion auf dem aktuellen Stand). */
  update: (patch: TenderDraftPatch | ((d: TenderDraft) => TenderDraftPatch)) => void;
  /** „Neue Ausschreibung": alles leeren und den Store-Entwurf löschen. */
  clear: () => void;
  /** Zeitpunkt der letzten Sicherung im Store (ISO) oder null. */
  savedAt: string | null;
  isEmpty: boolean;
}

/** „HH:mm" in deutscher Schreibweise. */
export function formatDraftTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function useTenderDraft(): TenderDraftApi {
  const stored = useStore((s) => s.tenderDraft);
  const setTenderDraft = useStore((s) => s.setTenderDraft);
  const [draft, setDraft] = useState<TenderDraft>(() => stored ?? createEmptyTenderDraft());
  const latest = useRef(draft);
  const pending = useRef(false);

  const persist = useCallback(
    (d: TenderDraft) => {
      pending.current = false;
      setTenderDraft(isTenderDraftEmpty(d) ? null : { ...d, savedAt: new Date().toISOString() });
    },
    [setTenderDraft],
  );

  // Verzögert sichern, sobald der Nutzer etwas geändert hat.
  useEffect(() => {
    latest.current = draft;
    if (!pending.current) return;
    const t = window.setTimeout(() => persist(draft), TENDER_DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [draft, persist]);

  // Beim Verlassen der Seite ausstehende Änderungen sofort schreiben.
  useEffect(
    () => () => {
      if (pending.current) persist(latest.current);
    },
    [persist],
  );

  const update = useCallback<TenderDraftApi["update"]>((patch) => {
    pending.current = true;
    setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
  }, []);

  const clear = useCallback(() => {
    pending.current = false;
    const empty = createEmptyTenderDraft();
    latest.current = empty;
    setDraft(empty);
    setTenderDraft(null);
  }, [setTenderDraft]);

  return { draft, update, clear, savedAt: stored?.savedAt ?? null, isEmpty: isTenderDraftEmpty(draft) };
}
