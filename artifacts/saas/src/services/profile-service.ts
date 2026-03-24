import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  role: string;
}

export interface Company {
  id: string;
  name: string;
}

export async function getProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single();
  if (error) return null;
  return data;
}

export async function updateProfile(updates: Partial<Pick<Profile, "full_name" | "role">>): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  return !error;
}

export async function getCompany(): Promise<Company | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .single();
  if (error) return null;
  return data;
}

export async function updateCompanyName(name: string): Promise<boolean> {
  if (!supabase) return false;
  const profile = await getProfile();
  if (!profile) return false;
  const { error } = await supabase
    .from("companies")
    .update({ name })
    .eq("id", profile.company_id);
  return !error;
}
