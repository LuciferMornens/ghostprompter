import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { LazyStore } from "@tauri-apps/plugin-store";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_SETTINGS } from "@/types";

const storeGetMock = vi.fn();
const storeSetMock = vi.fn();
const storeSaveMock = vi.fn();

vi.mock("@tauri-apps/plugin-store", () => {
  return {
    LazyStore: vi.fn().mockImplementation((filename: string) => ({
      filename,
      get: storeGetMock,
      set: storeSetMock,
      save: storeSaveMock,
    })),
  };
});

const LazyStoreMock = LazyStore as unknown as Mock;

describe("useSettingsStore", () => {
  beforeEach(() => {
    storeGetMock.mockReset();
    storeSetMock.mockReset();
    storeSaveMock.mockReset();
    LazyStoreMock.mockClear();
    storeSetMock.mockResolvedValue(undefined);
    storeSaveMock.mockResolvedValue(undefined);
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      loaded: false,
    });
  });

  it("has initial state matching DEFAULT_SETTINGS and loaded=false", () => {
    const s = useSettingsStore.getState();
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
    expect(s.loaded).toBe(false);
  });

  describe("load()", () => {
    it("merges existing partial settings with defaults", async () => {
      // simulate user previously saved a partial config (e.g. older version)
      storeGetMock.mockResolvedValueOnce({
        fontSize: 64,
        scrollSpeed: 100,
      });

      await useSettingsStore.getState().load();

      const s = useSettingsStore.getState();
      expect(s.loaded).toBe(true);
      expect(s.settings.fontSize).toBe(64);
      expect(s.settings.scrollSpeed).toBe(100);
      // Defaults still present:
      expect(s.settings.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
      expect(s.settings.bgOpacity).toBe(DEFAULT_SETTINGS.bgOpacity);
      expect(s.settings.hotkeys).toEqual(DEFAULT_SETTINGS.hotkeys);
      // No write happened on a successful load
      expect(storeSetMock).not.toHaveBeenCalled();
      expect(storeSaveMock).not.toHaveBeenCalled();
    });

    it("writes DEFAULT_SETTINGS when LazyStore returns undefined", async () => {
      storeGetMock.mockResolvedValueOnce(undefined);

      await useSettingsStore.getState().load();

      expect(storeSetMock).toHaveBeenCalledTimes(1);
      expect(storeSetMock).toHaveBeenCalledWith("settings", DEFAULT_SETTINGS);
      expect(storeSaveMock).toHaveBeenCalledTimes(1);

      const s = useSettingsStore.getState();
      expect(s.settings).toEqual(DEFAULT_SETTINGS);
      expect(s.loaded).toBe(true);
    });

    it("sets loaded=true even when LazyStore.get throws", async () => {
      storeGetMock.mockRejectedValueOnce(new Error("boom"));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await useSettingsStore.getState().load();

      const s = useSettingsStore.getState();
      expect(s.loaded).toBe(true);
      expect(s.settings).toEqual(DEFAULT_SETTINGS);
      warnSpy.mockRestore();
    });
  });

  describe("update()", () => {
    it("merges patch into existing settings", async () => {
      await useSettingsStore.getState().update({ fontSize: 100 });
      const s = useSettingsStore.getState();
      expect(s.settings.fontSize).toBe(100);
      // unchanged props remain
      expect(s.settings.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
    });

    it("persists via LazyStore.set + save", async () => {
      await useSettingsStore.getState().update({ scrollSpeed: 200 });
      expect(storeSetMock).toHaveBeenCalledTimes(1);
      const [key, value] = storeSetMock.mock.calls[0];
      expect(key).toBe("settings");
      expect(value).toMatchObject({ scrollSpeed: 200 });
      expect(storeSaveMock).toHaveBeenCalledTimes(1);
    });

    it("supports nested hotkeys partial updates", async () => {
      await useSettingsStore.getState().update({
        hotkeys: { ...DEFAULT_SETTINGS.hotkeys, playPause: "F2" },
      });
      const s = useSettingsStore.getState();
      expect(s.settings.hotkeys.playPause).toBe("F2");
      // Other hotkeys should still be present (full hotkeys object replaced)
      expect(s.settings.hotkeys.slower).toBe(DEFAULT_SETTINGS.hotkeys.slower);
    });

    it("does not throw when LazyStore.set rejects", async () => {
      storeSetMock.mockRejectedValueOnce(new Error("disk full"));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await expect(
        useSettingsStore.getState().update({ fontSize: 22 }),
      ).resolves.toBeUndefined();
      // In-memory state still updated
      expect(useSettingsStore.getState().settings.fontSize).toBe(22);
      warnSpy.mockRestore();
    });
  });

  describe("reset()", () => {
    it("restores DEFAULT_SETTINGS and persists", async () => {
      // First mutate state
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, fontSize: 9999 },
      });
      await useSettingsStore.getState().reset();

      const s = useSettingsStore.getState();
      expect(s.settings).toEqual(DEFAULT_SETTINGS);
      expect(storeSetMock).toHaveBeenCalledWith("settings", DEFAULT_SETTINGS);
      expect(storeSaveMock).toHaveBeenCalledTimes(1);
    });

    it("does not throw when persistence fails on reset", async () => {
      storeSetMock.mockRejectedValueOnce(new Error("nope"));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await expect(
        useSettingsStore.getState().reset(),
      ).resolves.toBeUndefined();
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
      warnSpy.mockRestore();
    });
  });
});
