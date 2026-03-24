import { supabase } from "@/lib/supabase";
import type { Project, Room } from "@/store/use-store";

interface DbObject {
  id: string;
  company_id: string;
  name: string;
  customer: string | null;
  location: string | null;
  notes: string | null;
  hourly_rate: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

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

function dbObjectToProject(obj: DbObject, rooms: DbRoom[]): Project {
  return {
    id: obj.id,
    name: obj.name,
    customer: obj.customer || undefined,
    location: obj.location || undefined,
    notes: obj.notes || undefined,
    hourlyRate: obj.hourly_rate ? Number(obj.hourly_rate) : undefined,
    status: obj.status as "active" | "archived",
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
    rooms: rooms.map((r) => ({
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
    })),
  };
}

async function getCompanyId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("company_id").single();
  return data?.company_id || null;
}

export async function getAllObjects(): Promise<Project[]> {
  if (!supabase) return [];
  const { data: objects, error } = await supabase
    .from("cleaning_objects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !objects) return [];

  const objectIds = objects.map((o: DbObject) => o.id);
  if (objectIds.length === 0) return objects.map((o: DbObject) => dbObjectToProject(o, []));

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .in("object_id", objectIds);

  const roomsByObject = new Map<string, DbRoom[]>();
  (rooms || []).forEach((r: DbRoom) => {
    const list = roomsByObject.get(r.object_id) || [];
    list.push(r);
    roomsByObject.set(r.object_id, list);
  });

  return objects.map((o: DbObject) => dbObjectToProject(o, roomsByObject.get(o.id) || []));
}

export async function createObject(name: string, customer?: string): Promise<string | null> {
  if (!supabase) return null;
  const companyId = await getCompanyId();
  if (!companyId) return null;

  const { data, error } = await supabase
    .from("cleaning_objects")
    .insert({ company_id: companyId, name, customer: customer || null })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}

export async function updateObject(
  id: string,
  updates: Partial<Pick<Project, "name" | "customer" | "location" | "notes" | "hourlyRate" | "status">>
): Promise<boolean> {
  if (!supabase) return false;
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.customer !== undefined) dbUpdates.customer = updates.customer || null;
  if (updates.location !== undefined) dbUpdates.location = updates.location || null;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
  if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  const { error } = await supabase
    .from("cleaning_objects")
    .update(dbUpdates)
    .eq("id", id);
  return !error;
}

export async function deleteObject(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("cleaning_objects").delete().eq("id", id);
  return !error;
}

export async function duplicateObject(id: string): Promise<string | null> {
  if (!supabase) return null;
  const companyId = await getCompanyId();
  if (!companyId) return null;

  const { data: original } = await supabase
    .from("cleaning_objects")
    .select("*")
    .eq("id", id)
    .single();
  if (!original) return null;

  const { data: newObj, error: objError } = await supabase
    .from("cleaning_objects")
    .insert({
      company_id: companyId,
      name: `${original.name} (Kopie)`,
      customer: original.customer,
      location: original.location,
      notes: original.notes,
      hourly_rate: original.hourly_rate,
      status: "active",
    })
    .select("id")
    .single();
  if (objError || !newObj) return null;

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("object_id", id);

  if (rooms && rooms.length > 0) {
    const newRooms = rooms.map((r: DbRoom) => ({
      object_id: newObj.id,
      company_id: companyId,
      name: r.name,
      type_id: r.type_id,
      type_name: r.type_name,
      group_id: r.group_id,
      group_name: r.group_name,
      area: r.area,
      frequency: r.frequency,
      type_performance: r.type_performance,
      custom_performance: r.custom_performance,
      soiling_level: r.soiling_level,
      furnishing_level: r.furnishing_level,
      floor_type: r.floor_type,
    }));
    await supabase.from("rooms").insert(newRooms);
  }

  return newObj.id;
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
