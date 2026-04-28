import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings, FilterOptions } from "../shared/types";

contextBridge.exposeInMainWorld("api", {
  articles: {
    list:        (filter: FilterOptions)  => ipcRenderer.invoke("articles:list", filter),
    grouped:     (filter: FilterOptions)  => ipcRenderer.invoke("articles:grouped", filter),
    markRead:    (id: number)             => ipcRenderer.invoke("articles:markRead", id),
    markAllRead: (ids: number[])          => ipcRenderer.invoke("articles:markAllRead", ids),
    unreadCount: ()                       => ipcRenderer.invoke("articles:unreadCount"),
    fullContent: (id: number, url: string) => ipcRenderer.invoke("articles:fullContent", id, url),
    translate:   (id: number, text: string) => ipcRenderer.invoke("articles:translate", id, text),
    translateTitle: (id: number, text: string) => ipcRenderer.invoke("articles:translateTitle", id, text),
    getCachedTitleTranslation: (id: number) => ipcRenderer.invoke("articles:getCachedTitleTranslation", id),
    translateTitlesBatch: (items: Array<{ id: number; title: string }>) =>
      ipcRenderer.invoke("articles:translateTitlesBatch", items),
    rebuildAll: () => ipcRenderer.invoke("articles:rebuildAll") as Promise<{ deleted: number }>,
  },
  feeds: {
    list:          ()          => ipcRenderer.invoke("feeds:list"),
    toggleEnabled: (id: number) => ipcRenderer.invoke("feeds:toggleEnabled", id),
  },
  news: {
    refresh: () => ipcRenderer.invoke("news:refresh"),
    onRefreshed: (cb: () => void) => {
      ipcRenderer.on("news:refreshed", cb);
      return () => ipcRenderer.removeListener("news:refreshed", cb);
    },
  },
  clips: {
    list:           () => ipcRenderer.invoke("clips:list"),
    create:         (name: string) => ipcRenderer.invoke("clips:create", name),
    rename:         (id: number, name: string) => ipcRenderer.invoke("clips:rename", id, name),
    delete:         (id: number) => ipcRenderer.invoke("clips:delete", id),
    addArticle:     (articleId: number, clipId: number) =>
                      ipcRenderer.invoke("clips:addArticle", articleId, clipId),
    removeArticle:  (articleId: number, clipId: number) =>
                      ipcRenderer.invoke("clips:removeArticle", articleId, clipId),
    forArticle:     (articleId: number) => ipcRenderer.invoke("clips:forArticle", articleId),
  },
  settings: {
    get:             () => ipcRenderer.invoke("settings:get") as Promise<AppSettings>,
    set:             (patch: Partial<AppSettings>) =>
                       ipcRenderer.invoke("settings:set", patch) as Promise<AppSettings>,
    getDeeplApiKey:  () => ipcRenderer.invoke("settings:getDeeplApiKey") as Promise<string>,
    setDeeplApiKey:  (key: string) => ipcRenderer.invoke("settings:setDeeplApiKey", key),
  },
  shell: {
    openExternal:    (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  },
  menu: {
    onOpenSettings: (cb: () => void) => {
      ipcRenderer.on("menu:openSettings", cb);
      return () => ipcRenderer.removeListener("menu:openSettings", cb);
    },
    onRefreshNews: (cb: () => void) => {
      ipcRenderer.on("menu:refreshNews", cb);
      return () => ipcRenderer.removeListener("menu:refreshNews", cb);
    },
  },
});
