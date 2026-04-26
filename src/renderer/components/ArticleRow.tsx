import React, { useEffect, useRef } from "react";
import type { Article } from "../../shared/types";

interface Props {
  article: Article;
  selected: boolean;
  onSelect: (a: Article) => void;
  translatedTitle: string | null;
}

export default function ArticleRow({ article, selected, onSelect, translatedTitle }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  return (
    <div
      ref={rowRef}
      onClick={() => onSelect(article)}
      className={`px-4 py-2 cursor-pointer border-b border-slate-800 transition-colors
        ${selected ? "bg-sky-900/60" : "hover:bg-slate-800"}
        ${article.status === "unread" ? "" : "opacity-60"}`}
    >
      <div className="flex items-start gap-2">
        {article.status === "unread" && (
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
        )}
        {article.status === "read" && (
          <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className={`text-sm leading-snug line-clamp-2
            ${article.status === "unread" ? "text-slate-100 font-medium" : "text-slate-400"}`}>
            {article.title}
          </p>
          {translatedTitle && (
            <p className="text-xs leading-snug line-clamp-2 mt-0.5 text-purple-300">
              {translatedTitle}
            </p>
          )}
          <div className="flex gap-2 mt-1 text-xs text-slate-500">
            <span className="truncate max-w-[120px]">{article.source}</span>
            <span>·</span>
            <span>{formatTime(article.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
