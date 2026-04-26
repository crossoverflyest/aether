import React, { useEffect, useRef, useState } from "react";
import type { Article, Clip } from "../../shared/types";

interface Props {
  article: Article | null;
  translatedTitle: string | null;
  clips: Clip[];
  onClipsChanged: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  general:  "総合",
  tech:     "テクノロジー",
  business: "ビジネス",
  science:  "科学",
};

export default function ArticleDetail({ article, translatedTitle, clips, onClipsChanged }: Props) {
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [failed, setFailed]           = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [clipPickerOpen, setClipPickerOpen] = useState(false);
  const [activeClipIds, setActiveClipIds]   = useState<Set<number>>(new Set());
  const [newClipName, setNewClipName]       = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!article) {
      setFullContent(null);
      setTranslatedContent(null);
      setShowTranslation(false);
      setActiveClipIds(new Set());
      setClipPickerOpen(false);
      return;
    }
    let cancelled = false;
    setFullContent(null);
    setFailed(false);
    setLoading(true);
    setTranslatedContent(null);
    setShowTranslation(false);
    setClipPickerOpen(false);

    window.api.articles.fullContent(article.id, article.url)
      .then(content => {
        if (cancelled) return;
        if (content) setFullContent(content);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));

    window.api.clips.forArticle(article.id)
      .then(ids => { if (!cancelled) setActiveClipIds(new Set(ids)); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [article?.id]);

  // ピッカー外をクリックで閉じる
  useEffect(() => {
    if (!clipPickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setClipPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [clipPickerOpen]);

  const toggleClip = async (clipId: number) => {
    if (!article) return;
    const next = new Set(activeClipIds);
    if (next.has(clipId)) {
      next.delete(clipId);
      await window.api.clips.removeArticle(article.id, clipId);
    } else {
      next.add(clipId);
      await window.api.clips.addArticle(article.id, clipId);
    }
    setActiveClipIds(next);
    onClipsChanged();
  };

  const handleCreateAndAdd = async () => {
    const name = newClipName.trim();
    if (!name || !article) return;
    try {
      const created = await window.api.clips.create(name);
      await window.api.clips.addArticle(article.id, created.id);
      setActiveClipIds(prev => new Set(prev).add(created.id));
      setNewClipName("");
      onClipsChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`クリップ作成に失敗しました: ${msg}`);
    }
  };

  const handleTranslate = async () => {
    if (!article || !fullContent) return;
    setIsTranslating(true);
    try {
      const t = await window.api.articles.translate(article.id, fullContent);
      setTranslatedContent(t);
      setShowTranslation(true);
    } catch (error) {
      console.error("Translation failed:", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`翻訳に失敗しました: ${msg}`);
    } finally {
      setIsTranslating(false);
    }
  };

  if (!article) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
        記事を選択してください
      </div>
    );
  }

  const contentToDisplay = showTranslation ? translatedContent : fullContent;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
      <div className="max-w-2xl mx-auto">
        {article.imageUrl && (
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-48 object-cover rounded-lg mb-5 bg-slate-800"
            onError={e => (e.currentTarget.style.display = "none")}
          />
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
            {CATEGORY_LABEL[article.category] ?? article.category}
          </span>
          <span className="text-xs text-slate-500">{article.source}</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">{formatDate(article.publishedAt)}</span>
          {article.status === "read" && (
            <span className="text-xs text-slate-600 ml-auto">既読</span>
          )}
        </div>

        <h2 className="text-xl font-bold text-slate-100 leading-snug mb-2">
          {article.title}
        </h2>
        {translatedTitle && (
          <h3 className="text-base font-semibold text-purple-300 leading-snug mb-4">
            {translatedTitle}
          </h3>
        )}

        {/* 翻訳ボタン & クリップボタン */}
        <div className="flex gap-2 mb-6 items-center relative">
          {fullContent && !translatedContent && (
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600
                text-white rounded transition-colors flex items-center gap-1"
            >
              {isTranslating ? (
                <>
                  <span className="inline-block animate-spin">↻</span>
                  翻訳中...
                </>
              ) : (
                "翻訳"
              )}
            </button>
          )}
          {fullContent && translatedContent && (
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-500
                text-white rounded transition-colors"
            >
              {showTranslation ? "原文を見る" : "日本語で見る"}
            </button>
          )}

          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setClipPickerOpen(o => !o)}
              className={`text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1
                ${activeClipIds.size > 0
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200"}`}
            >
              {activeClipIds.size > 0 ? "★" : "☆"} クリップ
              {activeClipIds.size > 0 && (
                <span className="ml-1 text-amber-100">({activeClipIds.size})</span>
              )}
            </button>

            {clipPickerOpen && (
              <div className="absolute z-10 left-0 mt-1 w-56 bg-slate-800 border border-slate-600
                rounded shadow-lg py-2 text-sm">
                <p className="px-3 pb-1 text-xs text-slate-500 uppercase tracking-wider">
                  クリップに追加
                </p>
                <div className="max-h-48 overflow-y-auto">
                  {clips.length === 0 && (
                    <p className="px-3 py-1 text-xs text-slate-500 italic">
                      クリップがありません
                    </p>
                  )}
                  {clips.map(c => {
                    const checked = activeClipIds.has(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center px-3 py-1.5 hover:bg-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClip(c.id)}
                          className="mr-2 accent-amber-500"
                        />
                        <span className="text-slate-200 truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="border-t border-slate-700 mt-1 pt-2 px-3">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newClipName}
                      onChange={e => setNewClipName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreateAndAdd(); }}
                      placeholder="新規クリップ名"
                      className="flex-1 text-xs bg-slate-700 text-slate-100 px-2 py-1 rounded
                        border border-slate-600 outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={handleCreateAndAdd}
                      disabled={!newClipName.trim()}
                      className="text-xs px-2 py-1 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600
                        text-white rounded"
                    >
                      追加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 本文 — 取得状態に応じて表示切り替え */}
        <div className="mb-6">
          {loading && (
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span className="inline-block animate-spin">↻</span>
              本文を取得中...
            </div>
          )}

          {!loading && contentToDisplay && (
            <div className="text-slate-200 text-[15px] leading-relaxed space-y-3">
              {contentToDisplay.split(/\n{2,}|\n/).map((para, idx) => {
                const trimmed = para.trim();
                return trimmed ? <p key={idx}>{trimmed}</p> : null;
              })}
            </div>
          )}

          {!loading && !fullContent && article.summary && (
            <p className="text-slate-300 text-sm leading-relaxed">{article.summary}</p>
          )}

          {!loading && !fullContent && !article.summary && failed && (
            <p className="text-slate-500 text-sm italic">
              本文を取得できませんでした。元記事をご覧ください。
            </p>
          )}
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => {
            e.preventDefault();
            window.open(article.url, "_blank");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300
            border border-sky-600 hover:border-sky-400 px-4 py-2 rounded transition-colors"
        >
          元記事を開く →
        </a>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} `
    + `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
