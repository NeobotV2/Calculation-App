import { supabase } from "@/lib/supabase";
import type { FrequencyKey } from "@/store/use-store";

export interface CompanySettings {
  hourly_rate: number;
  vat_rate: number;
  default_frequency: FrequencyKey;
  pdf_header: string;
  pdf_footer: string;
  company_street: string;
  company_zip: string;
  company_city: string;
  company_phone: string;
  company_email: string;
  company_tax_number: string;
  company_vat_id: string;
  company_managing_director: string;
}

export async function getSettings(): Promise<CompanySettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("company_settings")
    .select("hourly_rate, vat_rate, default_frequency, pdf_header, pdf_footer, company_street, company_zip, company_city, company_phone, company_email, company_tax_number, company_vat_id, company_managing_director")
    .single();
  if (error) return null;
  return {
    hourly_rate: Number(data.hourly_rate),
    vat_rate: Number(data.vat_rate),
    default_frequency: data.default_frequency as FrequencyKey,
    pdf_header: data.pdf_header ?? "",
    pdf_footer: data.pdf_footer ?? "",
    company_street: data.company_street ?? "",
    company_zip: data.company_zip ?? "",
    company_city: data.company_city ?? "",
    company_phone: data.company_phone ?? "",
    company_email: data.company_email ?? "",
    company_tax_number: data.company_tax_number ?? "",
    company_vat_id: data.company_vat_id ?? "",
    company_managing_director: data.company_managing_director ?? "",
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
