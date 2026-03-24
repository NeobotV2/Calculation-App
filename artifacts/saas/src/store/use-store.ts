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
  createdAt: string;
  updatedAt: string;
  rooms: Room[];
}

interface AppState {
  hasSeenSplash: boolean;
  hasOnboarded: boolean;
  isLoggedIn: boolean;
  user: { name: string; email: string; role: string } | null;
  plan: "basic" | "pro";
  
  companyName: string;
  hourlyRate: number;
  
  projects: Project[];
  
  // Actions
  setHasSeenSplash: () => void;
  completeOnboarding: (data: { role: string; companyName: string; hourlyRate: number; loadDemo: boolean }) => void;
  login: (user: { name: string; email: string }) => void;
  logout: () => void;
  upgradePlan: () => void;
  updateSettings: (data: Partial<{ companyName: string; hourlyRate: number }>) => void;
  
  addProject: (name: string, customer?: string) => string;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  addRoom: (projectId: string, room: Omit<Room, "id">) => void;
  updateRoom: (projectId: string, roomId: string, room: Partial<Room>) => void;
  deleteRoom: (projectId: string, roomId: string) => void;
  
  resetAll: () => void;
}

const DEMO_PROJECT: Project = {
  id: "demo-1",
  name: "Bürogebäude Musterstraße",
  customer: "Muster GmbH",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  rooms: [
    {
      id: "r1", name: "Großraumbüro EG", typeId: "t1", typeName: "Großraumbüro", 
      groupId: "g1", groupName: "Büro & Verwaltung", area: 250, frequency: "5x_week", typePerformance: 350
    },
    {
      id: "r2", name: "Meetingraum Alpha", typeId: "t3", typeName: "Besprechungsraum", 
      groupId: "g1", groupName: "Büro & Verwaltung", area: 45, frequency: "3x_week", typePerformance: 300
    },
    {
      id: "r3", name: "WC Herren", typeId: "t5", typeName: "WC / Sanitär klein", 
      groupId: "g2", groupName: "Sanitär", area: 15, frequency: "5x_week", typePerformance: 50
    },
    {
      id: "r4", name: "Teeküche", typeId: "t7", typeName: "Teeküche", 
      groupId: "g3", groupName: "Küche & Sozial", area: 20, frequency: "5x_week", typePerformance: 120
    }
  ]
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasSeenSplash: false,
      hasOnboarded: false,
      isLoggedIn: false,
      user: null,
      plan: "basic",
      
      companyName: "Meine Reinigungsfirma",
      hourlyRate: 22.50,
      
      projects: [],

      setHasSeenSplash: () => set({ hasSeenSplash: true }),
      
      completeOnboarding: (data) => set((state) => ({
        hasOnboarded: true,
        user: { name: "Demo User", email: "demo@example.com", role: data.role },
        companyName: data.companyName,
        hourlyRate: data.hourlyRate,
        projects: data.loadDemo ? [DEMO_PROJECT] : []
      })),

      login: (user) => set({ isLoggedIn: true, user: { ...get().user!, ...user } }),
      logout: () => set({ isLoggedIn: false, user: null }),
      upgradePlan: () => set({ plan: "pro" }),
      
      updateSettings: (data) => set((state) => ({ ...state, ...data })),

      addProject: (name, customer) => {
        const id = uuidv4();
        const newProj: Project = {
          id, name, customer, rooms: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({ projects: [newProj, ...state.projects] }));
        return id;
      },

      updateProject: (id, data) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
        )
      })),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id)
      })),

      addRoom: (projectId, room) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? {
            ...p, 
            rooms: [...p.rooms, { ...room, id: uuidv4() }],
            updatedAt: new Date().toISOString()
          } : p
        )
      })),

      updateRoom: (projectId, roomId, roomData) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? {
            ...p,
            rooms: p.rooms.map(r => r.id === roomId ? { ...r, ...roomData } : r),
            updatedAt: new Date().toISOString()
          } : p
        )
      })),

      deleteRoom: (projectId, roomId) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === projectId ? {
            ...p,
            rooms: p.rooms.filter(r => r.id !== roomId),
            updatedAt: new Date().toISOString()
          } : p
        )
      })),

      resetAll: () => set({
        hasOnboarded: false, isLoggedIn: false, user: null, projects: [], plan: "basic"
      })
    }),
    {
      name: "cleancalc-storage",
    }
  )
);
