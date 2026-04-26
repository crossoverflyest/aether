import Parser from "rss-parser";
import { db } from "../db/database";
import type { Article } from "../shared/types";

interface CustomItem {
  contentEncoded?: string;
  mediaThumbnail?: { $?: { url?: string } } | { $?: { url?: string } }[];
  mediaContent?:   { $?: { url?: string } } | { $?: { url?: string } }[];
  description?: string;
}

const parser: Parser<{}, CustomItem> = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "NewsDesktop/0.1" },
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content",   "mediaContent"],
      ["description",     "description"],
    ],
  },
});

export async function fetchAllFeeds(): Promise<void> {
  const feeds = db.getEnabledFeeds();
  const now = new Date().toISOString();

  const results = await Promise.allSettled(
    feeds.map(feed => fetchFeed(feed.id, feed.url, feed.name, feed.category, now))
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[fetcher] ${feeds[i].name} failed:`, r.reason instanceof Error ? r.reason.message : r.reason);
    }
  });
}

async function fetchFeed(
  feedId: number,
  url: string,
  sourceName: string,
  category: string,
  fetchedAt: string
): Promise<void> {
  const feed = await parser.parseURL(url);

  const articles: Omit<Article, "id">[] = (feed.items ?? [])
    .filter(item => item.title && item.link)
    .map(item => ({
      guid:        item.guid ?? item.link!,
      title:       item.title!.trim(),
      url:         item.link!,
      summary:     extractSummary(item),
      source:      sourceName,
      category,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : fetchedAt,
      fetchedAt,
      status:      "unread" as const,
      imageUrl:    extractImage(item),
    }));

  if (articles.length > 0) db.insertArticles(articles);
  db.upsertFeedFetched(feedId, fetchedAt);
}

function extractSummary(item: any): string | null {
  const candidates = [
    item.contentEncoded,
    item.content,
    item.description,
    item.contentSnippet,
    item.summary,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) {
      const cleaned = stripHtml(c);
      if (cleaned.length >= 20) return cleaned;
    }
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

function extractImage(item: any): string | null {
  const mt = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail[0] : item.mediaThumbnail;
  const mc = Array.isArray(item.mediaContent)   ? item.mediaContent[0]   : item.mediaContent;
  return mt?.$?.url
      ?? mc?.$?.url
      ?? item.enclosure?.url
      ?? extractFirstImg(item.contentEncoded ?? item.content ?? item.description ?? "")
      ?? null;
}

function extractFirstImg(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}
