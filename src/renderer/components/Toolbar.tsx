import React from "react";
import type { FilterOptions, SortKey, SortOrder } from "../../shared/types";

interface Props {
  loading: boolean;
  onRefresh: () => void;
  filter: FilterOptions;
  onFilterChange: (f: FilterOptions) => void;
}

export default function Toolbar({ loading, onRefresh, filter, onFilterChange }: Props) {
  const setSortKey = (sortKey: SortKey) =>
    onFilterChange({ ...filter, sortKey });

  const toggleOrder = () =>
    onFilterChange({ ...filter, sortOrder: filter.sortOrder === "desc" ? "asc" : "desc" });

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500
          disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors"
      >
        <span className={loading ? "animate-spin inline-block" : ""}>↻</span>
        {loading ? "取得中..." : "更新"}
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-slate-400">並び替え:</span>
        {(["publishedAt", "source", "category"] as SortKey[]).map(k => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={`text-xs px-2 py-1 rounded transition-colors
              ${filter.sortKey === k
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-slate-200"}`}
          >
            {k === "publishedAt" ? "日時" : k === "source" ? "ソース" : "カテゴリ"}
          </button>
        ))}
        <button
          onClick={toggleOrder}
          className="text-xs px-2 py-1 text-slate-400 hover:text-slate-200"
          title="昇順/降順切り替え"
        >
          {filter.sortOrder === "desc" ? "↓ 新しい順" : "↑ 古い順"}
        </button>
      </div>
    </div>
  );
}
