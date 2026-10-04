import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import capacitorStorage from "@/lib/capacitor-storage";
import { type HourlyRateConfig, adoptedRate, getDefaultConfig, calcHourlyRate, isDefaultRateSetting, suggestedDefaultRate, DEFAULT_SCHICHTZUSCHLAEGE } from "@/lib/hourly-rate-calc";
import { type ThemeMode } from "@/lib/tokens";
import { type PlanId } from "@/lib/billing-config";
import type { HmsConfig, ServiceActuals, WinterdienstConfig } from "@/lib/service-modules/types";
import { sanitizeHms, sanitizeServiceActuals, sanitizeWinterdienst } from "@/lib/service-modules/sanitize";
import type { CalcDraft, TenderDraft } from "@/lib/drafts";

export type FrequencyKey =
  | "monthly"
  | "biweekly"
  | "1x_week"
  | "2x_week"
  | "3x_week"
  | "4x_week"
  | "5x_week"
  | "6x_week"
  | "7x_week";

export interface RoomType {
  id: string;
  name: string;
  groupId: string;
  performanceValue: number;
}

export interface Room {
  id: string;
  name: string;
  typeId: string;
  typeName: string;
  groupId: string;
  groupName: string;
  area: number;
  frequency: FrequencyKey;
  typePerformance: number;
  customPerformance?: number;
  soilingLevel?: string;
  furnishingLevel?: string;
  floorType?: string;
}

export interface Project {
  id: string;
  name: string;
  customer?: string;
  location?: string;
  notes?: string;
  hourlyRate?: number;
  objectType?: string;
  rpiContactName?: string;
  rpiContactPhone?: string;
  ruestzeit?: number;
  wegezeit?: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  rooms: Room[];
  /** Winterdienst-Modul; undefined = nicht angeboten, enabled:false = pausiert. */
  winterdienst?: WinterdienstConfig;
  /** Hausmeisterservice-Modul; undefined = nicht angeboten, enabled:false = pausiert. */
  hms?: HmsConfig;
  /** Ist-Daten der Modul-Nachkalkulation (synchronisiert, Spalte service_actuals). */
  serviceActuals?: ServiceActuals;
}

export interface Template {
  id: string;
  name: string;
  rooms: Omit<Room, "id">[];
  createdAt: string;
}

export interface CustomRoomType {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  performanceValue: number;
}

/**
 * Nachkalkulation eines Objekts: tatsächlich geleistete Monatsstunden
 * (inkl. aller Reinigungsintervalle) als Basis für den Plan/Ist-Vergleich.
 */
export interface Nachkalkulation {
  actualMonthlyHours: number;
  note?: string;
  recordedAt: string;
}

interface AppState {
  hasSeenSplash: boolean;
  hasOnboarded: boolean;
  isLoggedIn: boolean;
  isDemo: boolean;
  user: { name: string; email: string; role: string } | null;
  plan: PlanId;

  companyName: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxNumber: string;
  companyVatId: string;
  companyManagingDirector: string;
  hourlyRate: number;
  vatRate: number;
  defaultFrequency: FrequencyKey;
  pdfHeader: string;
  pdfFooter: string;
  companyLogo: string;
  customRoomTypes: CustomRoomType[];
  hourlyRateConfig: HourlyRateConfig;
  /**
   * Auf der Seite „Verrechnungssatz“ ausdrücklich bestätigter Satz (auch
   * unveränderte Standardwerte). Entspricht er `hourlyRate`, ist „Verrechnungssatz
   * prüfen“ erledigt und der Hinweis „Standard-Verrechnungssatz“ entfällt.
   */
  confirmedHourlyRate: number | null;
  disabledWarnings: string[];
  targetMargin: number;
  theme: ThemeMode;

  projects: Project[];
  templates: Template[];
  /** Nachkalkulationen je Projekt-ID (optionaler Slice, Default {}). */
  nachkalkulationen: Record<string, Nachkalkulation>;
  /**
   * Automatisch gesicherter Entwurf des Kalkulations-Flows (ein Slot für Neu- UND
   * Bearbeiten-Modus). Persistiert, aber nicht Teil von exportData/importData.
   */
  calcDraft: CalcDraft | null;
  /** Automatisch gesicherter Entwurf der Ausschreibungs-Kalkulation. */
  tenderDraft: TenderDraft | null;

