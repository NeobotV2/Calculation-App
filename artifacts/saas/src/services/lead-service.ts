import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trackLeadCaptured } from "@/services/analytics-service";

/* ─────────────────────────────────────────────────────────────────────────
   Lead-/E-Mail-Erfassung für den Funnel (mid-funnel Lead Capture).

   Reihenfolge der Zustellung:
   1. Eigener Provider (z. B. Mailchimp/Brevo) via setLeadProvider() — Vorrang.
   2. Supabase-Tabelle `leads` (siehe migrations/002_leads.sql), wenn konfiguriert.
   3. Lokaler Fallback (localStorage), damit nichts verloren geht und das
      Analytics-Event (`lead_captured`) in jedem Fall ausgelöst wird.

   submitLead() wirft nie — die UI bekommt immer ein definiertes Ergebnis.
   ───────────────────────────────────────────────────────────────────────── */

export interface LeadInput {
  email: string;
  company?: string;
  role?: string;
  source?: string;
}

export interface LeadResult {
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_KEY = "cleancalc-leads";

let leadProvider: ((lead: Required<Pick<LeadInput, "email" | "source">> & LeadInput) => Promise<void>) | null = null;

/** Externen E-Mail-/CRM-Provider registrieren (optional). */
export function setLeadProvider(provider: typeof leadProvider): void {
  leadProvider = provider;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

function storeLocally(lead: LeadInput): void {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const existing: unknown[] = raw ? JSON.parse(raw) : [];
    existing.push({ ...lead, ts: Date.now() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(existing));
  } catch {
    // localStorage nicht verfügbar — ignorieren.
  }
}

export async function submitLead(input: LeadInput): Promise<LeadResult> {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." };
  }

  const lead = {
    email,
    company: input.company?.trim() || undefined,
    role: input.role?.trim() || undefined,
    source: input.source || "landing",
  };

  trackLeadCaptured(lead.source);

  // 1. Eigener Provider
  if (leadProvider) {
    try {
      await leadProvider(lead);
      return { ok: true };
    } catch {
      storeLocally(lead);
      return { ok: false, error: "Eintragen fehlgeschlagen. Bitte später erneut versuchen." };
    }
  }

  // 2. Supabase
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("leads").insert({
      email: lead.email,
      company: lead.company ?? null,
      role: lead.role ?? null,
      source: lead.source,
    });
    // 23505 = Unique-Violation → E-Mail bereits eingetragen, gilt als Erfolg.
    if (error && error.code !== "23505") {
      storeLocally(lead);
      return { ok: false, error: "Eintragen fehlgeschlagen. Bitte später erneut versuchen." };
    }
    return { ok: true };
  }

  // 3. Lokaler Fallback
  storeLocally(lead);
  return { ok: true };
}
