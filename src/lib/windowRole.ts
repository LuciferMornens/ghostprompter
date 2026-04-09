import { getCurrentWindow } from "@tauri-apps/api/window";

export type WindowRole = "main" | "overlay";

export function getWindowRole(): WindowRole {
  try {
    return getCurrentWindow().label === "overlay" ? "overlay" : "main";
  } catch {
    return "main";
  }
}
