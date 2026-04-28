import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ArticleTree from "./components/ArticleTree";
import ArticleDetail from "./components/ArticleDetail";
import Toolbar from "./components/Toolbar";
import SettingsDialog from "./components/SettingsDialog";
import ArticleContextMenu from "./components/ArticleContextMenu";
import { DEFAULT_APP_SETTINGS } from "../shared/types";
import type { AppSettings, Article, ArticleGroup, FilterOptions, Clip } from "../shared/types";

const DEFAULT_FILTER: FilterOptions = {
  status: "all",
  category: null,
  region: null,
  sortKey: "publishedAt",
  sortOrder: "desc",
};

// 日本語文字を含むかで日本語テキストか判定
function isJapanese(text: string): boolean {
  return /[぀-ゟ゠-ヿ一-鿿]/.test(text);
}

function collectArticles(groups: ArticleGroup[]): Article[] {
  const seen = new Set<number>();
  const out: Article[] = [];
  for (const y of groups) {
    for (const a of y.articles) {
      if (!seen.has(a.id)) { seen.add(a.id); out.push(a); }
    }
  }
  return out;
}

export default function App() {
  const [groups, setGroups]         = useState<ArticleGroup[]>([]);
  const [selected, setSelected]     = useState<Article | null>(null);
  const [filter, setFilter]         = useState<FilterOptions>(DEFAULT_FILTER);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [translatedTitles, setTranslatedTitles] = useState<Record<number, string>>({});
  const [clips, setClips]           = useState<Clip[]>([]);
  const [settings, setSettings]     = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu]   = useState<{ article: Article; x: number; y: number } | null>(null);

  const openContextMenu = useCallback((article: Article, x: number, y: number) => {
    setContextMenu({ article, x, y });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    window.api.settings.get().then(setSettings).catch(err =>
      console.error("Failed to load settings:", err)
    );
  }, []);

  const loadClips = useCallback(async () => {
    const list = await window.api.clips.list();
    setClips(list);
  }, []);

  useEffect(() => {
    loadClips();
  }, [loadClips]);

  const handleCreateClip = useCallback(async (name: string) => {
    try {
      await window.api.clips.create(name);
      await loadClips();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`クリップ作成に失敗しました: ${msg}`);
    }
  }, [loadClips]);

  const handleDeleteClip = useCallback(async (id: number) => {
    await window.api.clips.delete(id);
    await loadClips();
    setFilter(prev => prev.clipId === id ? { ...prev, clipId: null } : prev);
  }, [loadClips]);

  const handleRenameClip = useCallback(async (id: number, name: string) => {
    try {
      await window.api.clips.rename(id, name);
      await loadClips();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`クリップ名変更に失敗しました: ${msg}`);
    }
  }, [loadClips]);

  const load = useCallback(async (f: FilterOptions) => {
    setLoading(true);
    try {
      const [grouped, count] = await Promise.all([
        window.api.articles.grouped(f),
        window.api.articles.unreadCount(),
      ]);
      setGroups(grouped);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  // バックグラウンド更新完了時にリロード
  useEffect(() => {
    const off = window.api.news.onRefreshed(() => load(filter));
    return off;
  }, [filter, load]);

  // メニュー連携
  useEffect(() => {
    const offSettings = window.api.menu.onOpenSettings(() => setSettingsOpen(true));
    return offSettings;
  }, []);

  // groupsが更新されたら、英語タイトルを抽出して一括翻訳
  useEffect(() => {
    const all = collectArticles(groups);
    const toTranslate = all
      .filter(a => !isJapanese(a.title) && !translatedTitles[a.id])
      .map(a => ({ id: a.id, title: a.title }));
    if (toTranslate.length === 0) return;

    let cancelled = false;
    window.api.articles.translateTitlesBatch(toTranslate)
      .then(map => {
        if (cancelled) return;
        if (Object.keys(map).length > 0) {
          setTranslatedTitles(prev => ({ ...prev, ...map }));
        }
      })
      .catch(err => console.error("Batch title translation failed:", err));
    return () => { cancelled = true; };
  }, [groups]);

  const handleSelect = useCallback(async (article: Article) => {
    setSelected(article);
    if (article.status === "unread") {
      await window.api.articles.markRead(article.id);
      setGroups(prev => markReadInGroups(prev, article.id));
      setUnreadCount(c => Math.max(0, c - 1));
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await window.api.news.refresh();
    await load(filter);
  }, [filter, load]);

  useEffect(() => {
    const off = window.api.menu.onRefreshNews(() => { handleRefresh(); });
    return off;
  }, [handleRefresh]);

  const handleMarkAllRead = useCallback(async (ids: number[]) => {
    await window.api.articles.markAllRead(ids);
    await load(filter);
  }, [filter, load]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
      <Sidebar
        unreadCount={unreadCount}
        filter={filter}
        onFilterChange={setFilter}
        clips={clips}
        onCreateClip={handleCreateClip}
        onDeleteClip={handleDeleteClip}
        onRenameClip={handleRenameClip}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Toolbar
          loading={loading}
          onRefresh={handleRefresh}
          filter={filter}
          onFilterChange={setFilter}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="flex flex-1 min-h-0">
          <ArticleTree
            groups={groups}
            selected={selected}
            onSelect={handleSelect}
            onMarkAllRead={handleMarkAllRead}
            translatedTitles={translatedTitles}
            defaultExpand={settings.treeDefaultExpand}
            onContextMenu={openContextMenu}
          />
          <ArticleDetail
            article={selected}
            translatedTitle={selected ? translatedTitles[selected.id] ?? null : null}
            clips={clips}
            onClipsChanged={loadClips}
          />
        </div>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsChanged={setSettings}
        onSourcesChanged={() => load(filter)}
        onArticlesRebuilt={() => {
          setSelected(null);
          setTranslatedTitles({});
          load(filter);
        }}
      />
      {contextMenu && (
        <ArticleContextMenu
          article={contextMenu.article}
          x={contextMenu.x}
          y={contextMenu.y}
          clips={clips}
          onClose={closeContextMenu}
          onClipsChanged={loadClips}
        />
      )}
    </div>
  );
}

function markReadInGroups(groups: ArticleGroup[], id: number): ArticleGroup[] {
  return groups.map(year => ({
    ...year,
    unreadCount: year.articles.some(a => a.id === id && a.status === "unread")
      ? year.unreadCount - 1
      : year.unreadCount,
    articles: year.articles.map(a => a.id === id ? { ...a, status: "read" as const } : a),
    children: year.children?.map(month => ({
      ...month,
      unreadCount: month.articles.some(a => a.id === id && a.status === "unread")
        ? month.unreadCount - 1
        : month.unreadCount,
      articles: month.articles.map(a => a.id === id ? { ...a, status: "read" as const } : a),
      children: month.children?.map(day => ({
        ...day,
        unreadCount: day.articles.some(a => a.id === id && a.status === "unread")
          ? day.unreadCount - 1
          : day.unreadCount,
        articles: day.articles.map(a => a.id === id ? { ...a, status: "read" as const } : a),
      })),
    })),
  }));
}
