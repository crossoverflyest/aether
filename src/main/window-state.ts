import { app, BrowserWindow, screen } from "electron";
import fs from "fs";
import path from "path";

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false,
};

const STATE_PATH = (): string =>
  path.join(app.getPath("userData"), "window-state.json");

export function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(STATE_PATH(), "utf8");
    const parsed = JSON.parse(raw) as Partial<WindowState>;
    const merged: WindowState = { ...DEFAULT_STATE, ...parsed };
    return isVisibleOnAnyDisplay(merged) ? merged : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function isVisibleOnAnyDisplay(state: WindowState): boolean {
  if (state.x == null || state.y == null) return true;
  const displays = screen.getAllDisplays();
  return displays.some(d => {
    const b = d.bounds;
    return (
      state.x! >= b.x &&
      state.y! >= b.y &&
      state.x! + state.width <= b.x + b.width &&
      state.y! + state.height <= b.y + b.height
    );
  });
}

function writeState(state: WindowState): void {
  try {
    fs.writeFileSync(STATE_PATH(), JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("[window-state] failed to save:", err);
  }
}

export function bindStateSaver(window: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null;

  const captureNow = () => {
    if (window.isDestroyed()) return;
    const isMaximized = window.isMaximized();
    const bounds = window.getNormalBounds();
    writeState({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    });
  };

  const debouncedCapture = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(captureNow, 500);
  };

  window.on("resize", debouncedCapture);
  window.on("move", debouncedCapture);
  window.on("maximize", captureNow);
  window.on("unmaximize", captureNow);
  window.on("close", () => {
    if (timer) clearTimeout(timer);
    captureNow();
  });
}
