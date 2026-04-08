import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { onHotkey, onModeChanged, type HotkeyAction } from "@/lib/events";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

const listenMock = listen as unknown as Mock;

// A typed shim for the callback signature listen passes us
type AnyCb = (event: { payload: unknown }) => void;

describe("events", () => {
  beforeEach(() => {
    listenMock.mockReset();
  });

  describe("onHotkey", () => {
    it.each<HotkeyAction>(["play-pause", "slower", "faster", "stop"])(
      "subscribes to hotkey://%s and forwards the call to the handler",
      async (action) => {
        const unlisten = vi.fn();
        listenMock.mockResolvedValueOnce(unlisten);
        const handler = vi.fn();

        const returned = await onHotkey(action, handler);

        expect(listenMock).toHaveBeenCalledTimes(1);
        const [eventName, cb] = listenMock.mock.calls[0] as [string, AnyCb];
        expect(eventName).toBe(`hotkey://${action}`);

        // Simulate the Tauri runtime invoking the listener
        cb({ payload: undefined });

        expect(handler).toHaveBeenCalledTimes(1);
        // The returned unlisten must be the one we provided
        expect(returned).toBe(unlisten);
      },
    );

    it("does not pass any payload to the handler", async () => {
      listenMock.mockResolvedValueOnce(() => {});
      const handler = vi.fn();
      await onHotkey("line-up", handler);
      const cb = listenMock.mock.calls[0][1] as AnyCb;
      cb({ payload: { junk: 1 } });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith();
    });
  });

  describe("onModeChanged", () => {
    it("subscribes to 'mode-changed' and forwards mode + edit", async () => {
      const unlisten = vi.fn();
      listenMock.mockResolvedValueOnce(unlisten);
      const handler = vi.fn();

      const returned = await onModeChanged(handler);

      expect(listenMock).toHaveBeenCalledTimes(1);
      const [eventName, cb] = listenMock.mock.calls[0] as [string, AnyCb];
      expect(eventName).toBe("mode-changed");

      cb({ payload: { mode: "teleprompter", edit: true } });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith("teleprompter", true);

      cb({ payload: { mode: "editor", edit: false } });
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenLastCalledWith("editor", false);

      expect(returned).toBe(unlisten);
    });

    it("returned value is callable (unlisten fn type-checks)", async () => {
      const unlisten = vi.fn();
      listenMock.mockResolvedValueOnce(unlisten);
      const result = await onModeChanged(() => {});
      // Type-level: result is UnlistenFn (() => void); call it.
      result();
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });
});
