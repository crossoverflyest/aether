import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";

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
    const html = await res.text();

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
