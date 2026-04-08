import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type HotkeyAction =
  | "play-pause"
  | "slower"
  | "faster"
  | "hide"
  | "edit-mode"
  | "line-up"
  | "line-down"
  | "jump-start"
  | "jump-end"
  | "stop";

export async function onHotkey(
  action: HotkeyAction,
  handler: () => void,
): Promise<UnlistenFn> {
  return listen(`hotkey://${action}`, () => handler());
}

export async function onModeChanged(
  handler: (mode: "editor" | "teleprompter", edit: boolean) => void,
): Promise<UnlistenFn> {
  return listen<{ mode: "editor" | "teleprompter"; edit: boolean }>(
    "mode-changed",
    (e) => handler(e.payload.mode, e.payload.edit),
  );
}
