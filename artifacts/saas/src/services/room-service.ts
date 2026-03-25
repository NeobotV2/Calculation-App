import { supabase } from "@/lib/supabase";
import type { Room } from "@/store/use-store";

interface DbRoom {
  id: string;
  object_id: string;
  company_id: string;
  name: string;
  type_id: string;
  type_name: string;
  group_id: string;
  group_name: string;
  area: number;
  frequency: string;
  type_performance: number;
  custom_performance: number | null;
  soiling_level: string | null;
  furnishing_level: string | null;
  floor_type: string | null;
  created_at: string;
  updated_at: string;
}

async function getCompanyId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("company_id").single();
  return data?.company_id || null;
}

export function dbRoomToRoom(r: DbRoom): Room {
  return {
    id: r.id,
    name: r.name,
    typeId: r.type_id,
    typeName: r.type_name,
    groupId: r.group_id,
    groupName: r.group_name,
    area: Number(r.area),
    frequency: r.frequency as Room["frequency"],
    typePerformance: Number(r.type_performance),
    customPerformance: r.custom_performance ? Number(r.custom_performance) : undefined,
    soilingLevel: r.soiling_level || undefined,
    furnishingLevel: r.furnishing_level || undefined,
    floorType: r.floor_type || undefined,
  };
}

export async function getRoomsByObjectId(objectId: string): Promise<Room[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("object_id", objectId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(dbRoomToRoom);
}

export async function addRoom(objectId: string, room: Omit<Room, "id">): Promise<string | null> {
  if (!supabase) return null;
  const companyId = await getCompanyId();
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      object_id: objectId,
      company_id: companyId,
      name: room.name,
      type_id: room.typeId,
      type_name: room.typeName,
      group_id: room.groupId,
      group_name: room.groupName,
      area: room.area,
      frequency: room.frequency,
      type_performance: room.typePerformance,
      custom_performance: room.customPerformance || null,
      soiling_level: room.soilingLevel || null,
      furnishing_level: room.furnishingLevel || null,
      floor_type: room.floorType || null,
    })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<boolean> {
  if (!supabase) return false;
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.typeId !== undefined) dbUpdates.type_id = updates.typeId;
  if (updates.typeName !== undefined) dbUpdates.type_name = updates.typeName;
  if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
  if (updates.groupName !== undefined) dbUpdates.group_name = updates.groupName;
  if (updates.area !== undefined) dbUpdates.area = updates.area;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  if (updates.typePerformance !== undefined) dbUpdates.type_performance = updates.typePerformance;
  if (updates.customPerformance !== undefined) dbUpdates.custom_performance = updates.customPerformance || null;
  if (updates.soilingLevel !== undefined) dbUpdates.soiling_level = updates.soilingLevel || null;
  if (updates.furnishingLevel !== undefined) dbUpdates.furnishing_level = updates.furnishingLevel || null;
  if (updates.floorType !== undefined) dbUpdates.floor_type = updates.floorType || null;

  const { error } = await supabase.from("rooms").update(dbUpdates).eq("id", roomId);
  return !error;
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  return !error;
}
