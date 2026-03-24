import { supabase } from "@/lib/supabase";
import type { FrequencyKey } from "@/store/use-store";

export interface CompanySettings {
  hourly_rate: number;
  vat_rate: number;
  default_frequency: FrequencyKey;
  pdf_header: string;
  pdf_footer: string;
}

export async function getSettings(): Promise<CompanySettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("company_settings")
    .select("hourly_rate, vat_rate, default_frequency, pdf_header, pdf_footer")
    .single();
  if (error) return null;
  return {
    hourly_rate: Number(data.hourly_rate),
    vat_rate: Number(data.vat_rate),
    default_frequency: data.default_frequency as FrequencyKey,
    pdf_header: data.pdf_header,
    pdf_footer: data.pdf_footer,
  };
}

export async function updateSettings(updates: Partial<CompanySettings>): Promise<boolean> {
  if (!supabase) return false;
  const { data: profile } = await supabase.from("profiles").select("company_id").single();
  if (!profile) return false;
  const { error } = await supabase
    .from("company_settings")
    .update(updates)
    .eq("company_id", profile.company_id);
  return !error;
}
