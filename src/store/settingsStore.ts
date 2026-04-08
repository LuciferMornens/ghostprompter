import { create } from "zustand";
import { LazyStore } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type Settings } from "@/types";

const STORE_FILE = "settings.json";
const KEY = "settings";

let store: LazyStore | null = null;
function getStore(): LazyStore {
  if (!store) store = new LazyStore(STORE_FILE);
  return store;
}

type SettingsStore = {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    try {
      const s = await getStore();
      const existing = await s.get<Settings>(KEY);
      if (existing) {
        set({ settings: { ...DEFAULT_SETTINGS, ...existing }, loaded: true });
      } else {
        await s.set(KEY, DEFAULT_SETTINGS);
        await s.save();
        set({ settings: DEFAULT_SETTINGS, loaded: true });
      }
    } catch (e) {
      console.warn("settings load failed, using defaults", e);
      set({ loaded: true });
    }
  },
  update: async (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    try {
      const s = await getStore();
      await s.set(KEY, next);
      await s.save();
    } catch (e) {
      console.warn("settings save failed", e);
    }
  },
  reset: async () => {
    set({ settings: DEFAULT_SETTINGS });
    try {
      const s = await getStore();
      await s.set(KEY, DEFAULT_SETTINGS);
      await s.save();
    } catch (e) {
      console.warn("settings reset failed", e);
    }
  },
}));
