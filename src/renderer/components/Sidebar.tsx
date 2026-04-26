import React, { useState } from "react";
import type { FilterOptions, Clip } from "../../shared/types";

const CATEGORIES = [
  { key: null,       label: "すべて" },
  { key: "general",  label: "総合" },
  { key: "tech",     label: "テクノロジー" },
  { key: "business", label: "ビジネス" },
  { key: "science",  label: "科学" },
];

interface Props {
  unreadCount: number;
  filter: FilterOptions;
  onFilterChange: (f: FilterOptions) => void;
  clips: Clip[];
  onCreateClip: (name: string) => void;
  onDeleteClip: (id: number) => void;
  onRenameClip: (id: number, name: string) => void;
}

export default function Sidebar({
  unreadCount, filter, onFilterChange,
  clips, onCreateClip, onDeleteClip, onRenameClip,
}: Props) {
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState("");

  const setStatus = (status: FilterOptions["status"]) =>
    onFilterChange({ ...filter, status });

  const setCategory = (category: string | null) =>
    onFilterChange({ ...filter, category, clipId: null });

  const setClip = (clipId: number | null) =>
    onFilterChange({ ...filter, clipId });

  const submitNewClip = () => {
    const trimmed = newName.trim();
    if (trimmed) onCreateClip(trimmed);
    setNewName("");
    setAdding(false);
  };

  const handleRename = (clip: Clip) => {
    const next = window.prompt("クリップ名を変更", clip.name);
    if (next && next.trim() && next.trim() !== clip.name) {
      onRenameClip(clip.id, next.trim());
    }
  };

  const handleDelete = (clip: Clip) => {
    if (window.confirm(`「${clip.name}」を削除しますか？\n（記事は削除されません）`)) {
      onDeleteClip(clip.id);
    }
  };

  return (
    <aside className="w-52 bg-slate-800 flex flex-col border-r border-slate-700 shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
          Aether
        </h1>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-0.5">
          news from the world
        </p>
        {unreadCount > 0 && (
          <span className="text-xs text-sky-400 mt-2 block">{unreadCount} 件未読</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <section className="mb-4">
          <p className="px-4 text-xs text-slate-500 uppercase tracking-widest mb-1">既読状態</p>
          {(["all", "unread", "read"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`w-full text-left px-4 py-1.5 text-sm rounded-none transition-colors
                ${filter.status === s
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"}`}
            >
              {s === "all" ? "すべて" : s === "unread" ? "未読" : "既読"}
            </button>
          ))}
        </section>

        <section className="mb-4">
          <p className="px-4 text-xs text-slate-500 uppercase tracking-widest mb-1">カテゴリ</p>
          {CATEGORIES.map(c => (
            <button
              key={c.key ?? "__all"}
              onClick={() => setCategory(c.key)}
              className={`w-full text-left px-4 py-1.5 text-sm rounded-none transition-colors
                ${filter.category === c.key && !filter.clipId
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"}`}
            >
              {c.label}
            </button>
          ))}
        </section>

        <section>
          <div className="px-4 mb-1 flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-widest">クリップ</p>
            <button
              onClick={() => setAdding(true)}
              className="text-slate-400 hover:text-sky-400 text-base leading-none"
              title="新規クリップ"
            >
              +
            </button>
          </div>

          {adding && (
            <div className="px-4 py-1.5">
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
                className="w-full text-sm bg-slate-700 text-slate-100 px-2 py-1 rounded
                  border border-sky-500 outline-none"
              />
            </div>
          )}

          {clips.length === 0 && !adding && (
            <p className="px-4 py-1.5 text-xs text-slate-600 italic">
              「+」で作成
            </p>
          )}

          {clips.map(clip => (
            <div
              key={clip.id}
              className={`group flex items-center justify-between transition-colors
                ${filter.clipId === clip.id
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"}`}
            >
              <button
                onClick={() => setClip(clip.id)}
                className="flex-1 text-left px-4 py-1.5 text-sm truncate"
                title={clip.name}
              >
                {clip.name}
                {clip.articleCount > 0 && (
                  <span className={`ml-1.5 text-xs
                    ${filter.clipId === clip.id ? "text-sky-100" : "text-slate-500"}`}>
                    ({clip.articleCount})
                  </span>
                )}
              </button>
              <div className="flex items-center pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRename(clip)}
                  className={`text-xs px-1 hover:text-amber-300
                    ${filter.clipId === clip.id ? "text-sky-100" : "text-slate-500"}`}
                  title="名前を変更"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(clip)}
                  className={`text-xs px-1 hover:text-rose-300
                    ${filter.clipId === clip.id ? "text-sky-100" : "text-slate-500"}`}
                  title="削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </section>
      </nav>
    </aside>
  );
}
