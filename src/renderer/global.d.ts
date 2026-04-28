import type { AppSettings, Article, ArticleGroup, Feed, FilterOptions, Clip } from "../shared/types";

declare global {
  interface Window {
    api: {
      articles: {
        list:        (filter: FilterOptions) => Promise<Article[]>;
        grouped:     (filter: FilterOptions) => Promise<ArticleGroup[]>;
        markRead:    (id: number)            => Promise<{ ok: boolean }>;
        markAllRead: (ids: number[])         => Promise<{ ok: boolean }>;
        unreadCount: ()                      => Promise<number>;
        fullContent: (id: number, url: string) => Promise<string | null>;
        translate:   (id: number, text: string) => Promise<string>;
        translateTitle: (id: number, text: string) => Promise<string>;
        getCachedTitleTranslation: (id: number) => Promise<string | null>;
        translateTitlesBatch: (items: Array<{ id: number; title: string }>) =>
          Promise<Record<number, string>>;
        rebuildAll: () => Promise<{ deleted: number }>;
      };
      feeds: {
        list:          ()           => Promise<Feed[]>;
        toggleEnabled: (id: number) => Promise<Feed>;
      };
      news: {
        refresh:    ()                  => Promise<{ ok: boolean }>;
        onRefreshed: (cb: () => void)   => () => void;
      };
      clips: {
        list:          () => Promise<Clip[]>;
        create:        (name: string) => Promise<Clip>;
        rename:        (id: number, name: string) => Promise<Clip | null>;
        delete:        (id: number) => Promise<{ ok: boolean }>;
        addArticle:    (articleId: number, clipId: number) => Promise<{ ok: boolean }>;
        removeArticle: (articleId: number, clipId: number) => Promise<{ ok: boolean }>;
        forArticle:    (articleId: number) => Promise<number[]>;
      };
      settings: {
        get:            () => Promise<AppSettings>;
        set:            (patch: Partial<AppSettings>) => Promise<AppSettings>;
        getDeeplApiKey: () => Promise<string>;
        setDeeplApiKey: (key: string) => Promise<{ ok: boolean }>;
      };
      shell: {
        openExternal:   (url: string) => Promise<{ ok: boolean }>;
      };
      menu: {
        onOpenSettings: (cb: () => void) => () => void;
        onRefreshNews:  (cb: () => void) => () => void;
      };
    };
  }
}
