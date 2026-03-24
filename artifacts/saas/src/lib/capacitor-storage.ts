import { Preferences } from "@capacitor/preferences";
import { isNative } from "@/lib/capacitor";
import type { StateStorage } from "zustand/middleware";

const capacitorStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isNative) {
      return localStorage.getItem(name);
    }
    const { value } = await Preferences.get({ key: name });
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isNative) {
      localStorage.setItem(name, value);
      return;
    }
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isNative) {
      localStorage.removeItem(name);
      return;
    }
    await Preferences.remove({ key: name });
  },
};

export default capacitorStorage;
