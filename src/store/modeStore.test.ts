import { describe, it, expect, beforeEach } from "vitest";
import { useModeStore } from "@/store/modeStore";

const initialModeState = {
  mode: "editor" as const,
  editMode: false,
  playing: false,
  hidden: false,
};

describe("useModeStore", () => {
  beforeEach(() => {
    useModeStore.setState({ ...initialModeState });
  });

  it("has correct initial state", () => {
    const s = useModeStore.getState();
    expect(s.mode).toBe("editor");
    expect(s.editMode).toBe(false);
    expect(s.playing).toBe(false);
    expect(s.hidden).toBe(false);
  });

  it("setMode('teleprompter') updates mode", () => {
    useModeStore.getState().setMode("teleprompter");
    expect(useModeStore.getState().mode).toBe("teleprompter");
  });

  it("setMode('editor') updates mode back", () => {
    useModeStore.getState().setMode("teleprompter");
    useModeStore.getState().setMode("editor");
    expect(useModeStore.getState().mode).toBe("editor");
  });

  it("setEditMode(true) updates editMode", () => {
    useModeStore.getState().setEditMode(true);
    expect(useModeStore.getState().editMode).toBe(true);
  });

  it("setEditMode(false) updates editMode", () => {
    useModeStore.setState({ editMode: true });
    useModeStore.getState().setEditMode(false);
    expect(useModeStore.getState().editMode).toBe(false);
  });

  it("togglePlaying flips playing from false to true", () => {
    expect(useModeStore.getState().playing).toBe(false);
    useModeStore.getState().togglePlaying();
    expect(useModeStore.getState().playing).toBe(true);
  });

  it("togglePlaying flips playing from true to false", () => {
    useModeStore.setState({ playing: true });
    useModeStore.getState().togglePlaying();
    expect(useModeStore.getState().playing).toBe(false);
  });

  it("setPlaying(true) sets playing", () => {
    useModeStore.getState().setPlaying(true);
    expect(useModeStore.getState().playing).toBe(true);
  });

  it("setPlaying(false) sets playing", () => {
    useModeStore.setState({ playing: true });
    useModeStore.getState().setPlaying(false);
    expect(useModeStore.getState().playing).toBe(false);
  });

  it("setHidden(true) sets hidden", () => {
    useModeStore.getState().setHidden(true);
    expect(useModeStore.getState().hidden).toBe(true);
  });

  it("setHidden(false) sets hidden", () => {
    useModeStore.setState({ hidden: true });
    useModeStore.getState().setHidden(false);
    expect(useModeStore.getState().hidden).toBe(false);
  });

  it("toggleHidden flips hidden from false to true", () => {
    expect(useModeStore.getState().hidden).toBe(false);
    useModeStore.getState().toggleHidden();
    expect(useModeStore.getState().hidden).toBe(true);
  });

  it("toggleHidden flips hidden from true to false", () => {
    useModeStore.setState({ hidden: true });
    useModeStore.getState().toggleHidden();
    expect(useModeStore.getState().hidden).toBe(false);
  });
});
