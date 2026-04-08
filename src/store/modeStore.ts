import { create } from "zustand";
import type { AppMode } from "@/types";

type ModeStore = {
  mode: AppMode;
  editMode: boolean;
  playing: boolean;
  hidden: boolean;
  setMode: (mode: AppMode) => void;
  setEditMode: (edit: boolean) => void;
  togglePlaying: () => void;
  setPlaying: (p: boolean) => void;
  setHidden: (h: boolean) => void;
  toggleHidden: () => void;
};

export const useModeStore = create<ModeStore>((set) => ({
  mode: "editor",
  editMode: false,
  playing: false,
  hidden: false,
  setMode: (mode) => set({ mode }),
  setEditMode: (editMode) => set({ editMode }),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (playing) => set({ playing }),
  setHidden: (hidden) => set({ hidden }),
  toggleHidden: () => set((s) => ({ hidden: !s.hidden })),
}));
