import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import iconv from "iconv-lite";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NewsDesktop/0.1";

export interface ExtractedArticle {
  content: string;
  excerpt: string | null;
  byline: string | null;
  siteName: string | null;
}

export async function extractArticle(url: string): Promise<ExtractedArticle | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    const charset = resolveCharset(res.headers.get("content-type"), buf);
    const html = iconv.encodingExists(charset)
      ? iconv.decode(buf, charset)
      : buf.toString("utf8");

    // jsdomの大量警告を抑制
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => {});
    virtualConsole.on("jsdomError", () => {});

    const dom = new JSDOM(html, { url, virtualConsole });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article || !article.textContent) return null;

    return {
      content:  article.textContent.replace(/\n{3,}/g, "\n\n").trim(),
      excerpt:  article.excerpt ?? null,
      byline:   article.byline ?? null,
      siteName: article.siteName ?? null,
    };
  } catch (err) {
    console.error("[extractor]", url, err instanceof Error ? err.message : err);
    return null;
  }
}

function resolveCharset(contentType: string | null, head: Buffer): string {
  const fromHeader = parseCharsetFromContentType(contentType);
  if (fromHeader) return normalizeCharset(fromHeader);

  const sniff = head.subarray(0, Math.min(4096, head.length)).toString("latin1");
  const metaCharset = sniff.match(/<meta[^>]+charset=["']?([a-z0-9_\-]+)/i);
  if (metaCharset) return normalizeCharset(metaCharset[1]);

  const metaHttp = sniff.match(/<meta[^>]+http-equiv=["']?content-type["']?[^>]+charset=([a-z0-9_\-]+)/i);
  if (metaHttp) return normalizeCharset(metaHttp[1]);

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
