import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  role: string;
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