  setHasSeenSplash: () => void;
  completeOnboarding: (data: { role: string; companyName: string; hourlyRate: number; loadDemo: boolean }) => void;
  setDemoUser: (user: { name: string; email: string; role?: string }) => void;
  clearSession: () => void;
  upgradePlan: (plan?: PlanId) => void;
  updateSettings: (data: Partial<{ companyName: string; companyStreet: string; companyZip: string; companyCity: string; companyPhone: string; companyEmail: string; companyTaxNumber: string; companyVatId: string; companyManagingDirector: string; hourlyRate: number; vatRate: number; defaultFrequency: FrequencyKey; pdfHeader: string; pdfFooter: string; companyLogo: string }>) => void;
  updateHourlyRateConfig: (config: HourlyRateConfig) => void;
  /** Verrechnungssatz als geprüft bestätigen (Seite „Verrechnungssatz“). */
  confirmHourlyRate: (rate: number) => void;
  setDisabledWarnings: (warnings: string[]) => void;
  setTargetMargin: (margin: number) => void;
  setTheme: (theme: ThemeMode) => void;

  addProject: (name: string, customer?: string) => string;
  updateProject: (id: string, data: Partial<Omit<Project, "id" | "createdAt" | "rooms">>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => string;
  archiveProject: (id: string) => void;
  restoreProject: (id: string) => void;

  setNachkalkulation: (projectId: string, data: { actualMonthlyHours: number; note?: string }) => void;
  removeNachkalkulation: (projectId: string) => void;

  setCalcDraft: (draft: CalcDraft | null) => void;
  setTenderDraft: (draft: TenderDraft | null) => void;

  addRoom: (projectId: string, room: Omit<Room, "id">) => void;
  updateRoom: (projectId: string, roomId: string, room: Partial<Room>) => void;
  deleteRoom: (projectId: string, roomId: string) => void;
  reorderRooms: (projectId: string, fromIndex: number, toIndex: number) => void;

  addCustomRoomType: (rt: Omit<CustomRoomType, "id">) => void;
  updateCustomRoomType: (id: string, data: Partial<Omit<CustomRoomType, "id">>) => void;
  deleteCustomRoomType: (id: string) => void;

  addTemplate: (name: string, rooms: Omit<Room, "id">[]) => void;
  deleteTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
  loadTemplate: (templateId: string, projectName: string) => string;

  exportData: () => string;
  importData: (json: string) => boolean;
  resetToDefaults: () => void;
  resetAll: () => void;

  _setAuthData: (data: Partial<AppState>) => void;
}

const DEMO_PROJECT: Project = {
  id: "demo-1",
  name: "Bürogebäude Musterstraße",
  customer: "Muster GmbH",
  location: "Berlin, Musterstraße 12",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: "r1", name: "Großraumbüro EG", typeId: "t1", typeName: "Großraumbüro",
      groupId: "g1", groupName: "Büro & Verwaltung", area: 250, frequency: "5x_week", typePerformance: 250,
    },
    {
      id: "r2", name: "Meetingraum Alpha", typeId: "t3", typeName: "Besprechungsraum",
      groupId: "g1", groupName: "Büro & Verwaltung", area: 45, frequency: "3x_week", typePerformance: 220,
    },
    {
      id: "r3", name: "WC Herren", typeId: "t5", typeName: "WC / Sanitär klein",
      groupId: "g2", groupName: "Sanitär", area: 15, frequency: "5x_week", typePerformance: 60,
    },
    {
      id: "r4", name: "Teeküche", typeId: "t11", typeName: "Teeküche",
      groupId: "g4", groupName: "Küche & Sozial", area: 20, frequency: "5x_week", typePerformance: 100,
    },
  ],
};

