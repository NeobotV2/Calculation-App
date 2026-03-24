import { supabase } from "@/lib/supabase";
import type { CustomRoomType } from "@/store/use-store";

interface DbCustomRoomType {
  id: string;
  company_id: string;
  name: string;
  group_id: string;
  group_name: string;
  performance_value: number;
  created_at: string;
}

async function getCompanyId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("company_id").single();
  return data?.company_id || null;
}

export async function getAllCustomRoomTypes(): Promise<CustomRoomType[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("custom_room_types")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r: DbCustomRoomType) => ({
    id: r.id,
    name: r.name,
    groupId: r.group_id,
    groupName: r.group_name,
    performanceValue: Number(r.performance_value),
  }));
}

export async function createCustomRoomType(
  rt: Omit<CustomRoomType, "id">
): Promise<string | null> {
  if (!supabase) return null;
  const companyId = await getCompanyId();
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("custom_room_types")
    .insert({
      company_id: companyId,
      name: rt.name,
      group_id: rt.groupId,
      group_name: rt.groupName,
      performance_value: rt.performanceValue,
    })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

export async function updateCustomRoomType(
  id: string,
  updates: Partial<Omit<CustomRoomType, "id">>
): Promise<boolean> {
  if (!supabase) return false;
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
  if (updates.groupName !== undefined) dbUpdates.group_name = updates.groupName;
  if (updates.performanceValue !== undefined) dbUpdates.performance_value = updates.performanceValue;

  const { error } = await supabase
    .from("custom_room_types")
    .update(dbUpdates)
    .eq("id", id);
  return !error;
}

export async function deleteCustomRoomType(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("custom_room_types").delete().eq("id", id);
  return !error;
}
