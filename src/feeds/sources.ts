import type { Feed } from "../shared/types";

export const DEFAULT_FEEDS: Omit<Feed, "id" | "lastFetchedAt">[] = [
  // === 日本（総合） ===
  { name: "NHK 主要ニュース",      url: "https://www3.nhk.or.jp/rss/news/cat0.xml",            category: "general",  region: "japan", language: "ja", enabled: true  },
  { name: "NHK 国際ニュース",      url: "https://www3.nhk.or.jp/rss/news/cat6.xml",            category: "general",  region: "japan", language: "ja", enabled: true  },
  { name: "NHK 政治",              url: "https://www3.nhk.or.jp/rss/news/cat4.xml",            category: "general",  region: "japan", language: "ja", enabled: false },
  { name: "NHK 経済",              url: "https://www3.nhk.or.jp/rss/news/cat5.xml",            category: "business", region: "japan", language: "ja", enabled: false },
  { name: "朝日新聞",              url: "https://www.asahi.com/rss/asahi/newsheadlines.rdf",   category: "general",  region: "japan", language: "ja", enabled: true  },
  { name: "毎日新聞 速報",         url: "https://mainichi.jp/rss/etc/mainichi-flash.rss",      category: "general",  region: "japan", language: "ja", enabled: true  },
  { name: "Japan Times (英語)",    url: "https://www.japantimes.co.jp/feed/",                  category: "general",  region: "japan", language: "en", enabled: false },

  // === 国際（総合・英語） ===
  { name: "BBC World",             url: "http://feeds.bbci.co.uk/news/world/rss.xml",          category: "general",  region: "world", language: "en", enabled: true  },
  { name: "Guardian World",        url: "https://www.theguardian.com/world/rss",               category: "general",  region: "world", language: "en", enabled: true  },
  { name: "Al Jazeera",            url: "https://www.aljazeera.com/xml/rss/all.xml",           category: "general",  region: "world", language: "en", enabled: true  },
  { name: "NPR News",              url: "https://feeds.npr.org/1001/rss.xml",                  category: "general",  region: "world", language: "en", enabled: true  },
  { name: "CNN International",     url: "http://rss.cnn.com/rss/edition.rss",                  category: "general",  region: "world", language: "en", enabled: true  },
  { name: "Deutsche Welle",        url: "https://rss.dw.com/rdf/rss-en-all",                   category: "general",  region: "world", language: "en", enabled: true  },
  { name: "France 24",             url: "https://www.france24.com/en/rss",                     category: "general",  region: "world", language: "en", enabled: false },
  { name: "Reuters World (FT)",    url: "https://www.ft.com/world?format=rss",                 category: "general",  region: "world", language: "en", enabled: false },
  { name: "NHK World (英語)",       url: "https://www3.nhk.or.jp/nhkworld/en/news/feeds/",      category: "general",  region: "world", language: "en", enabled: false },
  { name: "Times of India",        url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", category: "general", region: "world", language: "en", enabled: false },

  // === テクノロジー ===
  { name: "TechCrunch",            url: "https://techcrunch.com/feed/",                        category: "tech",     region: "world", language: "en", enabled: true  },
  { name: "The Verge",             url: "https://www.theverge.com/rss/index.xml",              category: "tech",     region: "world", language: "en", enabled: true  },
  { name: "Ars Technica",          url: "https://feeds.arstechnica.com/arstechnica/index",     category: "tech",     region: "world", language: "en", enabled: true  },
  { name: "Wired",                 url: "https://www.wired.com/feed/rss",                      category: "tech",     region: "world", language: "en", enabled: true  },
  { name: "Engadget",              url: "https://www.engadget.com/rss.xml",                    category: "tech",     region: "world", language: "en", enabled: false },
  { name: "Hacker News",           url: "https://hnrss.org/frontpage",                         category: "tech",     region: "world", language: "en", enabled: false },
  { name: "BBC Technology",        url: "http://feeds.bbci.co.uk/news/technology/rss.xml",     category: "tech",     region: "world", language: "en", enabled: false },
  { name: "ITmedia News",          url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",   category: "tech",     region: "japan", language: "ja", enabled: true  },
  { name: "ITmedia エンタープライズ", url: "https://rss.itmedia.co.jp/rss/2.0/enterprise_all.xml", category: "tech", region: "japan", language: "ja", enabled: false },
  { name: "Gizmodo Japan",         url: "https://www.gizmodo.jp/index.xml",                    category: "tech",     region: "japan", language: "ja", enabled: false },

  // === ビジネス / 経済 ===
  { name: "Bloomberg",             url: "https://feeds.bloomberg.com/markets/news.rss",        category: "business", region: "world", language: "en", enabled: true  },
  { name: "BBC Business",          url: "http://feeds.bbci.co.uk/news/business/rss.xml",       category: "business", region: "world", language: "en", enabled: true  },
  { name: "Financial Times",       url: "https://www.ft.com/rss/home",                         category: "business", region: "world", language: "en", enabled: false },
  { name: "Guardian Business",     url: "https://www.theguardian.com/uk/business/rss",         category: "business", region: "world", language: "en", enabled: false },
  { name: "ITmedia ビジネス",       url: "https://rss.itmedia.co.jp/rss/2.0/business_all.xml",  category: "business", region: "japan", language: "ja", enabled: false },

  // === 科学 ===
  { name: "BBC Science",           url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "science", region: "world", language: "en", enabled: true  },
  { name: "Science Daily",         url: "https://www.sciencedaily.com/rss/all.xml",            category: "science",  region: "world", language: "en", enabled: true  },
  { name: "New Scientist",         url: "https://www.newscientist.com/feed/home/",             category: "science",  region: "world", language: "en", enabled: false },
  { name: "Smithsonian Magazine",  url: "https://www.smithsonianmag.com/rss/latest_articles/", category: "science",  region: "world", language: "en", enabled: false },
  { name: "Nature",                url: "https://www.nature.com/nature.rss",                   category: "science",  region: "world", language: "en", enabled: false },
];
