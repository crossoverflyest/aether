import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Article, ArticleGroup, TreeDefaultExpand } from "../../shared/types";
import ArticleRow from "./ArticleRow";

interface Props {
  groups: ArticleGroup[];
  selected: Article | null;
  onSelect: (a: Article) => void;
  onMarkAllRead: (ids: number[]) => void;
  translatedTitles: Record<number, string>;
  defaultExpand: TreeDefaultExpand;
  onContextMenu: (a: Article, x: number, y: number) => void;
}

export default function ArticleTree({
  groups, selected, onSelect, onMarkAllRead, translatedTitles, defaultExpand, onContextMenu,
}: Props) {
  const [openYears, setOpenYears]   = useState<Set<string>>(new Set());
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [openDays, setOpenDays]     = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedExpandRef = useRef<TreeDefaultExpand | null>(null);
  const groupsHadDataRef = useRef(false);

  useEffect(() => {
    if (groups.length === 0) {
      groupsHadDataRef.current = false;
      return;
    }
    if (
      groupsHadDataRef.current &&
      initializedExpandRef.current === defaultExpand
    ) {
      return;
    }
    groupsHadDataRef.current = true;
    initializedExpandRef.current = defaultExpand;

    const expanded = computeDefaultExpansion(groups, defaultExpand);
    setOpenYears(expanded.years);
    setOpenMonths(expanded.months);
    setOpenDays(expanded.days);
  }, [groups, defaultExpand]);

  // クリック選択時にArticleTreeにフォーカスを戻す（矢印キー操作を維持）
  const handleSelect = useCallback((a: Article) => {
    onSelect(a);
    containerRef.current?.focus({ preventScroll: true });
  }, [onSelect]);

  // 初回マウント時にフォーカスを当てる（即座に矢印キー操作可能に）
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const toggleYear  = (label: string) => setOpenYears(s  => toggle(s, label));
  const toggleMonth = (label: string) => setOpenMonths(s => toggle(s, label));
  const toggleDay   = (label: string) => setOpenDays(s   => toggle(s, label));

  const handleMarkGroupRead = useCallback((group: ArticleGroup) => {
    const ids = group.articles
      .filter(a => a.status === "unread")
      .map(a => a.id);
    if (ids.length > 0) onMarkAllRead(ids);
  }, [onMarkAllRead]);

  // 現在表示中（開いているグループ内）の記事をフラット化
  const visibleArticles = useMemo(() => {
    const result: Article[] = [];
    for (const year of groups) {
      if (!openYears.has(year.label)) continue;
      for (const month of year.children ?? []) {
        if (!openMonths.has(month.label)) continue;
        for (const day of month.children ?? []) {
          if (!openDays.has(day.label)) continue;
          result.push(...day.articles);
        }
      }
    }
    return result;
  }, [groups, openYears, openMonths, openDays]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (visibleArticles.length === 0) return;
    e.preventDefault();

    const currentIdx = selected
      ? visibleArticles.findIndex(a => a.id === selected.id)
      : -1;
    const nextIdx = e.key === "ArrowDown"
      ? (currentIdx < 0 ? 0 : Math.min(currentIdx + 1, visibleArticles.length - 1))
      : (currentIdx <= 0 ? 0 : currentIdx - 1);

    const next = visibleArticles[nextIdx];
    if (next && next.id !== selected?.id) handleSelect(next);
  };

  if (groups.length === 0) {
    return (
      <div className="w-80 flex items-center justify-center text-slate-500 text-sm border-r border-slate-700">
        ニュースがありません
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-80 border-r border-slate-700 overflow-y-auto bg-slate-900 shrink-0
        focus:outline-none focus:ring-1 focus:ring-sky-700/50 focus:ring-inset"
    >
      {groups.map(year => (
        <div key={year.label}>
          <GroupHeader
            label={year.label}
            unreadCount={year.unreadCount}
            open={openYears.has(year.label)}
            onToggle={() => toggleYear(year.label)}
            onMarkRead={() => handleMarkGroupRead(year)}
            level={0}
          />
          {openYears.has(year.label) && year.children?.map(month => (
            <div key={month.label}>
              <GroupHeader
                label={month.label.split("/")[1] + "月"}
                unreadCount={month.unreadCount}
                open={openMonths.has(month.label)}
                onToggle={() => toggleMonth(month.label)}
                onMarkRead={() => handleMarkGroupRead(month)}
                level={1}
              />
              {openMonths.has(month.label) && month.children?.map(day => (
                <div key={day.label}>
                  <GroupHeader
                    label={day.label.split("/")[2] + "日"}
                    unreadCount={day.unreadCount}
                    open={openDays.has(day.label)}
                    onToggle={() => toggleDay(day.label)}
                    onMarkRead={() => handleMarkGroupRead(day)}
                    level={2}
                  />
                  {openDays.has(day.label) && day.articles.map(article => (
                    <ArticleRow
                      key={article.id}
                      article={article}
                      selected={selected?.id === article.id}
                      onSelect={handleSelect}
                      translatedTitle={translatedTitles[article.id] ?? null}
                      onContextMenu={onContextMenu}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface HeaderProps {
  label: string;
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  level: number;
}

function GroupHeader({ label, unreadCount, open, onToggle, onMarkRead, level }: HeaderProps) {
  const indent = level === 0 ? "pl-3" : level === 1 ? "pl-6" : "pl-9";
  return (
    <div
      className={`flex items-center ${indent} pr-2 py-1.5 cursor-pointer
        hover:bg-slate-800 border-b border-slate-800 group`}
      onClick={onToggle}
    >
      <span className="text-slate-500 mr-1.5 text-xs">{open ? "▾" : "▸"}</span>
      <span className="text-sm font-semibold text-slate-300 flex-1">{label}</span>
      {unreadCount > 0 && (
        <span className="text-xs bg-sky-600 text-white rounded-full px-1.5 py-0.5 mr-1">
          {unreadCount}
        </span>
      )}
      {unreadCount > 0 && (
        <button
          onClick={e => { e.stopPropagation(); onMarkRead(); }}
          className="text-xs text-slate-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="すべて既読にする"
        >
          既読
        </button>
      )}
    </div>
  );
}

function toggle(s: Set<string>, key: string): Set<string> {
  const next = new Set(s);
  next.has(key) ? next.delete(key) : next.add(key);
  return next;
}

interface ExpansionSets {
  years:  Set<string>;
  months: Set<string>;
  days:   Set<string>;
}

function computeDefaultExpansion(
  groups: ArticleGroup[],
  mode: TreeDefaultExpand
): ExpansionSets {
  const years  = new Set<string>();
  const months = new Set<string>();
  const days   = new Set<string>();

  if (mode === "none" || groups.length === 0) {
    return { years, months, days };
  }

  if (mode === "all") {
    for (const y of groups) {
      years.add(y.label);
      for (const m of y.children ?? []) {
        months.add(m.label);
        for (const d of m.children ?? []) {
          days.add(d.label);
        }
      }
    }
    return { years, months, days };
  }

  const now = new Date();
  const yearLabel  = String(now.getFullYear());
  const monthLabel = `${yearLabel}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayLabel   = `${monthLabel}/${String(now.getDate()).padStart(2, "0")}`;

  const matchedYear = groups.find(y => y.label === yearLabel) ?? groups[0];
  if (!matchedYear) return { years, months, days };
  years.add(matchedYear.label);

  const matchedMonth =
    matchedYear.children?.find(m => m.label === monthLabel) ??
    matchedYear.children?.[0];
  if (!matchedMonth) return { years, months, days };
  months.add(matchedMonth.label);

  if (mode === "currentMonth") {
    for (const d of matchedMonth.children ?? []) {
      days.add(d.label);
    }
    return { years, months, days };
  }

  // mode === "today"
  const matchedDay =
    matchedMonth.children?.find(d => d.label === dayLabel) ??
    matchedMonth.children?.[0];
  if (matchedDay) days.add(matchedDay.label);
  return { years, months, days };
}
