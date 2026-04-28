import React, { useEffect, useRef, useState } from "react";
import type { AppSettings, Feed, TreeDefaultExpand } from "../../shared/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSettingsChanged: (s: AppSettings) => void;
  onSourcesChanged: () => void;
  onArticlesRebuilt: () => void;
}

const TREE_OPTIONS: Array<{ value: TreeDefaultExpand; label: string; hint: string }> = [
  { value: "today",        label: "今日のみ展開",     hint: "起動時に最新の年/月と今日の日付だけ展開します。" },
  { value: "currentMonth", label: "今月すべて展開",   hint: "現在の年・月とその月の全日を展開します。" },
  { value: "all",          label: "すべて展開",       hint: "全期間の年/月/日をすべて開きます。" },
  { value: "none",         label: "すべて折りたたむ", hint: "起動時はすべて閉じた状態にします。" },
];

export default function SettingsDialog({
  open,
  onClose,
  onSettingsChanged,
  onSourcesChanged,
  onArticlesRebuilt,
}: Props) {
  const [settings, setSettings]       = useState<AppSettings | null>(null);
  const [feeds, setFeeds]             = useState<Feed[]>([]);
  const [apiKey, setApiKey]           = useState("");
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [savingKey, setSavingKey]     = useState(false);
  const [keyMessage, setKeyMessage]   = useState<string | null>(null);
  const [rebuilding, setRebuilding]   = useState(false);
  const [rebuildMessage, setRebuildMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      window.api.settings.get(),
      window.api.feeds.list(),
      window.api.settings.getDeeplApiKey(),
    ]).then(([s, f, k]) => {
      if (cancelled) return;
      setSettings(s);
      setFeeds(f);
      setApiKey(k);
      setApiKeyDirty(false);
      setKeyMessage(null);
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const updateSetting = async (patch: Partial<AppSettings>) => {
    const next = await window.api.settings.set(patch);
    setSettings(next);
    onSettingsChanged(next);
  };

  const toggleFeed = async (id: number) => {
    const updated = await window.api.feeds.toggleEnabled(id);
    setFeeds(prev => prev.map(f => (f.id === id ? updated : f)));
    onSourcesChanged();
  };

  const handleRebuildAll = async () => {
    if (rebuilding) return;
    const ok = window.confirm(
      "保存済みの全記事を削除して、すべてのフィードから再取得します。\n" +
      "（クリップに登録した記事の紐付けも消えます。クリップ自体は残ります）\n\n" +
      "続行しますか？"
    );
    if (!ok) return;
    setRebuilding(true);
    setRebuildMessage("再取得中…");
    try {
      const res = await window.api.articles.rebuildAll();
      setRebuildMessage(`${res.deleted} 件を削除し、再取得しました`);
      onArticlesRebuilt();
    } catch (err) {
      setRebuildMessage(`失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRebuilding(false);
    }
  };

  const saveApiKey = async () => {
    setSavingKey(true);
    setKeyMessage(null);
    try {
      await window.api.settings.setDeeplApiKey(apiKey);
      setApiKeyDirty(false);
      setKeyMessage("保存しました");
    } catch (err) {
      setKeyMessage(`保存に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingKey(false);
    }
  };

  const grouped = groupFeedsByCategory(feeds);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="設定"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="w-[640px] max-h-[80vh] flex flex-col bg-slate-800 border border-slate-700
          rounded-lg shadow-2xl text-slate-200 overflow-hidden"
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-700
          shrink-0 bg-slate-800">
          <h2 className="text-base font-semibold">設定</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-lg leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-sky-300 mb-2">APIキー</h3>
            <label className="block text-xs text-slate-400 mb-1">
              DeepL Auth Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setApiKeyDirty(true); setKeyMessage(null); }}
                placeholder="例: 0123abcd-ef45-..."
                className="flex-1 text-sm bg-slate-900 text-slate-100 px-2 py-1.5 rounded
                  border border-slate-700 focus:border-sky-500 outline-none"
              />
              <button
                onClick={saveApiKey}
                disabled={savingKey || !apiKeyDirty}
                className="text-sm px-3 py-1.5 bg-sky-600 hover:bg-sky-500
                  disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
              >
                {savingKey ? "保存中..." : "保存"}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              %APPDATA%/Aether/.env の DEEPL_API_KEY を更新します。
            </p>
            {keyMessage && (
              <p className="text-xs text-sky-400 mt-1">{keyMessage}</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-sky-300 mb-2">ニュースソース</h3>
            {grouped.map(group => (
              <div key={group.category} className="mb-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                  {categoryLabel(group.category)}
                </p>
                <ul className="space-y-1">
                  {group.feeds.map(f => (
                    <li key={f.id} className="flex items-center justify-between
                      px-2 py-1 rounded hover:bg-slate-700/40">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={f.enabled}
                          onChange={() => toggleFeed(f.id)}
                          className="accent-sky-500"
                        />
                        <span className="text-sm">{f.name}</span>
                        <span className="text-[11px] text-slate-500">
                          {f.region === "japan" ? "日本" : "世界"} / {f.language.toUpperCase()}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-sky-300 mb-2">表示</h3>
            <p className="text-xs text-slate-400 mb-2">ニュースツリーの初期展開</p>
            <div className="space-y-1.5">
              {TREE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-start gap-2 px-2 py-1.5 rounded
                    hover:bg-slate-700/40 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="treeDefaultExpand"
                    checked={settings?.treeDefaultExpand === opt.value}
                    onChange={() => updateSetting({ treeDefaultExpand: opt.value })}
                    className="mt-1 accent-sky-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm">{opt.label}</p>
                    <p className="text-[11px] text-slate-500">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              次回ニュース読み込み時から反映されます。
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-sky-300 mb-2">メンテナンス</h3>
            <p className="text-xs text-slate-400 mb-2">
              タイトルや本文が文字化けしている場合は、保存済みの記事を一旦削除して再取得できます。
            </p>
            <button
              onClick={handleRebuildAll}
              disabled={rebuilding}
              className="text-sm px-3 py-1.5 bg-rose-700 hover:bg-rose-600
                disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
            >
              {rebuilding ? "再取得中…" : "全記事を削除して再取得"}
            </button>
            <p className="text-[11px] text-slate-500 mt-1.5">
              ※ クリップに登録した記事との紐付けも消えます。クリップ自体は残ります。
            </p>
            {rebuildMessage && (
              <p className="text-xs text-sky-400 mt-1">{rebuildMessage}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function categoryLabel(c: string): string {
  switch (c) {
    case "general":  return "総合";
    case "tech":     return "テクノロジー";
    case "business": return "ビジネス";
    case "science":  return "科学";
    default:         return c;
  }
}

function groupFeedsByCategory(feeds: Feed[]): Array<{ category: string; feeds: Feed[] }> {
  const order = ["general", "tech", "business", "science"];
  const map = new Map<string, Feed[]>();
  for (const f of feeds) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category)!.push(f);
  }
  const known = order
    .filter(c => map.has(c))
    .map(c => ({ category: c, feeds: map.get(c)! }));
  const extras = [...map.entries()]
    .filter(([c]) => !order.includes(c))
    .map(([category, feeds]) => ({ category, feeds }));
  return [...known, ...extras];
}
