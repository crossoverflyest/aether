import { app } from "electron";
import fs from "fs";
import path from "path";
import { DEFAULT_APP_SETTINGS } from "../shared/types";
import type { AppSettings } from "../shared/types";

const SETTINGS_PATH = (): string =>
  path.join(app.getPath("userData"), "settings.json");

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_APP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = { ...loadSettings(), ...patch };
  try {
    fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(merged, null, 2), "utf8");
  } catch (err) {
    console.error("[settings] failed to save:", err);
  }
  return merged;
}
