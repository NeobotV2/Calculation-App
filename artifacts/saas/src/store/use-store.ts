import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

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
}

export interface Project {
  id: string;
  name: string;
  customer?: string;
  location?: string;
  notes?: string;
  hourlyRate?: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  rooms: Room[];
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

interface AppState {
  hasSeenSplash: boolean;
  hasOnboarded: boolean;
  isLoggedIn: boolean;
  isDemo: boolean;
  user: { name: string; email: string; role: string } | null;
  plan: "basic" | "pro";

  companyName: string;
  hourlyRate: number;
  vatRate: number;
  defaultFrequency: FrequencyKey;
  pdfHeader: string;
  pdfFooter: string;
  customRoomTypes: CustomRoomType[];

  projects: Project[];
  templates: Template[];

  setHasSeenSplash: () => void;
  completeOnboarding: (data: { role: string; companyName: string; hourlyRate: number; loadDemo: boolean }) => void;
  login: (user: { name: string; email: string; role?: string }) => void;
  logout: () => void;
  upgradePlan: () => void;
  updateSettings: (data: Partial<{ companyName: string; hourlyRate: number; vatRate: number; defaultFrequency: FrequencyKey; pdfHeader: string; pdfFooter: string }>) => void;

  addProject: (name: string, customer?: string) => string;
  updateProject: (id: string, data: Partial<Omit<Project, "id" | "createdAt" | "rooms">>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => string;
  archiveProject: (id: string) => void;
  restoreProject: (id: string) => void;

  addRoom: (projectId: string, room: Omit<Room, "id">) => void;
  updateRoom: (projectId: string, roomId: string, room: Partial<Room>) => void;
  deleteRoom: (projectId: string, roomId: string) => void;

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
      groupId: "g1", groupName: "Büro & Verwaltung", area: 250, frequency: "5x_week", typePerformance: 350,
    },
    {
      id: "r2", name: "Meetingraum Alpha", typeId: "t3", typeName: "Besprechungsraum",
      groupId: "g1", groupName: "Büro & Verwaltung", area: 45, frequency: "3x_week", typePerformance: 300,
    },
    {
      id: "r3", name: "WC Herren", typeId: "t5", typeName: "WC / Sanitär klein",
      groupId: "g2", groupName: "Sanitär", area: 15, frequency: "5x_week", typePerformance: 50,
    },
    {
      id: "r4", name: "Teeküche", typeId: "t11", typeName: "Teeküche",
      groupId: "g4", groupName: "Küche & Sozial", area: 20, frequency: "5x_week", typePerformance: 120,
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
      id: "r5", name: "Wartezimmer", typeId: "t16", typeName: "Arztpraxis",
      groupId: "g6", groupName: "Medizin & Labor", area: 40, frequency: "5x_week", typePerformance: 120,
    },
    {
      id: "r6", name: "Behandlungsraum 1", typeId: "t16", typeName: "Arztpraxis",
      groupId: "g6", groupName: "Medizin & Labor", area: 25, frequency: "5x_week", typePerformance: 120,
    },
    {
      id: "r7", name: "WC Patienten", typeId: "t5", typeName: "WC / Sanitär klein",
      groupId: "g2", groupName: "Sanitär", area: 8, frequency: "5x_week", typePerformance: 50,
    },
  ],
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasSeenSplash: false,
      hasOnboarded: false,
      isLoggedIn: false,
      isDemo: true,
      user: null,
      plan: "basic",

      companyName: "Meine Reinigungsfirma",
      hourlyRate: 22.50,
      vatRate: 0,
      defaultFrequency: "5x_week" as FrequencyKey,
      pdfHeader: "",
      pdfFooter: "",
      customRoomTypes: [],

      projects: [],
      templates: [],

      setHasSeenSplash: () => set({ hasSeenSplash: true }),

      completeOnboarding: (data) =>
        set(() => ({
          hasOnboarded: true,
          user: { name: data.companyName, email: "demo@cleancalc.pro", role: data.role },
          companyName: data.companyName,
          hourlyRate: data.hourlyRate,
          projects: data.loadDemo ? [DEMO_PROJECT, DEMO_PROJECT_2] : [],
        })),

      // TODO: Replace with Supabase auth — call supabase.auth.signInWithPassword(), then set user from session
      login: (user) => set((state) => ({ isLoggedIn: true, isDemo: false, user: { name: user.name, email: user.email, role: user.role || state.user?.role || "Benutzer" } })),
      // TODO: Replace with supabase.auth.signOut()
      logout: () => set({ isLoggedIn: false, isDemo: true, user: null }),
      // TODO: Replace with Stripe checkout / Supabase subscription update
      upgradePlan: () => set({ plan: "pro" }),

      updateSettings: (data) => set((state) => ({ ...state, ...data })),

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
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),

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
          hourlyRate: s.hourlyRate,
          vatRate: s.vatRate,
          defaultFrequency: s.defaultFrequency,
          pdfHeader: s.pdfHeader,
          pdfFooter: s.pdfFooter,
          customRoomTypes: s.customRoomTypes,
          projects: s.projects,
          templates: s.templates,
        }, null, 2);
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data || typeof data !== "object") return false;
          const updates: Partial<AppState> = {};
          if (data.companyName) updates.companyName = data.companyName;
          if (data.hourlyRate) updates.hourlyRate = data.hourlyRate;
          if (data.vatRate !== undefined) updates.vatRate = data.vatRate;
          if (data.defaultFrequency) updates.defaultFrequency = data.defaultFrequency;
          if (data.pdfHeader !== undefined) updates.pdfHeader = data.pdfHeader;
          if (data.pdfFooter !== undefined) updates.pdfFooter = data.pdfFooter;
          if (Array.isArray(data.customRoomTypes)) updates.customRoomTypes = data.customRoomTypes;
          if (Array.isArray(data.projects)) updates.projects = data.projects;
          if (Array.isArray(data.templates)) updates.templates = data.templates;
          set(updates);
          return true;
        } catch {
          return false;
        }
      },

      resetToDefaults: () =>
        set({
          companyName: "Meine Reinigungsfirma",
          hourlyRate: 22.50,
          vatRate: 0,
          defaultFrequency: "5x_week" as FrequencyKey,
          pdfHeader: "",
          pdfFooter: "",
          customRoomTypes: [],
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
          customRoomTypes: [],
          plan: "basic",
          companyName: "Meine Reinigungsfirma",
          hourlyRate: 22.50,
          vatRate: 0,
          defaultFrequency: "5x_week" as FrequencyKey,
          pdfHeader: "",
          pdfFooter: "",
        }),
    }),
    {
      name: "cleancalc-storage",
      version: 3,
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
        return state;
      },
    }
  )
);
