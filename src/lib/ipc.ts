import { invoke } from "@tauri-apps/api/core";
import type { Hotkeys, Script } from "@/types";

export const ipc = {
  readScript: (path: string) => invoke<Script>("read_script", { path }),
  saveScript: (path: string, content: string) =>
    invoke<string>("save_script", { path, content }),

  enterTeleprompter: () => invoke<void>("enter_teleprompter_mode"),
  exitTeleprompter: () => invoke<void>("exit_teleprompter_mode"),
  setEditMode: (edit: boolean) => invoke<void>("set_edit_mode", { edit }),
  setOverlayRect: (rect: { x: number; y: number; w: number; h: number }) =>
    invoke<void>("set_overlay_rect", {
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
    }),
  setCaptureInvisible: (invisible: boolean) =>
    invoke<void>("set_capture_invisible", { invisible }),
  setClickThrough: (enabled: boolean) =>
    invoke<void>("set_click_through", { enabled }),
  isCaptureInvisibleSupported: () =>
    invoke<boolean>("is_capture_invisible_supported"),

  registerHotkeys: (hotkeys: Hotkeys) =>
    invoke<void>("register_hotkeys", { hotkeys }),
  unregisterHotkeys: () => invoke<void>("unregister_hotkeys"),
};
