import { supabase } from "@/lib/supabase";
import type { Room, Template } from "@/store/use-store";

interface DbTemplate {
  id: string;
  company_id: string;
  name: string;
  rooms: Omit<Room, "id">[];
  created_at: string;
}

async function getCompanyId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("company_id").single();
  return data?.company_id || null;
}

export async function getAllTemplates(): Promise<Template[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((t: DbTemplate) => ({
    id: t.id,
    name: t.name,
    rooms: t.rooms || [],
    createdAt: t.created_at,
  }));
}

export async function createTemplate(name: string, rooms: Omit<Room, "id">[]): Promise<string | null> {
  if (!supabase) return null;
  const companyId = await getCompanyId();
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("templates")
    .insert({ company_id: companyId, name, rooms })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("templates").delete().eq("id", id);
  return !error;
}

export async function renameTemplate(id: string, name: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("templates").update({ name }).eq("id", id);
  return !error;
}