const DEMO_PROJECT_2: Project = {
  id: "demo-2",
  name: "Arztpraxis Dr. Schmidt",
  customer: "Dr. Schmidt",
  location: "München, Hauptstraße 5",
  status: "active",
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 86400000).toISOString(),
  rooms: [
    {
      id: "r5", name: "Wartezimmer", typeId: "t34", typeName: "Wartezimmer (Praxis)",
      groupId: "g6", groupName: "Medizin & Labor", area: 40, frequency: "5x_week", typePerformance: 120,
    },
    {
      id: "r6", name: "Behandlungsraum 1", typeId: "t31", typeName: "Behandlungsraum",
      groupId: "g6", groupName: "Medizin & Labor", area: 25, frequency: "5x_week", typePerformance: 90,
    },
    {
      id: "r7", name: "WC Patienten", typeId: "t5", typeName: "WC / Sanitär klein",
      groupId: "g2", groupName: "Sanitär", area: 8, frequency: "5x_week", typePerformance: 60,
    },
  ],
};

/** Demo-Objekte (Onboarding „Mit Beispieldaten“); exportiert für Tests und Vergleiche. */
export const DEMO_PROJECTS: readonly Project[] = [DEMO_PROJECT, DEMO_PROJECT_2];

/** JSON mit sortierten Schlüsseln; leere Angaben (undefined, null, "") entfallen. */
function canonicalJson(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v).sort()) {
        const x = (v as Record<string, unknown>)[key];
        if (x === undefined || x === null || x === "") continue;
        out[key] = norm(x);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

/**
 * Inhalt eines Objekts für den Vergleich mit dem Beispiel: ohne ID,
 * Zeitstempel, Status und Raum-IDs; Rüst-/Wegezeit 0 wie nicht gesetzt.
 */
function sampleContentKey(p: Project): string {
  const { id: _id, createdAt: _c, updatedAt: _u, status: _s, rooms, ruestzeit, wegezeit, ...fields } = p;
  return canonicalJson({
    ...fields,
    ruestzeit: ruestzeit || undefined,
    wegezeit: wegezeit || undefined,
    rooms: (rooms ?? []).map(({ id: _roomId, ...room }) => room),
  });
}

const DEMO_CONTENT_BY_ID: ReadonlyMap<string, string> = new Map(DEMO_PROJECTS.map((p) => [p.id, sampleContentKey(p)]));

/**
 * Unverändertes Beispielobjekt aus dem Onboarding („Mit Beispieldaten
 * erkunden“): zählt nicht zum Objektlimit und wird beim Anmelden nicht in die
 * Cloud übernommen. Jede inhaltliche Änderung (Name, Kunde, Räume, Module,
 * Satz, Notizen, Ist-Daten …) macht es zum eigenen Objekt — dann zählt es wie
 * jedes andere und wird übernommen, damit keine Arbeit verloren geht.
 */
export function isDemoProject(p: Project): boolean {
  const sample = DEMO_CONTENT_BY_ID.get(p.id);
  return sample !== undefined && sample === sampleContentKey(p);
}

/** Import-Grenzen der Raum-Nachkalkulation (Ist-Stunden je Monat, Notizlänge). */
const MAX_NK_MONTHLY_HOURS = 10_000;
const MAX_NK_NOTE_LENGTH = 500;

/** Firmenname vor dem Onboarding (= DEFAULT_COMPANY_NAME in offer-readiness). */
const DEFAULT_COMPANY = "Meine Reinigungsfirma";

/** Tiefe Kopie reiner JSON-Daten (Modul-Konfigurationen). */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasSeenSplash: false,
      hasOnboarded: false,
      isLoggedIn: false,
      isDemo: true,
      user: null,
      plan: "free" as PlanId,

      companyName: "Meine Reinigungsfirma",
      companyStreet: "",
      companyZip: "",
      companyCity: "",
      companyPhone: "",
      companyEmail: "",
      companyTaxNumber: "",
      companyVatId: "",
      companyManagingDirector: "",
      hourlyRate: suggestedDefaultRate(),
      vatRate: 0,
      defaultFrequency: "5x_week" as FrequencyKey,
      pdfHeader: "",
      pdfFooter: "",
      companyLogo: "",
      customRoomTypes: [],
      hourlyRateConfig: getDefaultConfig(),
      confirmedHourlyRate: null,
      disabledWarnings: [],
      targetMargin: getDefaultConfig().gewinnmarge,
      theme: "light" as ThemeMode,

      projects: [],
      templates: [],
      nachkalkulationen: {},
      calcDraft: null,
      tenderDraft: null,

      setHasSeenSplash: () => set({ hasSeenSplash: true }),

      completeOnboarding: (data) =>
        set((state) => {
          // Nicht-destruktiv: ein erneutes Onboarding verwirft weder Objekte noch
          // einen eigenen Satz oder Firmennamen. Beispielobjekte nur ergänzen.
          const demos = data.loadDemo
            ? DEMO_PROJECTS.filter((d) => !state.projects.some((p) => p.id === d.id)).map((d) => cloneJson(d))
            : [];
          const keepRate = !isDefaultRateSetting(state.hourlyRate, state.hourlyRateConfig, state.confirmedHourlyRate);
          const keepName = !!state.companyName.trim() && state.companyName !== DEFAULT_COMPANY;
          const companyName = keepName ? state.companyName : data.companyName;
          return {
            hasOnboarded: true,
            // Wer das Onboarding (auch per Direktlink) abschließt, hat die Begrüßung gesehen.
            hasSeenSplash: true,
            user: state.user ?? { name: companyName, email: "demo@cleancalc.pro", role: data.role },
            companyName,
            hourlyRate: keepRate ? state.hourlyRate : data.hourlyRate,
            projects: [...demos, ...state.projects],
          };
        }),

      setDemoUser: (user) => set((state) => ({ isLoggedIn: true, isDemo: true, user: { name: user.name, email: user.email, role: user.role || state.user?.role || "Benutzer" } })),
      clearSession: () => {
        const wasDemo = get().isDemo;
        if (wasDemo) {
          set({ isLoggedIn: false, user: null });
        } else {
          set({
            isLoggedIn: false,
            isDemo: true,
            user: null,
            projects: [],
            templates: [],
            nachkalkulationen: {},
            calcDraft: null,
            tenderDraft: null,
            customRoomTypes: [],
            hourlyRateConfig: getDefaultConfig(),
            confirmedHourlyRate: null,
            plan: "free" as PlanId,
            companyName: "Meine Reinigungsfirma",
            companyStreet: "",
            companyZip: "",
            companyCity: "",
            companyPhone: "",
            companyEmail: "",
            companyTaxNumber: "",
            companyVatId: "",
            companyManagingDirector: "",
            hourlyRate: suggestedDefaultRate(),
            vatRate: 0,
            defaultFrequency: "5x_week" as FrequencyKey,
            pdfHeader: "",
            pdfFooter: "",
            companyLogo: "",
            disabledWarnings: [],
            targetMargin: getDefaultConfig().gewinnmarge,
          });
        }
      },
      upgradePlan: (planId?: PlanId) => set({ plan: planId ?? "pro_monthly" }),

      updateSettings: (data) => set((state) => ({ ...state, ...data })),

      updateHourlyRateConfig: (config) => {
        const breakdown = calcHourlyRate(config);
        const currentState = get();
        const oldDefault = currentState.hourlyRateConfig.gewinnmarge;
        const updates: Partial<AppState> = {
          hourlyRateConfig: config,
          hourlyRate: adoptedRate(breakdown),
        };
        if (currentState.targetMargin === oldDefault) {
          updates.targetMargin = config.gewinnmarge;
        }
        set(updates);
      },

      confirmHourlyRate: (rate) => set({ confirmedHourlyRate: Number.isFinite(rate) && rate > 0 ? rate : null }),

      setDisabledWarnings: (warnings) => set({ disabledWarnings: warnings }),
      setTargetMargin: (margin) => set({ targetMargin: margin }),
      setTheme: (theme) => set({ theme }),

      addProject: (name, customer) => {
        const id = uuidv4();
        const newProj: Project = {
          id,
          name,
          customer,
          status: "active",
          rooms: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ projects: [newProj, ...state.projects] }));
        return id;
      },

      updateProject: (id, data) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProject: (id) =>
        set((state) => {
          // Zugehörige Nachkalkulation mit entfernen — kein verwaister Eintrag.
          const { [id]: _removed, ...rest } = state.nachkalkulationen;
          return {
            projects: state.projects.filter((p) => p.id !== id),
            nachkalkulationen: rest,
          };
        }),

      setNachkalkulation: (projectId, data) =>
        set((state) => ({
          nachkalkulationen: {
            ...state.nachkalkulationen,
            [projectId]: {
              actualMonthlyHours: data.actualMonthlyHours,
              note: data.note?.trim() || undefined,
              recordedAt: new Date().toISOString(),
            },
          },
        })),

      removeNachkalkulation: (projectId) =>
        set((state) => {
          const { [projectId]: _removed, ...rest } = state.nachkalkulationen;
          return { nachkalkulationen: rest };
        }),

      setCalcDraft: (draft) => set({ calcDraft: draft }),
      setTenderDraft: (draft) => set({ tenderDraft: draft }),

      duplicateProject: (id) => {
        const original = get().projects.find((p) => p.id === id);
        if (!original) return "";
        const newId = uuidv4();
        const dup: Project = {
          ...original,
          id: newId,
          name: `${original.name} (Kopie)`,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rooms: original.rooms.map((r) => ({ ...r, id: uuidv4() })),
          // Modul-Planung tief kopieren (keine geteilten Referenzen); Ist-Daten gehören zum Original.
          winterdienst: original.winterdienst ? cloneJson(original.winterdienst) : undefined,
          hms: original.hms ? cloneJson(original.hms) : undefined,
          serviceActuals: undefined,
        };
        set((state) => ({ projects: [dup, ...state.projects] }));
        return newId;
      },

      archiveProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: "archived" as const, updatedAt: new Date().toISOString() } : p
          ),
        })),

      restoreProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: "active" as const, updatedAt: new Date().toISOString() } : p
          ),
        })),

      addRoom: (projectId, room) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  rooms: [...p.rooms, { ...room, id: uuidv4() }],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        })),

      updateRoom: (projectId, roomId, roomData) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, ...roomData } : r)),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        })),

      deleteRoom: (projectId, roomId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  rooms: p.rooms.filter((r) => r.id !== roomId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        })),

      reorderRooms: (projectId, fromIndex, toIndex) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== projectId) return p;
            const rooms = [...p.rooms];
            const [moved] = rooms.splice(fromIndex, 1);
            rooms.splice(toIndex, 0, moved);
            return { ...p, rooms, updatedAt: new Date().toISOString() };
          }),
        })),

      addTemplate: (name, rooms) =>
        set((state) => ({
          templates: [
            ...state.templates,
            { id: uuidv4(), name, rooms, createdAt: new Date().toISOString() },
          ],
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      renameTemplate: (id, name) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, name } : t)),
        })),

      loadTemplate: (templateId, projectName) => {
        const tpl = get().templates.find((t) => t.id === templateId);
        if (!tpl) return "";
        const newId = uuidv4();
        const proj: Project = {
          id: newId,
          name: projectName,
          status: "active",
          rooms: tpl.rooms.map((r) => ({ ...r, id: uuidv4() })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ projects: [proj, ...state.projects] }));
        return newId;
      },

      addCustomRoomType: (rt) =>
        set((state) => ({
          customRoomTypes: [...state.customRoomTypes, { ...rt, id: uuidv4() }],
        })),

      updateCustomRoomType: (id, data) =>
        set((state) => ({
          customRoomTypes: state.customRoomTypes.map((r) =>
            r.id === id ? { ...r, ...data } : r
          ),
        })),

      deleteCustomRoomType: (id) =>
        set((state) => ({
          customRoomTypes: state.customRoomTypes.filter((r) => r.id !== id),
        })),

      exportData: () => {
        const s = get();
        return JSON.stringify({
          companyName: s.companyName,
          companyStreet: s.companyStreet,
          companyZip: s.companyZip,
          companyCity: s.companyCity,
          companyPhone: s.companyPhone,
          companyEmail: s.companyEmail,
          companyTaxNumber: s.companyTaxNumber,
          companyVatId: s.companyVatId,
          companyManagingDirector: s.companyManagingDirector,
          hourlyRate: s.hourlyRate,
          vatRate: s.vatRate,
          defaultFrequency: s.defaultFrequency,
          pdfHeader: s.pdfHeader,
          pdfFooter: s.pdfFooter,
          customRoomTypes: s.customRoomTypes,
          hourlyRateConfig: s.hourlyRateConfig,
          confirmedHourlyRate: s.confirmedHourlyRate,
          disabledWarnings: s.disabledWarnings,
          targetMargin: s.targetMargin,
          projects: s.projects,
          templates: s.templates,
          nachkalkulationen: s.nachkalkulationen,
        }, null, 2);
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== "object") return false;

          const isStr = (v: unknown): v is string => typeof v === "string";
          const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
          const obj = (v: unknown): Record<string, unknown> => (v as Record<string, unknown>);
          const VALID_FREQUENCIES = new Set([
            "monthly", "biweekly", "1x_week", "2x_week", "3x_week",
            "4x_week", "5x_week", "6x_week", "7x_week",
          ]);

          const updates: Partial<AppState> = {};

          // String-Felder — nur übernehmen, wenn tatsächlich Strings.
          if (isStr(data.companyName) && data.companyName.trim()) updates.companyName = data.companyName;
          if (isStr(data.companyStreet)) updates.companyStreet = data.companyStreet;
          if (isStr(data.companyZip)) updates.companyZip = data.companyZip;
          if (isStr(data.companyCity)) updates.companyCity = data.companyCity;
          if (isStr(data.companyPhone)) updates.companyPhone = data.companyPhone;
          if (isStr(data.companyEmail)) updates.companyEmail = data.companyEmail;
          if (isStr(data.companyTaxNumber)) updates.companyTaxNumber = data.companyTaxNumber;
          if (isStr(data.companyVatId)) updates.companyVatId = data.companyVatId;
          if (isStr(data.companyManagingDirector)) updates.companyManagingDirector = data.companyManagingDirector;
          if (isStr(data.pdfHeader)) updates.pdfHeader = data.pdfHeader;
          if (isStr(data.pdfFooter)) updates.pdfFooter = data.pdfFooter;

          // Zahlen-Felder — nur endliche Zahlen im plausiblen Bereich.
          if (isFiniteNum(data.hourlyRate) && data.hourlyRate > 0) updates.hourlyRate = data.hourlyRate;
          if (isFiniteNum(data.vatRate) && data.vatRate >= 0) updates.vatRate = data.vatRate;
          if (isFiniteNum(data.targetMargin)) updates.targetMargin = data.targetMargin;
          if (data.confirmedHourlyRate === null || (isFiniteNum(data.confirmedHourlyRate) && data.confirmedHourlyRate > 0)) {
            updates.confirmedHourlyRate = data.confirmedHourlyRate;
          }

          if (isStr(data.defaultFrequency) && VALID_FREQUENCIES.has(data.defaultFrequency)) {
            updates.defaultFrequency = data.defaultFrequency as FrequencyKey;
          }

          if (Array.isArray(data.customRoomTypes)) updates.customRoomTypes = data.customRoomTypes;
          if (Array.isArray(data.disabledWarnings)) {
            updates.disabledWarnings = data.disabledWarnings.filter(isStr);
          }

          // Verrechnungssatz-Config nur übernehmen, wenn die Grundstruktur stimmt —
          // ein unvollständiges Objekt würde calcHourlyRate sonst zum Absturz bringen.
          const cfg = data.hourlyRateConfig;
          if (
            cfg && typeof cfg === "object" &&
            isFiniteNum(obj(cfg).baseLohn) &&
            obj(cfg).ausfallzeiten && typeof obj(cfg).ausfallzeiten === "object" &&
            isFiniteNum(obj(obj(cfg).ausfallzeiten).weeklyHours) &&
            Array.isArray(obj(cfg).overheads)
          ) {
            updates.hourlyRateConfig = cfg as AppState["hourlyRateConfig"];
          }

          // Projekte/Vorlagen — nur wohlgeformte Einträge importieren.
          // Leistungsmodule laufen durch die Sanitizer: ein ungültiges Modul
          // entfällt (nur dieses Feld), das Projekt bleibt erhalten.
          if (Array.isArray(data.projects)) {
            updates.projects = data.projects
              .filter(
                (p: unknown) => !!p && typeof p === "object" &&
                  isStr(obj(p).id) && isStr(obj(p).name) && Array.isArray(obj(p).rooms)
              )
              .map((p: unknown) => {
                const { winterdienst, hms, serviceActuals, ...rest } = obj(p);
                const wd = sanitizeWinterdienst(winterdienst);
                const h = sanitizeHms(hms);
                const sa = sanitizeServiceActuals(serviceActuals);
                return {
                  ...rest,
                  ...(wd ? { winterdienst: wd } : {}),
                  ...(h ? { hms: h } : {}),
                  ...(sa ? { serviceActuals: sa } : {}),
                };
              }) as AppState["projects"];
          }
          if (Array.isArray(data.templates)) {
            updates.templates = data.templates.filter(
              (t: unknown) => !!t && typeof t === "object" && isStr(obj(t).id)
            ) as AppState["templates"];
          }

          // Nachkalkulation (Unterhaltsreinigung): nur für importierte Objekte und
          // nur Werte, die auch die Eingabe akzeptiert (Ist-Stunden > 0, plausibel begrenzt).
          const nk = data.nachkalkulationen;
          if (nk && typeof nk === "object" && !Array.isArray(nk)) {
            const ids = new Set((updates.projects ?? get().projects).map((p) => p.id));
            const entries: Record<string, Nachkalkulation> = {};
            for (const [id, v] of Object.entries(obj(nk))) {
              if (!ids.has(id) || !v || typeof v !== "object") continue;
              const e = obj(v);
              if (!isFiniteNum(e.actualMonthlyHours) || !(e.actualMonthlyHours > 0) || e.actualMonthlyHours > MAX_NK_MONTHLY_HOURS) continue;
              const note = isStr(e.note) ? e.note.trim().slice(0, MAX_NK_NOTE_LENGTH) : "";
              const recordedAt = isStr(e.recordedAt) && Number.isFinite(Date.parse(e.recordedAt)) ? e.recordedAt : new Date().toISOString();
              entries[id] = {
                actualMonthlyHours: e.actualMonthlyHours,
                ...(note ? { note } : {}),
                recordedAt,
              };
            }
            updates.nachkalkulationen = entries;
          }

          set(updates);
          return true;
        } catch {
          return false;
        }
      },

      resetToDefaults: () =>
        set({
          companyName: "Meine Reinigungsfirma",
          companyStreet: "",
          companyZip: "",
          companyCity: "",
          companyPhone: "",
          companyEmail: "",
          companyTaxNumber: "",
          companyVatId: "",
          companyManagingDirector: "",
          hourlyRate: suggestedDefaultRate(),
          vatRate: 0,
          defaultFrequency: "5x_week" as FrequencyKey,
          pdfHeader: "",
          pdfFooter: "",
          customRoomTypes: [],
          hourlyRateConfig: getDefaultConfig(),
          confirmedHourlyRate: null,
          disabledWarnings: [],
          targetMargin: getDefaultConfig().gewinnmarge,
        }),

      resetAll: () =>
        set({
          hasOnboarded: false,
          hasSeenSplash: false,
          isLoggedIn: false,
          isDemo: true,
          user: null,
          projects: [],
          templates: [],
          nachkalkulationen: {},
          calcDraft: null,
          tenderDraft: null,
          customRoomTypes: [],
          hourlyRateConfig: getDefaultConfig(),
          confirmedHourlyRate: null,
          disabledWarnings: [],
          targetMargin: getDefaultConfig().gewinnmarge,
          plan: "free" as PlanId,
          companyName: "Meine Reinigungsfirma",
          companyStreet: "",
          companyZip: "",
          companyCity: "",
          companyPhone: "",
          companyEmail: "",
          companyTaxNumber: "",
          companyVatId: "",
          companyManagingDirector: "",
          hourlyRate: suggestedDefaultRate(),
          vatRate: 0,
          defaultFrequency: "5x_week" as FrequencyKey,
          pdfHeader: "",
          pdfFooter: "",
        }),

      _setAuthData: (data) => set(data),
    }),
    {
      name: "cleancalc-storage",
      storage: createJSONStorage(() => capacitorStorage),
      version: 11,
      migrate: (persisted: any, version: number) => {
        let state = persisted as any;
        if (version < 2) {
          state = {
            ...state,
            vatRate: state.vatRate ?? 0,
            defaultFrequency: state.defaultFrequency ?? "5x_week",
            pdfHeader: state.pdfHeader ?? "",
            pdfFooter: state.pdfFooter ?? "",
            templates: state.templates ?? [],
            projects: (state.projects ?? []).map((p: any) => ({
              ...p,
              status: p.status ?? "active",
            })),
          };
        }
        if (version < 3) {
          state = {
            ...state,
            isDemo: state.isDemo ?? !state.isLoggedIn,
            customRoomTypes: state.customRoomTypes ?? [],
          };
        }
        if (version < 4) {
          state = {
            ...state,
            hourlyRateConfig: state.hourlyRateConfig ?? getDefaultConfig(),
          };
        }
        if (version < 5) {
          state = {
            ...state,
            companyStreet: state.companyStreet ?? "",
            companyZip: state.companyZip ?? "",
            companyCity: state.companyCity ?? "",
            companyPhone: state.companyPhone ?? "",
            companyEmail: state.companyEmail ?? "",
            companyTaxNumber: state.companyTaxNumber ?? "",
            companyVatId: state.companyVatId ?? "",
            companyManagingDirector: state.companyManagingDirector ?? "",
          };
        }
        if (version < 6) {
          state = {
            ...state,
            disabledWarnings: state.disabledWarnings ?? [],
          };
        }
        if (version < 7) {
          state = {
            ...state,
            targetMargin: state.targetMargin ?? state.hourlyRateConfig?.gewinnmarge ?? getDefaultConfig().gewinnmarge,
          };
        }
        if (version < 8) {
          if (state.hourlyRateConfig && !state.hourlyRateConfig.cleaningType) {
            state = {
              ...state,
              hourlyRateConfig: {
                ...state.hourlyRateConfig,
                cleaningType: "unterhalt",
              },
            };
          }
        }
        if (version < 9) {
          if (state.hourlyRateConfig && !state.hourlyRateConfig.schichtzuschlaege) {
            state = {
              ...state,
              hourlyRateConfig: {
                ...state.hourlyRateConfig,
                schichtzuschlaege: {
                  nacht: { ...DEFAULT_SCHICHTZUSCHLAEGE.nacht },
                  sonntag: { ...DEFAULT_SCHICHTZUSCHLAEGE.sonntag },
                  feiertag: { ...DEFAULT_SCHICHTZUSCHLAEGE.feiertag },
                },
              },
            };
          }
        }
        if (version < 10) {
          state = {
            ...state,
            theme: state.theme ?? "light",
          };
        }
        if (version < 11) {
          const oldPlan = state.plan;
          let newPlan: string = "free";
          if (oldPlan === "pro") newPlan = "pro_monthly";
          else if (oldPlan === "basic") newPlan = "free";
          else if (["free", "pro_monthly", "pro_annual", "founding_annual", "business"].includes(oldPlan)) {
            newPlan = oldPlan;
          }
          state = {
            ...state,
            plan: newPlan,
          };
        }
        return state;
      },
    }
  )
);
