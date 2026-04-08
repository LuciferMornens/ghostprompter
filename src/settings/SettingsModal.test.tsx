import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-store", () => {
  const get = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockResolvedValue(undefined);
  const save = vi.fn().mockResolvedValue(undefined);
  class LazyStore {
    filename: string;
    constructor(n: string) {
      this.filename = n;
    }
    get = get;
    set = set;
    save = save;
  }
  return { LazyStore };
});

import { invoke } from "@tauri-apps/api/core";
import { SettingsModal } from "./SettingsModal";
import { useSettingsStore } from "@/store/settingsStore";
import { DEFAULT_HOTKEYS, DEFAULT_SETTINGS } from "@/types";

const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === "is_capture_invisible_supported") return Promise.resolve(true);
    return Promise.resolve(undefined);
  });
  useSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS },
    loaded: true,
  });
});

async function renderModal(props: { onClose?: () => void } = {}) {
  const result = render(<SettingsModal onClose={props.onClose ?? (() => {})} />);
  // Flush the useEffect that calls ipc.isCaptureInvisibleSupported and the
  // subsequent setState so we don't trigger act() warnings.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return result;
}

describe("<SettingsModal />", () => {
  it("renders heading 'Settings'", async () => {
    await renderModal();
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("renders all four tab buttons", async () => {
    await renderModal();
    expect(
      screen.getByRole("button", { name: "Appearance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Playback" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hotkeys" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();
  });

  it("Appearance tab is the default and shows font size, line height, color inputs", async () => {
    const { container } = await renderModal();
    // Font size label includes the current px
    expect(
      screen.getByText(`Font size: ${DEFAULT_SETTINGS.fontSize}px`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Line height: ${DEFAULT_SETTINGS.lineHeight.toFixed(2)}`),
    ).toBeInTheDocument();
    expect(screen.getByText("Text color")).toBeInTheDocument();
    expect(screen.getByText("Background color")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Background opacity: ${Math.round(DEFAULT_SETTINGS.bgOpacity * 100)}%`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Mirror horizontal")).toBeInTheDocument();
    expect(screen.getByLabelText("Mirror vertical")).toBeInTheDocument();
    // Has at least one range input
    expect(container.querySelectorAll('input[type="range"]').length).toBeGreaterThanOrEqual(3);
  });

  it("changing font size range updates settingsStore", async () => {
    const { container } = await renderModal();
    const range = container.querySelectorAll(
      'input[type="range"]',
    )[0] as HTMLInputElement;
    fireEvent.change(range, { target: { value: "60" } });
    await waitFor(() =>
      expect(useSettingsStore.getState().settings.fontSize).toBe(60),
    );
  });

  it("toggling mirror horizontal updates settingsStore", async () => {
    await renderModal();
    const cb = screen.getByLabelText("Mirror horizontal") as HTMLInputElement;
    expect(cb.checked).toBe(false);
    fireEvent.click(cb);
    await waitFor(() =>
      expect(useSettingsStore.getState().settings.mirrorHorizontal).toBe(true),
    );
  });

  it("Playback tab shows scroll speed range and updates store", async () => {
    const user = userEvent.setup();
    const { container } = await renderModal();
    await user.click(screen.getByRole("button", { name: "Playback" }));
    expect(
      screen.getByText(`Scroll speed: ${DEFAULT_SETTINGS.scrollSpeed} px/s`),
    ).toBeInTheDocument();
    const range = container.querySelectorAll(
      'input[type="range"]',
    )[0] as HTMLInputElement;
    fireEvent.change(range, { target: { value: "120" } });
    await waitFor(() =>
      expect(useSettingsStore.getState().settings.scrollSpeed).toBe(120),
    );
  });

  it("Hotkeys tab shows rows for all actions", async () => {
    const user = userEvent.setup();
    await renderModal();
    await user.click(screen.getByRole("button", { name: "Hotkeys" }));
    expect(screen.getByText("Play / Pause")).toBeInTheDocument();
    expect(screen.getByText("Slower")).toBeInTheDocument();
    expect(screen.getByText("Faster")).toBeInTheDocument();
    expect(screen.getByText("Hide / Show")).toBeInTheDocument();
    expect(screen.getByText("Toggle edit mode")).toBeInTheDocument();
    expect(screen.getByText("Line up")).toBeInTheDocument();
    expect(screen.getByText("Line down")).toBeInTheDocument();
    expect(screen.getByText("Jump to start")).toBeInTheDocument();
    expect(screen.getByText("Jump to end")).toBeInTheDocument();
    expect(screen.getByText("Stop / Exit")).toBeInTheDocument();
  });

  it("clicking 'reset hotkeys to defaults' updates hotkeys to DEFAULT_HOTKEYS", async () => {
    // Mutate hotkeys first
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        hotkeys: { ...DEFAULT_HOTKEYS, playPause: "Q" },
      },
      loaded: true,
    });
    const user = userEvent.setup();
    await renderModal();
    await user.click(screen.getByRole("button", { name: "Hotkeys" }));
    expect(useSettingsStore.getState().settings.hotkeys.playPause).toBe("Q");
    await user.click(
      screen.getByRole("button", { name: "reset hotkeys to defaults" }),
    );
    await waitFor(() =>
      expect(useSettingsStore.getState().settings.hotkeys).toEqual(
        DEFAULT_HOTKEYS,
      ),
    );
  });

  it("About tab shows GhostPrompter version and capture status after invoke resolves", async () => {
    const user = userEvent.setup();
    await renderModal();
    await user.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByText("GhostPrompter 0.1.0")).toBeInTheDocument();
    // After mount, the invoke('is_capture_invisible_supported') resolves to true
    await waitFor(() => {
      expect(screen.getByText("supported")).toBeInTheDocument();
    });
  });

  it("clicking the X close button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    await renderModal({ onClose });
    await user.click(screen.getByRole("button", { name: "✕" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking the backdrop calls onClose", async () => {
    const onClose = vi.fn();
    const { container } = await renderModal({ onClose });
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking inside the modal content does NOT call onClose", async () => {
    const onClose = vi.fn();
    await renderModal({ onClose });
    const heading = screen.getByRole("heading", { name: "Settings" });
    fireEvent.click(heading);
    expect(onClose).not.toHaveBeenCalled();
  });
});
