import { supabase } from "@/lib/supabase";

export interface Company {
  id: string;
  name: string;
}

export interface CompanySettings {
  hourly_rate: number;
  vat_rate: number;
  default_frequency: string;
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

async function getCompanyId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("company_id").single();
  return data?.company_id || null;
}

export async function getCompany(): Promise<Company | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("companies").select("*").single();
  if (error) return null;
  return data;
}

export async function updateCompanyName(name: string): Promise<boolean> {
  if (!supabase) return false;
  const companyId = await getCompanyId();
  if (!companyId) return false;
  const { error } = await supabase.from("companies").update({ name }).eq("id", companyId);
  return !error;
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .single();
  if (error) return null;
  return {
    hourly_rate: Number(data.hourly_rate),
    vat_rate: Number(data.vat_rate),
    default_frequency: data.default_frequency ?? "5x_week",
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

export async function updateCompanySettings(updates: Partial<CompanySettings>): Promise<boolean> {
  if (!supabase) return false;
  const companyId = await getCompanyId();
  if (!companyId) return false;
  const { error } = await supabase.from("company_settings").update(updates).eq("company_id", companyId);
  return !error;
}
