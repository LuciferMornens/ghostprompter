import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { ipc } from "@/lib/ipc";
import { DEFAULT_HOTKEYS, type Script } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = invoke as unknown as Mock;

describe("ipc", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe("readScript", () => {
    it("calls invoke('read_script', { path }) and returns the script", async () => {
      const script: Script = {
        path: "/tmp/x.md",
        name: "x.md",
        content: "hello",
        dirty: false,
      };
      invokeMock.mockResolvedValueOnce(script);

      const result = await ipc.readScript("/tmp/x.md");

      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("read_script", {
        path: "/tmp/x.md",
      });
      expect(result).toEqual(script);
    });
  });

  describe("saveScript", () => {
    it("calls invoke('save_script', { path, content }) and returns the saved path", async () => {
      invokeMock.mockResolvedValueOnce("/tmp/y.md");

      const result = await ipc.saveScript("/tmp/y.md", "body");

      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("save_script", {
        path: "/tmp/y.md",
        content: "body",
      });
      expect(result).toBe("/tmp/y.md");
    });
  });

  describe("enterTeleprompter", () => {
    it("calls invoke('enter_teleprompter_mode')", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.enterTeleprompter();
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("enter_teleprompter_mode");
    });
  });

  describe("exitTeleprompter", () => {
    it("calls invoke('exit_teleprompter_mode')", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.exitTeleprompter();
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("exit_teleprompter_mode");
    });
  });

  describe("setOverlayRect", () => {
    it("calls invoke('set_overlay_rect', { x, y, w, h })", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.setOverlayRect({ x: 40, y: 60, w: 480, h: 320 });
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("set_overlay_rect", {
        x: 40,
        y: 60,
        w: 480,
        h: 320,
      });
    });
  });

  describe("setEditMode", () => {
    it("calls invoke('set_edit_mode', { edit }) with true", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.setEditMode(true);
      expect(invokeMock).toHaveBeenCalledWith("set_edit_mode", { edit: true });
    });

    it("calls invoke('set_edit_mode', { edit }) with false", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.setEditMode(false);
      expect(invokeMock).toHaveBeenCalledWith("set_edit_mode", { edit: false });
    });
  });

  describe("setCaptureInvisible", () => {
    it("calls invoke('set_capture_invisible', { invisible }) with true", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.setCaptureInvisible(true);
      expect(invokeMock).toHaveBeenCalledWith("set_capture_invisible", {
        invisible: true,
      });
    });

    it("calls invoke('set_capture_invisible', { invisible }) with false", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.setCaptureInvisible(false);
      expect(invokeMock).toHaveBeenCalledWith("set_capture_invisible", {
        invisible: false,
      });
    });
  });

  describe("setClickThrough", () => {
    it("calls invoke('set_click_through', { enabled }) with true", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.setClickThrough(true);
      expect(invokeMock).toHaveBeenCalledWith("set_click_through", {
        enabled: true,
      });
    });

    it("calls invoke('set_click_through', { enabled }) with false", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.setClickThrough(false);
      expect(invokeMock).toHaveBeenCalledWith("set_click_through", {
        enabled: false,
      });
    });
  });

  describe("isCaptureInvisibleSupported", () => {
    it("calls invoke('is_capture_invisible_supported') and returns the boolean", async () => {
      invokeMock.mockResolvedValueOnce(true);
      const result = await ipc.isCaptureInvisibleSupported();
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("is_capture_invisible_supported");
      expect(result).toBe(true);
    });

    it("passes through false from invoke", async () => {
      invokeMock.mockResolvedValueOnce(false);
      const result = await ipc.isCaptureInvisibleSupported();
      expect(result).toBe(false);
    });
  });

  describe("registerHotkeys", () => {
    it("calls invoke('register_hotkeys', { hotkeys })", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.registerHotkeys(DEFAULT_HOTKEYS);
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("register_hotkeys", {
        hotkeys: DEFAULT_HOTKEYS,
      });
    });
  });

  describe("unregisterHotkeys", () => {
    it("calls invoke('unregister_hotkeys')", async () => {
      invokeMock.mockResolvedValueOnce(undefined);
      await ipc.unregisterHotkeys();
      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("unregister_hotkeys");
    });
  });
});
