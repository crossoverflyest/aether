import type { Feed } from "../shared/types";

export const DEFAULT_FEEDS: Omit<Feed, "id" | "lastFetchedAt">[] = [
  // === 日本 ===
  { name: "NHK 主要ニュース", url: "https://www3.nhk.or.jp/rss/news/cat0.xml",      category: "general",  region: "japan",  language: "ja", enabled: true },
  { name: "朝日新聞",         url: "https://www.asahi.com/rss/asahi/newsheadlines.rdf", category: "general", region: "japan",  language: "ja", enabled: true },
  { name: "読売新聞",         url: "https://www.yomiuri.co.jp/rss/index.xml",           category: "general", region: "japan",  language: "ja", enabled: true },

  // === 国際 (英語) ===
  { name: "BBC World",       url: "http://feeds.bbci.co.uk/news/world/rss.xml",      category: "general",  region: "world",  language: "en", enabled: true },
  { name: "Reuters Top",     url: "https://feeds.reuters.com/reuters/topNews.rss",    category: "general",  region: "world",  language: "en", enabled: false },
  { name: "Guardian World",  url: "https://www.theguardian.com/world/rss",            category: "general",  region: "world",  language: "en", enabled: true },
  { name: "Al Jazeera",      url: "https://www.aljazeera.com/xml/rss/all.xml",       category: "general",  region: "world",  language: "en", enabled: true },

  // === テクノロジー ===
  { name: "TechCrunch",      url: "https://techcrunch.com/feed/",                    category: "tech",     region: "world",  language: "en", enabled: true },
  { name: "The Verge",       url: "https://www.theverge.com/rss/index.xml",          category: "tech",     region: "world",  language: "en", enabled: true },
  { name: "ITmedia News",    url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml", category: "tech",   region: "japan",  language: "ja", enabled: true },

  // === ビジネス / 経済 ===
  { name: "日本経済新聞",     url: "https://www.nikkei.com/rss/",                    category: "business", region: "japan",  language: "ja", enabled: false },
  { name: "Bloomberg",       url: "https://feeds.bloomberg.com/markets/news.rss",    category: "business", region: "world",  language: "en", enabled: true },

  // === 科学 ===
  { name: "Nature",          url: "https://www.nature.com/nature.rss",               category: "science",  region: "world",  language: "en", enabled: false },
];
