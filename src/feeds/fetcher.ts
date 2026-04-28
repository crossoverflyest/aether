import Parser from "rss-parser";
import iconv from "iconv-lite";
import { db } from "../db/database";
import type { Article } from "../shared/types";

interface CustomItem {
  contentEncoded?: string;
  mediaThumbnail?: { $?: { url?: string } } | { $?: { url?: string } }[];
  mediaContent?:   { $?: { url?: string } } | { $?: { url?: string } }[];
  description?: string;
}

const parser: Parser<{}, CustomItem> = new Parser({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content",   "mediaContent"],
      ["description",     "description"],
    ],
  },
});

const FETCH_TIMEOUT_MS = 10_000;

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
  const xml = await fetchAndDecode(url);
  const feed = await parser.parseString(xml);

  const articles: Omit<Article, "id">[] = (feed.items ?? [])
    .filter(item => item.title && item.link)
    .map(item => ({
      guid:        item.guid ?? item.link!,
      title:       decodeHtmlEntities(item.title!.trim()),
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

async function fetchAndDecode(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "NewsDesktop/0.1" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const charset = resolveCharset(res.headers.get("content-type"), buf);

  if (iconv.encodingExists(charset)) {
    return iconv.decode(buf, charset);
  }
  return buf.toString("utf8");
}

function resolveCharset(contentType: string | null, head: Buffer): string {
  const fromHeader = parseCharsetFromContentType(contentType);
  if (fromHeader) return normalizeCharset(fromHeader);

  const sniff = head.subarray(0, Math.min(2048, head.length)).toString("latin1");
  const xmlMatch = sniff.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
  if (xmlMatch) return normalizeCharset(xmlMatch[1]);

  const metaMatch = sniff.match(/<meta[^>]+charset=["']?([a-z0-9_\-]+)/i);
  if (metaMatch) return normalizeCharset(metaMatch[1]);

  return "utf-8";
}

function parseCharsetFromContentType(ct: string | null): string | null {
  if (!ct) return null;
  const m = ct.match(/charset=([^;\s]+)/i);
  return m ? m[1].trim() : null;
}

function normalizeCharset(raw: string): string {
  const lower = raw.toLowerCase().trim().replace(/^["']|["']$/g, "");
  if (lower === "shift-jis" || lower === "x-sjis" || lower === "ms_kanji") return "shift_jis";
  if (lower === "euc_jp") return "euc-jp";
  return lower;
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
  const withoutTags = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutTags)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", minus: "-",
  copy: "©", reg: "®", trade: "™",
  laquo: "«", raquo: "»",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  middot: "·", bull: "•", deg: "°",
  yen: "¥", pound: "£", euro: "€", cent: "¢",
  times: "×", divide: "÷",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë",
  egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
  Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï",
  igrave: "ì", iacute: "í", icirc: "î", iuml: "ï",
  Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö",
  ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö",
  Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü",
  ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü",
  Ntilde: "Ñ", ntilde: "ñ", szlig: "ß",
  ccedil: "ç", Ccedil: "Ç",
  iexcl: "¡", iquest: "¿",
};

function decodeHtmlEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => safeFromCodePoint(Number(n)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) =>
      NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? m
    );
}

function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10FFFF) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
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
