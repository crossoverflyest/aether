export type ReadStatus = "unread" | "read";

export interface Article {
  id: number;
  guid: string;
  title: string;
  url: string;
  summary: string | null;
  source: string;
  category: string;
  publishedAt: string; // ISO8601
  fetchedAt: string;   // ISO8601
  status: ReadStatus;
  imageUrl: string | null;
}

export interface Feed {
  id: number;
  name: string;
  url: string;
  category: string;
  region: string;
  language: string;
  enabled: boolean;
  lastFetchedAt: string | null;
}

export interface ArticleGroup {
  label: string;       // 年 / 月 / 日 のラベル
  articles: Article[];
  children?: ArticleGroup[];
  unreadCount: number;
}

export type SortKey = "publishedAt" | "source" | "category";
export type SortOrder = "asc" | "desc";

export interface FilterOptions {
  status: "all" | "unread" | "read";
  category: string | null;
  region: string | null;
  sortKey: SortKey;
  sortOrder: SortOrder;
  clipId?: number | null;
}

export interface Clip {
  id: number;
  name: string;
  createdAt: string;
  articleCount: number;
}
