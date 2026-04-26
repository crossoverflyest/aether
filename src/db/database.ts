import initSqlJs, { Database as SqlJsDatabase, SqlValue } from "sql.js";
import path from "path";
import fs from "fs";
import { app } from "electron";

import type { Article, Feed, ArticleGroup, FilterOptions, Clip } from "../shared/types";
import { DEFAULT_FEEDS } from "../feeds/sources";

const DB_PATH   = path.join(app.getPath("userData"), "news.db");
const WASM_PATH = path.join(app.getAppPath(), "node_modules/sql.js/dist/sql-wasm.wasm");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS articles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  guid         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  url          TEXT    NOT NULL,
  summary      TEXT,
  source       TEXT    NOT NULL,
  category     TEXT    NOT NULL DEFAULT 'general',
  published_at TEXT    NOT NULL,
  fetched_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  status       TEXT    NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  image_url    TEXT
);
CREATE TABLE IF NOT EXISTS feeds (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  url             TEXT    NOT NULL UNIQUE,
  category        TEXT    NOT NULL DEFAULT 'general',
  region          TEXT    NOT NULL DEFAULT 'world',
  language        TEXT    NOT NULL DEFAULT 'ja',
  enabled         INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TEXT
);
CREATE TABLE IF NOT EXISTS article_translations (
  article_id      INTEGER PRIMARY KEY,
  translated_title TEXT,
  translated_content TEXT,
  translated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS clips (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS article_clips (
  article_id  INTEGER NOT NULL,
  clip_id     INTEGER NOT NULL,
  clipped_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(article_id, clip_id),
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY(clip_id)    REFERENCES clips(id)    ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status        ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category      ON articles(category);
CREATE INDEX IF NOT EXISTS idx_article_clips_article  ON article_clips(article_id);
CREATE INDEX IF NOT EXISTS idx_article_clips_clip     ON article_clips(clip_id);
`;

class NewsDatabase {
  private db!: SqlJsDatabase;

  async initialize() {
    const SQL = await initSqlJs({ locateFile: () => WASM_PATH });

    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(SCHEMA);
    // 既存DBへのマイグレーション（カラムが既にあれば例外を無視）
    try { this.db.run("ALTER TABLE articles ADD COLUMN full_content TEXT"); } catch {}
    try { this.db.run("ALTER TABLE article_translations ADD COLUMN translated_title TEXT"); } catch {}
    // 既存の article_translations テーブルに translated_content NOT NULL 制約があれば、再作成して制約を外す
    this.migrateTranslationsTable();
    this.save();
    this.seedDefaultFeeds();
    this.syncDefaultFeeds();
  }

  // DEFAULT_FEEDS の最新状態（enabled/url/category）をDBに反映
  private syncDefaultFeeds() {
    let changed = false;
    for (const f of DEFAULT_FEEDS) {
      const existing = this.queryOne<any>("SELECT id, url, enabled, category FROM feeds WHERE name = ?", [f.name]);
      if (!existing) continue;
      const enabledNum = f.enabled ? 1 : 0;
      if (existing.url !== f.url || existing.enabled !== enabledNum || existing.category !== f.category) {
        this.db.run(
          "UPDATE feeds SET url = ?, enabled = ?, category = ? WHERE name = ?",
          [f.url, enabledNum, f.category, f.name]
        );
        changed = true;
      }
    }
    if (changed) this.save();
  }

  private save() {
    const data = this.db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  private seedDefaultFeeds() {
    const count = this.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM feeds")!.c;
    if (count > 0) return;
    for (const f of DEFAULT_FEEDS) {
      this.db.run(
        `INSERT OR IGNORE INTO feeds (name, url, category, region, language, enabled)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [f.name, f.url, f.category, f.region, f.language, f.enabled ? 1 : 0]
      );
    }
    this.save();
  }

  // ===== 汎用クエリヘルパー =====

  private queryAll<T extends Record<string, unknown>>(sql: string, params: SqlValue[] = []): T[] {
    const result = this.db.exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj as T;
    });
  }

  private queryOne<T extends Record<string, unknown>>(sql: string, params: SqlValue[] = []): T | null {
    const rows = this.queryAll<T>(sql, params);
    return rows[0] ?? null;
  }

  // ===== Feeds =====

  getFeeds(): Feed[] {
    return this.queryAll<any>("SELECT * FROM feeds ORDER BY region, category, name").map(this.rowToFeed);
  }

  getEnabledFeeds(): Feed[] {
    return this.queryAll<any>("SELECT * FROM feeds WHERE enabled = 1").map(this.rowToFeed);
  }

  upsertFeedFetched(feedId: number, fetchedAt: string) {
    this.db.run("UPDATE feeds SET last_fetched_at = ? WHERE id = ?", [fetchedAt, feedId]);
    this.save();
  }

  toggleFeedEnabled(id: number): Feed {
    this.db.run("UPDATE feeds SET enabled = 1 - enabled WHERE id = ?", [id]);
    this.save();
    return this.rowToFeed(this.queryOne<any>("SELECT * FROM feeds WHERE id = ?", [id])!);
  }

  private rowToFeed(row: any): Feed {
    return {
      id:            row.id as number,
      name:          row.name as string,
      url:           row.url as string,
      category:      row.category as string,
      region:        row.region as string,
      language:      row.language as string,
      enabled:       row.enabled === 1,
      lastFetchedAt: (row.last_fetched_at as string) ?? null,
    };
  }

  // ===== Articles =====

  insertArticles(articles: Omit<Article, "id">[]) {
    for (const a of articles) {
      this.db.run(
        `INSERT OR IGNORE INTO articles
           (guid, title, url, summary, source, category, published_at, fetched_at, status, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.guid, a.title, a.url, a.summary ?? null, a.source, a.category,
         a.publishedAt, a.fetchedAt, a.status, a.imageUrl ?? null]
      );
    }
    if (articles.length > 0) this.save();
  }

  getArticles(filter: FilterOptions): Article[] {
    const { where, params } = this.buildWhere(filter);
    const order = this.buildOrder(filter);
    return this.queryAll<any>(`SELECT * FROM articles ${where} ${order}`, params)
      .map(this.rowToArticle);
  }

  getArticlesGrouped(filter: FilterOptions): ArticleGroup[] {
    return this.groupByDate(this.getArticles(filter));
  }

  markRead(id: number) {
    this.db.run("UPDATE articles SET status = 'read' WHERE id = ?", [id]);
    this.save();
    return { ok: true };
  }

  markAllRead(ids: number[]) {
    for (const id of ids) {
      this.db.run("UPDATE articles SET status = 'read' WHERE id = ?", [id]);
    }
    if (ids.length > 0) this.save();
    return { ok: true };
  }

  getUnreadCount(): number {
    return (this.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM articles WHERE status = 'unread'")?.c) ?? 0;
  }

  getFullContent(id: number): string | null {
    const row = this.queryOne<{ full_content: string | null }>(
      "SELECT full_content FROM articles WHERE id = ?",
      [id]
    );
    return row?.full_content ?? null;
  }

  setFullContent(id: number, content: string) {
    this.db.run("UPDATE articles SET full_content = ? WHERE id = ?", [content, id]);
    this.save();
  }

  getTranslation(id: number): string | null {
    const row = this.queryOne<{ translated_content: string | null }>(
      "SELECT translated_content FROM article_translations WHERE article_id = ?",
      [id]
    );
    return row?.translated_content || null;
  }

  saveTranslation(id: number, translatedContent: string) {
    const existing = this.queryOne<{ article_id: number }>(
      "SELECT article_id FROM article_translations WHERE article_id = ?",
      [id]
    );
    if (existing) {
      this.db.run(
        "UPDATE article_translations SET translated_content = ?, translated_at = datetime('now') WHERE article_id = ?",
        [translatedContent, id]
      );
    } else {
      this.db.run(
        "INSERT INTO article_translations (article_id, translated_content) VALUES (?, ?)",
        [id, translatedContent]
      );
    }
    this.save();
  }

  getTitleTranslation(id: number): string | null {
    const row = this.queryOne<{ translated_title: string | null }>(
      "SELECT translated_title FROM article_translations WHERE article_id = ?",
      [id]
    );
    return row?.translated_title || null;
  }

  saveTitleTranslation(id: number, translatedTitle: string) {
    const existing = this.queryOne<{ article_id: number }>(
      "SELECT article_id FROM article_translations WHERE article_id = ?",
      [id]
    );
    if (existing) {
      this.db.run(
        "UPDATE article_translations SET translated_title = ?, translated_at = datetime('now') WHERE article_id = ?",
        [translatedTitle, id]
      );
    } else {
      this.db.run(
        "INSERT INTO article_translations (article_id, translated_title, translated_content) VALUES (?, ?, NULL)",
        [id, translatedTitle]
      );
    }
    this.save();
  }

  // translated_content の NOT NULL 制約を持つ古いスキーマなら、テーブルを再作成
  private migrateTranslationsTable() {
    const cols = this.queryAll<{ name: string; notnull: number }>(
      "PRAGMA table_info(article_translations)"
    );
    const contentCol = cols.find(c => c.name === "translated_content");
    if (!contentCol || contentCol.notnull === 0) return;

    this.db.run(`
      CREATE TABLE article_translations_new (
        article_id INTEGER PRIMARY KEY,
        translated_title TEXT,
        translated_content TEXT,
        translated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
      );
      INSERT INTO article_translations_new (article_id, translated_title, translated_content, translated_at)
        SELECT article_id, translated_title, translated_content, translated_at FROM article_translations;
      DROP TABLE article_translations;
      ALTER TABLE article_translations_new RENAME TO article_translations;
    `);
  }

  private buildWhere(filter: FilterOptions): { where: string; params: SqlValue[] } {
    const conditions: string[] = [];
    const params: SqlValue[] = [];
    if (filter.status !== "all") {
      conditions.push("status = ?");
      params.push(filter.status);
    }
    if (filter.category) {
      conditions.push("category = ?");
      params.push(filter.category);
    }
    if (filter.clipId != null) {
      conditions.push("id IN (SELECT article_id FROM article_clips WHERE clip_id = ?)");
      params.push(filter.clipId);
    }
    return {
      where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
      params,
    };
  }

  // ===== Clips =====

  getClips(): Clip[] {
    const rows = this.queryAll<any>(`
      SELECT c.id, c.name, c.created_at,
        (SELECT COUNT(*) FROM article_clips ac WHERE ac.clip_id = c.id) AS article_count
      FROM clips c
      ORDER BY c.created_at ASC
    `);
    return rows.map(r => ({
      id:           r.id as number,
      name:         r.name as string,
      createdAt:    r.created_at as string,
      articleCount: r.article_count as number,
    }));
  }

  createClip(name: string): Clip {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("クリップ名が空です");
    this.db.run("INSERT INTO clips (name) VALUES (?)", [trimmed]);
    this.save();
    const row = this.queryOne<any>("SELECT * FROM clips WHERE name = ?", [trimmed])!;
    return {
      id:           row.id as number,
      name:         row.name as string,
      createdAt:    row.created_at as string,
      articleCount: 0,
    };
  }

  renameClip(id: number, name: string): Clip | null {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("クリップ名が空です");
    this.db.run("UPDATE clips SET name = ? WHERE id = ?", [trimmed, id]);
    this.save();
    const row = this.queryOne<any>("SELECT * FROM clips WHERE id = ?", [id]);
    if (!row) return null;
    const count = this.queryOne<{ c: number }>(
      "SELECT COUNT(*) AS c FROM article_clips WHERE clip_id = ?",
      [id]
    )?.c ?? 0;
    return {
      id:           row.id as number,
      name:         row.name as string,
      createdAt:    row.created_at as string,
      articleCount: count,
    };
  }

  deleteClip(id: number) {
    this.db.run("DELETE FROM clips WHERE id = ?", [id]);
    this.save();
  }

  addArticleToClip(articleId: number, clipId: number) {
    this.db.run(
      "INSERT OR IGNORE INTO article_clips (article_id, clip_id) VALUES (?, ?)",
      [articleId, clipId]
    );
    this.save();
  }

  removeArticleFromClip(articleId: number, clipId: number) {
    this.db.run(
      "DELETE FROM article_clips WHERE article_id = ? AND clip_id = ?",
      [articleId, clipId]
    );
    this.save();
  }

  getClipsForArticle(articleId: number): number[] {
    return this.queryAll<{ clip_id: number }>(
      "SELECT clip_id FROM article_clips WHERE article_id = ?",
      [articleId]
    ).map(r => r.clip_id);
  }

  private buildOrder(filter: FilterOptions): string {
    const col = filter.sortKey === "publishedAt" ? "published_at"
              : filter.sortKey === "source"      ? "source"
              : "category";
    return `ORDER BY ${col} ${filter.sortOrder === "asc" ? "ASC" : "DESC"}`;
  }

  private groupByDate(articles: Article[]): ArticleGroup[] {
    const yearMap = new Map<string, Map<string, Map<string, Article[]>>>();

    for (const article of articles) {
      const d     = new Date(article.publishedAt);
      const year  = d.getFullYear().toString();
      const month = `${year}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const day   = `${month}/${String(d.getDate()).padStart(2, "0")}`;

      if (!yearMap.has(year))           yearMap.set(year, new Map());
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(month))         monthMap.set(month, new Map());
      const dayMap = monthMap.get(month)!;
      if (!dayMap.has(day))             dayMap.set(day, []);
      dayMap.get(day)!.push(article);
    }

    return [...yearMap.entries()].map(([year, monthMap]) => {
      const monthGroups = [...monthMap.entries()].map(([month, dayMap]) => {
        const dayGroups = [...dayMap.entries()].map(([day, arts]) => ({
          label: day,
          articles: arts,
          unreadCount: arts.filter(a => a.status === "unread").length,
        }));
        const allArts = [...dayMap.values()].flat();
        return {
          label: month,
          articles: allArts,
          children: dayGroups,
          unreadCount: allArts.filter(a => a.status === "unread").length,
        };
      });
      const allArts = [...monthMap.values()].flatMap(dm => [...dm.values()].flat());
      return {
        label: year,
        articles: allArts,
        children: monthGroups,
        unreadCount: allArts.filter(a => a.status === "unread").length,
      };
    });
  }

  private rowToArticle(row: any): Article {
    return {
      id:          row.id as number,
      guid:        row.guid as string,
      title:       row.title as string,
      url:         row.url as string,
      summary:     (row.summary as string) ?? null,
      source:      row.source as string,
      category:    row.category as string,
      publishedAt: row.published_at as string,
      fetchedAt:   row.fetched_at as string,
      status:      row.status as "read" | "unread",
      imageUrl:    (row.image_url as string) ?? null,
    };
  }
}

export const db = new NewsDatabase();
