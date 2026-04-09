import { currentMonitor } from "@tauri-apps/api/window";
import type { ScreenSize } from "@/teleprompter/viewportMath";

function toLogicalPixels(value: number, scaleFactor: number): number {
  return value / Math.max(scaleFactor || 1, 1);
}

export function getFallbackDisplayBounds(): ScreenSize {
  if (typeof window === "undefined") {
    return { x: 0, y: 0, w: 1920, h: 1080 };
  }

  const w = window.screen?.availWidth ?? 0;
  const h = window.screen?.availHeight ?? 0;

  if (w > 0 && h > 0) {
    return { x: 0, y: 0, w, h };
  }

  return {
    x: 0,
    y: 0,
    w: window.innerWidth || 1920,
    h: window.innerHeight || 1080,
  };
}

export async function getDisplayBounds(): Promise<ScreenSize> {
  try {
    const monitor = await currentMonitor();
    if (monitor) {
      const scaleFactor = monitor.scaleFactor ?? 1;
      return {
        x: toLogicalPixels(monitor.workArea.position.x, scaleFactor),
        y: toLogicalPixels(monitor.workArea.position.y, scaleFactor),
        w: toLogicalPixels(monitor.workArea.size.width, scaleFactor),
        h: toLogicalPixels(monitor.workArea.size.height, scaleFactor),
      };
    }
  } catch {
    // Fall back to browser-provided screen metrics below.
  }

  return getFallbackDisplayBounds();
}
