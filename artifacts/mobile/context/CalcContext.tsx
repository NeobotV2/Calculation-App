import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_FREQUENCY_OPTIONS,
  DEFAULT_HOURLY_RATE,
  DEFAULT_PROJECT_NAME,
  DEFAULT_ROOM_GROUPS,
  DEFAULT_ROOM_TYPES,
  DEMO_ROOMS,
} from "@/data/seed";
import type {
  FrequencyOption,
  ProjectSettings,
  ProjectTotals,
  Room,
  RoomCalculation,
} from "@/types";
import { generateId, getRoomCalculation, getProjectTotals } from "@/utils/calc";

const STORAGE_KEY_ROOMS = "@reinigungskalc/rooms";
const STORAGE_KEY_SETTINGS = "@reinigungskalc/settings";

interface CalcContextValue {
  rooms: Room[];
  settings: ProjectSettings;
  frequencyOptions: FrequencyOption[];
  calculations: (RoomCalculation | null)[];
  totals: ProjectTotals;
  addRoom: (room: Omit<Room, "id">) => void;
  updateRoom: (id: string, room: Partial<Omit<Room, "id">>) => void;
  removeRoom: (id: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  loadDemoData: () => void;
  resetAll: () => void;
}

const CalcContext = createContext<CalcContextValue | null>(null);

const DEFAULT_COMPANY_NAME = "";

const DEFAULT_SETTINGS: ProjectSettings = {
  projectName: DEFAULT_PROJECT_NAME,
  companyName: DEFAULT_COMPANY_NAME,
  hourlyRate: DEFAULT_HOURLY_RATE,
  roomTypes: DEFAULT_ROOM_TYPES,
  roomGroups: DEFAULT_ROOM_GROUPS,
};

export function CalcProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [roomsData, settingsData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_ROOMS),
          AsyncStorage.getItem(STORAGE_KEY_SETTINGS),
        ]);
        if (roomsData) setRooms(JSON.parse(roomsData));
        if (settingsData) {
          const parsed = JSON.parse(settingsData);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms)).catch(() => {});
  }, [rooms, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings)).catch(() => {});
  }, [settings, loaded]);

  const addRoom = useCallback((room: Omit<Room, "id">) => {
    setRooms((prev) => [...prev, { ...room, id: generateId() }]);
  }, []);

  const updateRoom = useCallback(
    (id: string, updates: Partial<Omit<Room, "id">>) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const removeRoom = useCallback((id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateSettings = useCallback((updates: Partial<ProjectSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const loadDemoData = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      projectName: "Bürokomplex Musterstraße",
      companyName: "Reinigungs GmbH",
    }));
    setRooms(DEMO_ROOMS);
  }, []);

  const resetAll = useCallback(() => {
    setRooms([]);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const calculations = useMemo(
    () =>
      rooms.map((room) =>
        getRoomCalculation(room, settings, DEFAULT_FREQUENCY_OPTIONS)
      ),
    [rooms, settings]
  );

  const totals = useMemo(
    () => getProjectTotals(calculations, rooms),
    [calculations, rooms]
  );

  const value = useMemo<CalcContextValue>(
    () => ({
      rooms,
      settings,
      frequencyOptions: DEFAULT_FREQUENCY_OPTIONS,
      calculations,
      totals,
      addRoom,
      updateRoom,
      removeRoom,
      updateSettings,
      loadDemoData,
      resetAll,
    }),
    [
      rooms,
      settings,
      calculations,
      totals,
      addRoom,
      updateRoom,
      removeRoom,
      updateSettings,
      loadDemoData,
      resetAll,
    ]
  );

  if (!loaded) return null;

  return <CalcContext.Provider value={value}>{children}</CalcContext.Provider>;
}

export function useCalc(): CalcContextValue {
  const ctx = useContext(CalcContext);
  if (!ctx) throw new Error("useCalc must be used within CalcProvider");
  return ctx;
}
