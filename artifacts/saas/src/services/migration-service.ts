import { supabase } from "@/lib/supabase";
import { isDemoProject, useStore, type Project, type Template, type CustomRoomType } from "@/store/use-store";
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

/** Eigene Objekte; unveränderte Beispielobjekte werden nicht in die Cloud übernommen (dort zählten sie zum Limit). */
function ownProjects(projects: readonly Project[]): Project[] {
  return projects.filter((p) => !isDemoProject(p));
}

export function getDemoData(): DemoData | null {
  const state = useStore.getState();
  const projects = ownProjects(state.projects);
  const hasData =
    projects.length > 0 ||
    state.templates.length > 0 ||
    state.customRoomTypes.length > 0;

  if (!hasData) return null;

  return {
    projects,
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

export interface MigrationResult {
  /** Alles übertragen; nur dann werden die lokalen Daten gelöscht. */
  ok: boolean;
  /**
   * Die Datenbank kennt die Modul-Spalten nicht (Migration 005 fehlt):
   * Grunddaten und Räume sind übertragen, Winterdienst/HMS nicht.
   */
  migrationMissing: boolean;
}

/** Wie `migrateDemoDataDetailed`, nur das Gesamtergebnis. */
export async function migrateDemoData(data: DemoData): Promise<boolean> {
  return (await migrateDemoDataDetailed(data)).ok;
}

export async function migrateDemoDataDetailed(data: DemoData): Promise<MigrationResult> {
  if (!supabase) return { ok: false, migrationMissing: false };

  let allSucceeded = true;
  let migrationMissing = false;

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
        // Immer übertragen — sonst gingen Objektart, Ansprechpartner, Rüst-/Wegezeit,
        // Satz, Status und die Leistungsmodule (Winterdienst/HMS inkl. Ist-Daten) verloren.
        const base = {
          location: project.location,
          notes: project.notes,
          hourlyRate: project.hourlyRate,
          status: project.status,
          objectType: project.objectType,
          rpiContactName: project.rpiContactName,
          ruestzeit: project.ruestzeit,
          wegezeit: project.wegezeit,
        };
        const modules = {
          ...(project.winterdienst ? { winterdienst: project.winterdienst } : {}),
          ...(project.hms ? { hms: project.hms } : {}),
          ...(project.serviceActuals ? { serviceActuals: project.serviceActuals } : {}),
        };
        let ok: boolean;
        try {
          ok = await objectService.updateObject(newId, { ...base, ...modules });
        } catch (err) {
          if (err instanceof objectService.ServiceModulesMigrationError) {
            // Migration 005 fehlt: die Grunddaten trotzdem übertragen, nur die Module fehlen.
            migrationMissing = true;
            await objectService.updateObject(newId, base).catch(() => false);
          }
          ok = false;
        }
        if (!ok) allSucceeded = false;
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

    return { ok: allSucceeded, migrationMissing };
  } catch {
    return { ok: false, migrationMissing };
  }
}

export function clearDemoData() {
  useStore.getState().resetAll();
}

export function hasDemoData(): boolean {
  const state = useStore.getState();
  return ownProjects(state.projects).length > 0 || state.templates.length > 0 || state.customRoomTypes.length > 0;
}
