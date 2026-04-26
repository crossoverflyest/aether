import "dotenv/config";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import * as deepl from "deepl-node";
import { db } from "../db/database";
import { fetchAllFeeds } from "../feeds/fetcher";
import { extractArticle } from "../feeds/extractor";
import type { FilterOptions } from "../shared/types";

const isDev = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Aether",
    icon: path.join(
      app.getAppPath(),
      process.platform === "win32" ? "assets/icon.ico" : "assets/icon.png"
    ),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f172a",
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.crossoverflyest.aether");
  }
  await db.initialize();
  createWindow();

  // 起動時にニュースを取得
  fetchAllFeeds().catch(console.error);

  // 30分ごとに自動更新
  setInterval(() => {
    fetchAllFeeds().catch(console.error);
  }, 30 * 60 * 1000);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// ===== IPC ハンドラ =====

ipcMain.handle("articles:list", (_event, filter: FilterOptions) => {
  return db.getArticles(filter);
});

ipcMain.handle("articles:grouped", (_event, filter: FilterOptions) => {
  return db.getArticlesGrouped(filter);
});

ipcMain.handle("articles:markRead", (_event, id: number) => {
  return db.markRead(id);
});

ipcMain.handle("articles:markAllRead", (_event, ids: number[]) => {
  return db.markAllRead(ids);
});

ipcMain.handle("articles:unreadCount", () => {
  return db.getUnreadCount();
});

ipcMain.handle("feeds:list", () => {
  return db.getFeeds();
});

ipcMain.handle("feeds:toggleEnabled", (_event, id: number) => {
  return db.toggleFeedEnabled(id);
});

ipcMain.handle("articles:fullContent", async (_event, id: number, url: string) => {
  const cached = db.getFullContent(id);
  if (cached) return cached;
  const result = await extractArticle(url);
  if (result?.content) {
    db.setFullContent(id, result.content);
    return result.content;
  }
  return null;
});

ipcMain.handle("articles:translate", async (_event, id: number, text: string) => {
  const cached = db.getTranslation(id);
  if (cached) return cached;

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY is not configured");
  }

  try {
    const translator = new deepl.Translator(apiKey);
    const result = await translator.translateText(text, null, "JA" as deepl.TargetLanguageCode);
    const translated = result.text;
    db.saveTranslation(id, translated);
    return translated;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
});

ipcMain.handle("articles:translateTitle", async (_event, id: number, text: string) => {
  const cached = db.getTitleTranslation(id);
  if (cached) return cached;

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY is not configured");
  }

  try {
    const translator = new deepl.Translator(apiKey);
    const result = await translator.translateText(text, null, "JA" as deepl.TargetLanguageCode);
    const translated = result.text;
    db.saveTitleTranslation(id, translated);
    return translated;
  } catch (error) {
    console.error("Title translation error:", error);
    throw error;
  }
});

ipcMain.handle("articles:getCachedTitleTranslation", (_event, id: number) => {
  return db.getTitleTranslation(id);
});

ipcMain.handle(
  "articles:translateTitlesBatch",
  async (_event, items: Array<{ id: number; title: string }>) => {
    const results: Record<number, string> = {};
    const toTranslate: Array<{ id: number; title: string }> = [];

    for (const item of items) {
      const cached = db.getTitleTranslation(item.id);
      if (cached) {
        results[item.id] = cached;
      } else {
        toTranslate.push(item);
      }
    }

    if (toTranslate.length === 0) return results;

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) return results;

    try {
      const translator = new deepl.Translator(apiKey);
      const BATCH_SIZE = 50;
      for (let start = 0; start < toTranslate.length; start += BATCH_SIZE) {
        const chunk = toTranslate.slice(start, start + BATCH_SIZE);
        const texts = chunk.map(t => t.title);
        const translated = await translator.translateText(
          texts,
          null,
          "JA" as deepl.TargetLanguageCode
        );
        const arr = Array.isArray(translated) ? translated : [translated];
        for (let i = 0; i < chunk.length; i++) {
          const id = chunk[i].id;
          const text = arr[i].text;
          results[id] = text;
          db.saveTitleTranslation(id, text);
        }
      }
    } catch (error) {
      console.error("Batch title translation error:", error);
    }

    return results;
  }
);

ipcMain.handle("news:refresh", async () => {
  await fetchAllFeeds();
  mainWindow?.webContents.send("news:refreshed");
  return { ok: true };
});

// ===== Clips =====
ipcMain.handle("clips:list", () => db.getClips());
ipcMain.handle("clips:create", (_event, name: string) => db.createClip(name));
ipcMain.handle("clips:rename", (_event, id: number, name: string) => db.renameClip(id, name));
ipcMain.handle("clips:delete", (_event, id: number) => { db.deleteClip(id); return { ok: true }; });
ipcMain.handle("clips:addArticle", (_event, articleId: number, clipId: number) => {
  db.addArticleToClip(articleId, clipId);
  return { ok: true };
});
ipcMain.handle("clips:removeArticle", (_event, articleId: number, clipId: number) => {
  db.removeArticleFromClip(articleId, clipId);
  return { ok: true };
});
ipcMain.handle("clips:forArticle", (_event, articleId: number) => db.getClipsForArticle(articleId));
