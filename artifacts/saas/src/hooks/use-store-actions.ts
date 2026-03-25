import { useCallback } from "react";
import { useStore, type Room, type Project, type CustomRoomType } from "@/store/use-store";
import { useAuth } from "@/lib/auth-context";
import * as objectService from "@/services/object-service";
import * as templateService from "@/services/template-service";
import * as customRoomTypeService from "@/services/custom-room-type-service";
import * as settingsService from "@/services/settings-service";
import { updateCompanyName } from "@/services/company-service";
import { useSupabaseSync } from "@/hooks/use-supabase-sync";

export function useStoreActions() {
  const { isAuthenticated } = useAuth();
  const { reload } = useSupabaseSync();

  const addProject = useCallback(async (name: string, customer?: string): Promise<string> => {
    if (isAuthenticated) {
      const id = await objectService.createObject(name, customer);
      if (id) {
        await reload();
        return id;
      }
      throw new Error("Objekt konnte nicht erstellt werden.");
    }
    return useStore.getState().addProject(name, customer);
  }, [isAuthenticated, reload]);

  const updateProject = useCallback(async (id: string, data: Partial<Omit<Project, "id" | "createdAt" | "rooms">>): Promise<void> => {
    if (isAuthenticated) {
      const success = await objectService.updateObject(id, data);
      if (!success) throw new Error("Objekt konnte nicht aktualisiert werden.");
      await reload();
      return;
    }
    useStore.getState().updateProject(id, data);
  }, [isAuthenticated, reload]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    if (isAuthenticated) {
      const success = await objectService.deleteObject(id);
      if (!success) throw new Error("Objekt konnte nicht gelöscht werden.");
      await reload();
      return;
    }
    useStore.getState().deleteProject(id);
  }, [isAuthenticated, reload]);

  const duplicateProject = useCallback(async (id: string): Promise<string> => {
    if (isAuthenticated) {
      const newId = await objectService.duplicateObject(id);
      if (newId) {
        await reload();
        return newId;
      }
      throw new Error("Objekt konnte nicht dupliziert werden.");
    }
    return useStore.getState().duplicateProject(id);
  }, [isAuthenticated, reload]);

  const archiveProject = useCallback(async (id: string): Promise<void> => {
    if (isAuthenticated) {
      const success = await objectService.updateObject(id, { status: "archived" });
      if (!success) throw new Error("Objekt konnte nicht archiviert werden.");
      await reload();
      return;
    }
    useStore.getState().archiveProject(id);
  }, [isAuthenticated, reload]);

  const restoreProject = useCallback(async (id: string): Promise<void> => {
    if (isAuthenticated) {
      const success = await objectService.updateObject(id, { status: "active" });
      if (!success) throw new Error("Objekt konnte nicht wiederhergestellt werden.");
      await reload();
      return;
    }
    useStore.getState().restoreProject(id);
  }, [isAuthenticated, reload]);

  const addRoom = useCallback(async (projectId: string, room: Omit<Room, "id">): Promise<void> => {
    if (isAuthenticated) {
      const id = await objectService.addRoom(projectId, room);
      if (!id) throw new Error("Raum konnte nicht hinzugefügt werden.");
      await reload();
      return;
    }
    useStore.getState().addRoom(projectId, room);
  }, [isAuthenticated, reload]);

  const updateRoom = useCallback(async (projectId: string, roomId: string, roomData: Partial<Room>): Promise<void> => {
    if (isAuthenticated) {
      const success = await objectService.updateRoom(roomId, roomData);
      if (!success) throw new Error("Raum konnte nicht aktualisiert werden.");
      await reload();
      return;
    }
    useStore.getState().updateRoom(projectId, roomId, roomData);
  }, [isAuthenticated, reload]);

  const deleteRoom = useCallback(async (projectId: string, roomId: string): Promise<void> => {
    if (isAuthenticated) {
      const success = await objectService.deleteRoom(roomId);
      if (!success) throw new Error("Raum konnte nicht gelöscht werden.");
      await reload();
      return;
    }
    useStore.getState().deleteRoom(projectId, roomId);
  }, [isAuthenticated, reload]);

  const addTemplate = useCallback(async (name: string, rooms: Omit<Room, "id">[]): Promise<void> => {
    if (isAuthenticated) {
      const id = await templateService.createTemplate(name, rooms);
      if (!id) throw new Error("Vorlage konnte nicht erstellt werden.");
      await reload();
      return;
    }
    useStore.getState().addTemplate(name, rooms);
  }, [isAuthenticated, reload]);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    if (isAuthenticated) {
      const success = await templateService.deleteTemplate(id);
      if (!success) throw new Error("Vorlage konnte nicht gelöscht werden.");
      await reload();
      return;
    }
    useStore.getState().deleteTemplate(id);
  }, [isAuthenticated, reload]);

  const renameTemplate = useCallback(async (id: string, name: string): Promise<void> => {
    if (isAuthenticated) {
      const success = await templateService.renameTemplate(id, name);
      if (!success) throw new Error("Vorlage konnte nicht umbenannt werden.");
      await reload();
      return;
    }
    useStore.getState().renameTemplate(id, name);
  }, [isAuthenticated, reload]);

  const loadTemplate = useCallback(async (templateId: string, projectName: string): Promise<string> => {
    if (isAuthenticated) {
      const store = useStore.getState();
      const tpl = store.templates.find((t) => t.id === templateId);
      if (!tpl) throw new Error("Vorlage nicht gefunden.");
      const newId = await objectService.createObject(projectName);
      if (!newId) throw new Error("Objekt konnte nicht erstellt werden.");
      for (const room of tpl.rooms) {
        await objectService.addRoom(newId, room);
      }
      await reload();
      return newId;
    }
    return useStore.getState().loadTemplate(templateId, projectName);
  }, [isAuthenticated, reload]);

  const addCustomRoomType = useCallback(async (rt: Omit<CustomRoomType, "id">): Promise<void> => {
    if (isAuthenticated) {
      const id = await customRoomTypeService.createCustomRoomType(rt);
      if (!id) throw new Error("Raumart konnte nicht erstellt werden.");
      await reload();
      return;
    }
    useStore.getState().addCustomRoomType(rt);
  }, [isAuthenticated, reload]);

  const updateCustomRoomType = useCallback(async (id: string, data: Partial<Omit<CustomRoomType, "id">>): Promise<void> => {
    if (isAuthenticated) {
      const success = await customRoomTypeService.updateCustomRoomType(id, data);
      if (!success) throw new Error("Raumart konnte nicht aktualisiert werden.");
      await reload();
      return;
    }
    useStore.getState().updateCustomRoomType(id, data);
  }, [isAuthenticated, reload]);

  const deleteCustomRoomType = useCallback(async (id: string): Promise<void> => {
    if (isAuthenticated) {
      const success = await customRoomTypeService.deleteCustomRoomType(id);
      if (!success) throw new Error("Raumart konnte nicht gelöscht werden.");
      await reload();
      return;
    }
    useStore.getState().deleteCustomRoomType(id);
  }, [isAuthenticated, reload]);

  const updateSettings = useCallback(async (data: {
    companyName?: string;
    companyStreet?: string;
    companyZip?: string;
    companyCity?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyTaxNumber?: string;
    companyVatId?: string;
    companyManagingDirector?: string;
    hourlyRate?: number;
    vatRate?: number;
    defaultFrequency?: string;
    pdfHeader?: string;
    pdfFooter?: string;
  }): Promise<void> => {
    if (isAuthenticated) {
      const dbUpdates: Record<string, unknown> = {};
      if (data.hourlyRate !== undefined) dbUpdates.hourly_rate = data.hourlyRate;
      if (data.vatRate !== undefined) dbUpdates.vat_rate = data.vatRate;
      if (data.defaultFrequency !== undefined) dbUpdates.default_frequency = data.defaultFrequency;
      if (data.pdfHeader !== undefined) dbUpdates.pdf_header = data.pdfHeader;
      if (data.pdfFooter !== undefined) dbUpdates.pdf_footer = data.pdfFooter;
      if (data.companyStreet !== undefined) dbUpdates.company_street = data.companyStreet;
      if (data.companyZip !== undefined) dbUpdates.company_zip = data.companyZip;
      if (data.companyCity !== undefined) dbUpdates.company_city = data.companyCity;
      if (data.companyPhone !== undefined) dbUpdates.company_phone = data.companyPhone;
      if (data.companyEmail !== undefined) dbUpdates.company_email = data.companyEmail;
      if (data.companyTaxNumber !== undefined) dbUpdates.company_tax_number = data.companyTaxNumber;
      if (data.companyVatId !== undefined) dbUpdates.company_vat_id = data.companyVatId;
      if (data.companyManagingDirector !== undefined) dbUpdates.company_managing_director = data.companyManagingDirector;

      if (data.companyName !== undefined) {
        await updateCompanyName(data.companyName);
      }
      if (Object.keys(dbUpdates).length > 0) {
        await settingsService.updateSettings(dbUpdates as Parameters<typeof settingsService.updateSettings>[0]);
      }
      await reload();
      return;
    }
    const store = useStore.getState();
    if (data.companyName !== undefined) store.updateSettings({ companyName: data.companyName });
    if (data.companyStreet !== undefined) store.updateSettings({ companyStreet: data.companyStreet });
    if (data.companyZip !== undefined) store.updateSettings({ companyZip: data.companyZip });
    if (data.companyCity !== undefined) store.updateSettings({ companyCity: data.companyCity });
    if (data.companyPhone !== undefined) store.updateSettings({ companyPhone: data.companyPhone });
    if (data.companyEmail !== undefined) store.updateSettings({ companyEmail: data.companyEmail });
    if (data.companyTaxNumber !== undefined) store.updateSettings({ companyTaxNumber: data.companyTaxNumber });
    if (data.companyVatId !== undefined) store.updateSettings({ companyVatId: data.companyVatId });
    if (data.companyManagingDirector !== undefined) store.updateSettings({ companyManagingDirector: data.companyManagingDirector });
    if (data.hourlyRate !== undefined) store.updateSettings({ hourlyRate: data.hourlyRate });
    if (data.vatRate !== undefined) store.updateSettings({ vatRate: data.vatRate });
    if (data.defaultFrequency !== undefined) store.updateSettings({ defaultFrequency: data.defaultFrequency as import("@/store/use-store").FrequencyKey });
    if (data.pdfHeader !== undefined) store.updateSettings({ pdfHeader: data.pdfHeader });
    if (data.pdfFooter !== undefined) store.updateSettings({ pdfFooter: data.pdfFooter });
  }, [isAuthenticated, reload]);

  return {
    addProject,
    updateProject,
    deleteProject,
    duplicateProject,
    archiveProject,
    restoreProject,
    addRoom,
    updateRoom,
    deleteRoom,
    addTemplate,
    deleteTemplate,
    renameTemplate,
    loadTemplate,
    addCustomRoomType,
    updateCustomRoomType,
    deleteCustomRoomType,
    updateSettings,
  };
}
