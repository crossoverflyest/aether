import React, { useEffect, useRef, useState } from "react";
import type { Article, Clip } from "../../shared/types";

interface Props {
  article: Article;
  clips: Clip[];
  x: number;
  y: number;
  onClose: () => void;
  onClipsChanged: () => void;
}

const MENU_WIDTH = 240;
const MENU_MAX_HEIGHT = 360;

export default function ArticleContextMenu({
  article, clips, x, y, onClose, onClipsChanged,
}: Props) {
  const [memberClipIds, setMemberClipIds] = useState<Set<number>>(new Set());
  const [adding, setAdding]               = useState(false);
  const [newName, setNewName]             = useState("");
  const [busy, setBusy]                   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    window.api.clips.forArticle(article.id).then(ids => {
      if (!cancelled) setMemberClipIds(new Set(ids));
    });
    return () => { cancelled = true; };
  }, [article.id]);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleDocClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const toggleMembership = async (clipId: number) => {
    if (busy) return;
    setBusy(true);
    try {
      if (memberClipIds.has(clipId)) {
        await window.api.clips.removeArticle(article.id, clipId);
        setMemberClipIds(prev => {
          const next = new Set(prev);
          next.delete(clipId);
          return next;
        });
      } else {
        await window.api.clips.addArticle(article.id, clipId);
        setMemberClipIds(prev => new Set(prev).add(clipId));
      }
      onClipsChanged();
    } finally {
      setBusy(false);
    }
  };

  const submitNewClip = async () => {
    const trimmed = newName.trim();
    if (!trimmed || busy) {
      setAdding(false);
      setNewName("");
      return;
    }
    setBusy(true);
    try {
      const created = await window.api.clips.create(trimmed);
      await window.api.clips.addArticle(article.id, created.id);
      setMemberClipIds(prev => new Set(prev).add(created.id));
      onClipsChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`クリップ作成に失敗しました: ${msg}`);
    } finally {
      setBusy(false);
      setAdding(false);
      setNewName("");
    }
  };

  const openExternal = async () => {
    await window.api.shell.openExternal(article.url);
    onClose();
  };

  const viewportW = typeof window !== "undefined" ? window.innerWidth  : MENU_WIDTH;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : MENU_MAX_HEIGHT;
  const left = Math.min(x, viewportW - MENU_WIDTH - 8);
  const top  = Math.min(y, viewportH - MENU_MAX_HEIGHT - 8);

  return (
    <div
      ref={containerRef}
      role="menu"
      style={{ left, top, width: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT }}
      className="fixed z-50 bg-slate-800 border border-slate-700 rounded shadow-2xl
        text-slate-200 overflow-hidden flex flex-col"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-slate-500 border-b border-slate-700">
        クリップに追加
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {clips.length === 0 && !adding && (
          <p className="px-3 py-2 text-xs text-slate-500 italic">
            クリップがまだありません
          </p>
        )}
        {clips.map(clip => {
          const checked = memberClipIds.has(clip.id);
          return (
            <button
              key={clip.id}
              onClick={() => toggleMembership(clip.id)}
              role="menuitemcheckbox"
              aria-checked={checked}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700/60
                flex items-center gap-2"
            >
              <span className={`w-3 inline-block ${checked ? "text-sky-400" : "text-transparent"}`}>
                ✓
              </span>
              <span className="truncate flex-1">{clip.name}</span>
              {clip.articleCount > 0 && (
                <span className="text-[11px] text-slate-500">{clip.articleCount}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="border-t border-slate-700 py-1">
        {adding ? (
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") submitNewClip();
              if (e.key === "Escape") { setAdding(false); setNewName(""); }
            }}
            onBlur={submitNewClip}
            placeholder="クリップ名"
            className="w-[calc(100%-16px)] mx-2 my-1 text-sm bg-slate-900 text-slate-100
              px-2 py-1 rounded border border-sky-500 outline-none"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            role="menuitem"
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700/60 text-slate-300"
          >
            ＋ 新規クリップに追加…
          </button>
        )}
      </div>
      <div className="border-t border-slate-700 py-1">
        <button
          onClick={openExternal}
          role="menuitem"
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700/60 text-slate-300"
        >
          ブラウザで開く
        </button>
      </div>
    </div>
  );
}
