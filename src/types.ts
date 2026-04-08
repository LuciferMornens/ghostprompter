export type Script = {
  path: string | null;
  name: string;
  content: string;
  dirty: boolean;
};

export type Hotkeys = {
  playPause: string;
  slower: string;
  faster: string;
  hideShow: string;
  toggleEditMode: string;
  lineUp: string;
  lineDown: string;
  jumpStart: string;
  jumpEnd: string;
  stop: string;
};

export type Settings = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  textColor: string;
  bgColor: string;
  bgOpacity: number;
  mirrorHorizontal: boolean;
  mirrorVertical: boolean;
  scrollSpeed: number;
  readingLineOffset: number;
  highlightReadingLine: boolean;
  overlayWidth: number;
  overlayHeight: number;
  overlayX: number | null;
  overlayY: number | null;
  hotkeys: Hotkeys;
};

export const DEFAULT_HOTKEYS: Hotkeys = {
  playPause: "F7",
  slower: "F8",
  faster: "F9",
  hideShow: "F10",
  toggleEditMode: "F6",
  lineUp: "Shift+Up",
  lineDown: "Shift+Down",
  jumpStart: "Control+Home",
  jumpEnd: "Control+End",
  stop: "Escape",
};

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 42,
  lineHeight: 1.6,
  fontFamily: "Inter",
  textColor: "#ffffff",
  bgColor: "#000000",
  bgOpacity: 0.75,
  mirrorHorizontal: false,
  mirrorVertical: false,
  scrollSpeed: 40,
  readingLineOffset: 0.4,
  highlightReadingLine: true,
  overlayWidth: 720,
  overlayHeight: 480,
  overlayX: null,
  overlayY: null,
  hotkeys: DEFAULT_HOTKEYS,
};

export type AppMode = "editor" | "teleprompter";
