import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useScriptStore } from "@/store/scriptStore";
import type { Script } from "@/types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

const openMock = open as unknown as Mock;
const saveDialogMock = save as unknown as Mock;
const invokeMock = invoke as unknown as Mock;

const DEFAULT_CONTENT =
  "# Welcome to GhostPrompter\n\nWrite your **YouTube script** here in markdown.\n\n- Press **Go** to enter teleprompter mode\n- F7 to play/pause, F8/F9 for speed, F6 to toggle edit mode, Esc to exit\n- The teleprompter window is invisible to OBS, Zoom, Discord, and any screen capture\n\n## Intro\n\nHey everyone, welcome back to the channel...\n";

const EMPTY_SCRIPT: Script = {
  path: null,
  name: "Untitled.md",
  content: DEFAULT_CONTENT,
  dirty: false,
};

describe("useScriptStore", () => {
  beforeEach(() => {
    openMock.mockReset();
    saveDialogMock.mockReset();
    invokeMock.mockReset();
    useScriptStore.setState({ script: { ...EMPTY_SCRIPT } });
  });

  describe("initial state", () => {
    it("has default welcome content, null path, Untitled.md name, dirty=false", () => {
      const { script } = useScriptStore.getState();
      expect(script.path).toBeNull();
      expect(script.name).toBe("Untitled.md");
      expect(script.content).toBe(DEFAULT_CONTENT);
      expect(script.dirty).toBe(false);
    });
  });

  describe("setContent", () => {
    it("updates content and marks dirty=true when content differs", () => {
      useScriptStore.getState().setContent("foo");
      const { script } = useScriptStore.getState();
      expect(script.content).toBe("foo");
      expect(script.dirty).toBe(true);
    });

    it("does NOT mark dirty when content is unchanged", () => {
      useScriptStore.getState().setContent(DEFAULT_CONTENT);
      const { script } = useScriptStore.getState();
      expect(script.content).toBe(DEFAULT_CONTENT);
      expect(script.dirty).toBe(false);
    });

    it("preserves prior dirty=true even if setContent called with same content", () => {
      // First set dirty by changing content
      useScriptStore.getState().setContent("bar");
      expect(useScriptStore.getState().script.dirty).toBe(true);
      // Now call setContent with the same value -> dirty should remain true
      useScriptStore.getState().setContent("bar");
      expect(useScriptStore.getState().script.dirty).toBe(true);
    });
  });

  describe("newScript", () => {
    it("resets to initial empty state", () => {
      useScriptStore.setState({
        script: {
          path: "/some/path.md",
          name: "path.md",
          content: "modified",
          dirty: true,
        },
      });
      useScriptStore.getState().newScript();
      const { script } = useScriptStore.getState();
      expect(script.path).toBeNull();
      expect(script.name).toBe("Untitled.md");
      expect(script.content).toBe(DEFAULT_CONTENT);
      expect(script.dirty).toBe(false);
    });
  });

  describe("openFromDisk", () => {
    it("does nothing when dialog returns null", async () => {
      openMock.mockResolvedValueOnce(null);
      const before = useScriptStore.getState().script;
      await useScriptStore.getState().openFromDisk();
      expect(useScriptStore.getState().script).toEqual(before);
      expect(invokeMock).not.toHaveBeenCalled();
    });

    it("does nothing when dialog returns a non-string (e.g. array)", async () => {
      openMock.mockResolvedValueOnce(["/foo/bar.md"]);
      const before = useScriptStore.getState().script;
      await useScriptStore.getState().openFromDisk();
      expect(useScriptStore.getState().script).toEqual(before);
      expect(invokeMock).not.toHaveBeenCalled();
    });

    it("calls dialog with correct filters (md/markdown/txt)", async () => {
      openMock.mockResolvedValueOnce(null);
      await useScriptStore.getState().openFromDisk();
      expect(openMock).toHaveBeenCalledTimes(1);
      const args = openMock.mock.calls[0][0];
      expect(args).toMatchObject({
        multiple: false,
        filters: [
          { name: "Markdown / Text", extensions: ["md", "markdown", "txt"] },
        ],
      });
    });

    it("invokes read_script with the chosen path and updates state", async () => {
      const chosenPath = "/tmp/some.md";
      const returned: Script = {
        path: chosenPath,
        name: "some.md",
        content: "loaded content",
        dirty: false,
      };
      openMock.mockResolvedValueOnce(chosenPath);
      invokeMock.mockResolvedValueOnce(returned);

      await useScriptStore.getState().openFromDisk();

      expect(invokeMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("read_script", {
        path: chosenPath,
      });
      expect(useScriptStore.getState().script).toEqual(returned);
    });
  });

  describe("saveToDisk", () => {
    it("with existing path, calls save_script and clears dirty", async () => {
      useScriptStore.setState({
        script: {
          path: "/tmp/existing.md",
          name: "existing.md",
          content: "hello world",
          dirty: true,
        },
      });
      invokeMock.mockResolvedValueOnce("/tmp/existing.md");

      await useScriptStore.getState().saveToDisk();

      expect(saveDialogMock).not.toHaveBeenCalled();
      expect(invokeMock).toHaveBeenCalledWith("save_script", {
        path: "/tmp/existing.md",
        content: "hello world",
      });
      const { script } = useScriptStore.getState();
      expect(script.dirty).toBe(false);
      expect(script.path).toBe("/tmp/existing.md");
      expect(script.name).toBe("existing.md");
    });

    it("with no path, opens save dialog; if cancelled, nothing happens", async () => {
      useScriptStore.setState({
        script: {
          path: null,
          name: "Untitled.md",
          content: "x",
          dirty: true,
        },
      });
      saveDialogMock.mockResolvedValueOnce(null);

      await useScriptStore.getState().saveToDisk();

      expect(saveDialogMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).not.toHaveBeenCalled();
      // State unchanged
      const { script } = useScriptStore.getState();
      expect(script.path).toBeNull();
      expect(script.dirty).toBe(true);
    });

    it("after save with POSIX path, derives name from basename via /", async () => {
      useScriptStore.setState({
        script: {
          path: null,
          name: "Untitled.md",
          content: "content",
          dirty: true,
        },
      });
      saveDialogMock.mockResolvedValueOnce("/home/user/script.md");
      invokeMock.mockResolvedValueOnce("/home/user/script.md");

      await useScriptStore.getState().saveToDisk();

      const { script } = useScriptStore.getState();
      expect(script.path).toBe("/home/user/script.md");
      expect(script.name).toBe("script.md");
      expect(script.dirty).toBe(false);
      expect(invokeMock).toHaveBeenCalledWith("save_script", {
        path: "/home/user/script.md",
        content: "content",
      });
    });

    it("after save with Windows path, derives name from basename via \\", async () => {
      useScriptStore.setState({
        script: {
          path: null,
          name: "Untitled.md",
          content: "winContent",
          dirty: true,
        },
      });
      saveDialogMock.mockResolvedValueOnce("C:\\Users\\me\\Documents\\my-script.md");
      invokeMock.mockResolvedValueOnce("C:\\Users\\me\\Documents\\my-script.md");

      await useScriptStore.getState().saveToDisk();

      const { script } = useScriptStore.getState();
      expect(script.path).toBe("C:\\Users\\me\\Documents\\my-script.md");
      expect(script.name).toBe("my-script.md");
      expect(script.dirty).toBe(false);
    });

    it("save dialog is called with default markdown filter when no path", async () => {
      useScriptStore.setState({
        script: {
          path: null,
          name: "MyScript.md",
          content: "z",
          dirty: false,
        },
      });
      saveDialogMock.mockResolvedValueOnce(null);
      await useScriptStore.getState().saveToDisk();
      expect(saveDialogMock).toHaveBeenCalledTimes(1);
      const args = saveDialogMock.mock.calls[0][0];
      expect(args).toMatchObject({
        defaultPath: "MyScript.md",
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
    });
  });

  describe("saveAs", () => {
    it("always opens save dialog and updates path + name on success", async () => {
      useScriptStore.setState({
        script: {
          path: "/tmp/old.md",
          name: "old.md",
          content: "abc",
          dirty: true,
        },
      });
      saveDialogMock.mockResolvedValueOnce("/tmp/new.md");
      invokeMock.mockResolvedValueOnce("/tmp/new.md");

      await useScriptStore.getState().saveAs();

      expect(saveDialogMock).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith("save_script", {
        path: "/tmp/new.md",
        content: "abc",
      });
      const { script } = useScriptStore.getState();
      expect(script.path).toBe("/tmp/new.md");
      expect(script.name).toBe("new.md");
      expect(script.dirty).toBe(false);
    });

    it("does nothing when save dialog is cancelled", async () => {
      useScriptStore.setState({
        script: {
          path: "/tmp/old.md",
          name: "old.md",
          content: "abc",
          dirty: true,
        },
      });
      saveDialogMock.mockResolvedValueOnce(null);

      await useScriptStore.getState().saveAs();

      expect(invokeMock).not.toHaveBeenCalled();
      const { script } = useScriptStore.getState();
      expect(script.path).toBe("/tmp/old.md");
      expect(script.name).toBe("old.md");
      expect(script.dirty).toBe(true);
    });

    it("derives name from Windows backslash path on saveAs", async () => {
      useScriptStore.setState({
        script: {
          path: null,
          name: "Untitled.md",
          content: "x",
          dirty: false,
        },
      });
      saveDialogMock.mockResolvedValueOnce("D:\\projects\\foo.md");
      invokeMock.mockResolvedValueOnce("D:\\projects\\foo.md");

      await useScriptStore.getState().saveAs();

      const { script } = useScriptStore.getState();
      expect(script.name).toBe("foo.md");
      expect(script.path).toBe("D:\\projects\\foo.md");
    });
  });
});
