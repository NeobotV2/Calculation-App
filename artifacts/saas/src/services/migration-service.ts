import { supabase } from "@/lib/supabase";
import { useStore, type Project, type Template, type CustomRoomType } from "@/store/use-store";
import * as objectService from "./object-service";
import * as templateService from "./template-service";
import * as customRoomTypeService from "./custom-room-type-service";
import * as settingsService from "./settings-service";
import { updateCompanyName } from "./company-service";

export interface DemoData {
  projects: Project[];
  templates: Template[];
  customRoomTypes: CustomRoomType[];
  companyName: string;
  hourlyRate: number;
  vatRate: number;
  defaultFrequency: string;
  pdfHeader: string;
  pdfFooter: string;
}

export function getDemoData(): DemoData | null {
  const state = useStore.getState();
  const hasData =
    state.projects.length > 0 ||
    state.templates.length > 0 ||
    state.customRoomTypes.length > 0;

  if (!hasData) return null;

  return {
    projects: state.projects,
    templates: state.templates,
    customRoomTypes: state.customRoomTypes,
    companyName: state.companyName,
    hourlyRate: state.hourlyRate,
    vatRate: state.vatRate,
    defaultFrequency: state.defaultFrequency,
    pdfHeader: state.pdfHeader,
    pdfFooter: state.pdfFooter,
  };
}

export async function migrateDemoData(data: DemoData): Promise<boolean> {
  if (!supabase) return false;

  let allSucceeded = true;

  try {
    const companyResult = await updateCompanyName(data.companyName);
    if (!companyResult) allSucceeded = false;

    const settingsResult = await settingsService.updateSettings({
      hourly_rate: data.hourlyRate,
      vat_rate: data.vatRate,
      default_frequency: data.defaultFrequency as settingsService.CompanySettings["default_frequency"],
      pdf_header: data.pdfHeader,
      pdf_footer: data.pdfFooter,
    });
    if (!settingsResult) allSucceeded = false;

    for (const project of data.projects) {
      const newId = await objectService.createObject(project.name, project.customer);
      if (newId) {
        if (project.location || project.notes || project.hourlyRate) {
          await objectService.updateObject(newId, {
            location: project.location,
            notes: project.notes,
            hourlyRate: project.hourlyRate,
            status: project.status,
          });
        }
        for (const room of project.rooms) {
          const { id: _id, ...roomData } = room;
          const roomResult = await objectService.addRoom(newId, roomData);
          if (!roomResult) allSucceeded = false;
        }
      } else {
        allSucceeded = false;
      }
    }

    for (const template of data.templates) {
      const result = await templateService.createTemplate(template.name, template.rooms);
      if (!result) allSucceeded = false;
    }

    for (const rt of data.customRoomTypes) {
      const { id: _id, ...rtData } = rt;
      const result = await customRoomTypeService.createCustomRoomType(rtData);
      if (!result) allSucceeded = false;
    }

    if (allSucceeded) {
      clearDemoData();
    }

    return allSucceeded;
  } catch {
    return false;
  }
}

export function clearDemoData() {
  useStore.getState().resetAll();
}

export function hasDemoData(): boolean {
  const state = useStore.getState();
  return state.projects.length > 0 || state.templates.length > 0;
}
