-- ニュース記事テーブル
CREATE TABLE IF NOT EXISTS articles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  guid        TEXT    NOT NULL UNIQUE,
  title       TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  summary     TEXT,
  source      TEXT    NOT NULL,
  category    TEXT    NOT NULL DEFAULT 'general',
  published_at TEXT   NOT NULL,
  fetched_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  status      TEXT    NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  image_url   TEXT
);

-- フィード設定テーブル
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

-- 記事翻訳テーブル
CREATE TABLE IF NOT EXISTS article_translations (
  article_id      INTEGER PRIMARY KEY,
  translated_title TEXT,
  translated_content TEXT,
  translated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- クリップ（フォルダ）テーブル
CREATE TABLE IF NOT EXISTS clips (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 記事とクリップの関連テーブル（多対多）
CREATE TABLE IF NOT EXISTS article_clips (
  article_id  INTEGER NOT NULL,
  clip_id     INTEGER NOT NULL,
  clipped_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(article_id, clip_id),
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY(clip_id)    REFERENCES clips(id)    ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_article_clips_article ON article_clips(article_id);
CREATE INDEX IF NOT EXISTS idx_article_clips_clip    ON article_clips(clip_id);

-- 検索高速化インデックス
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status        ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category      ON articles(category);
