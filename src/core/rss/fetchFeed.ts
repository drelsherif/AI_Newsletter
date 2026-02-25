import type { RssFeedArticle, RssFeedResult } from "./types";

const CORS_PROXIES: Array<(url: string) => string> = [
  (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
];

const FETCH_TIMEOUT_MS = 7000;

function getText(el: Element | null, tag: string): string {
  if (!el) return "";
  const found = el.querySelector(tag);
  return found?.textContent?.trim() ?? "";
}

function getAttr(el: Element | null, tag: string, attr: string): string {
  if (!el) return "";
  const found = el.querySelector(tag);
  return found?.getAttribute(attr)?.trim() ?? "";
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent?.trim() ?? "";
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, "") + "…" : s;
}

function parseXml(xmlStr: string): Document {
  return new DOMParser().parseFromString(xmlStr, "application/xml");
}

function extractRawXml(proxyResponse: string, proxyUrl: string): string {
  // allorigins wraps in { contents: "..." }
  if (proxyUrl.includes("allorigins.win")) {
    try {
      const json = JSON.parse(proxyResponse);
      return json.contents ?? proxyResponse;
    } catch {
      return proxyResponse;
    }
  }
  return proxyResponse;
}

function parseArticles(doc: Document, feedName: string, max: number): RssFeedArticle[] {
  const articles: RssFeedArticle[] = [];

  // RSS 2.0
  const rssItems = Array.from(doc.querySelectorAll("channel > item"));
  if (rssItems.length > 0) {
    for (const item of rssItems.slice(0, max)) {
      const title = stripHtml(getText(item, "title"));
      const link =
        getText(item, "link") ||
        getAttr(item, "link", "href") ||
        getText(item, "guid");
      const pubDate = getText(item, "pubDate") || getText(item, "dc\\:date") || "";
      const rawDesc =
        getText(item, "description") ||
        getText(item, "content\\:encoded") ||
        "";
      const summary = truncate(stripHtml(rawDesc), 280);
      if (title) {
        articles.push({ title, href: link, source: feedName, pubDate, summary });
      }
    }
    return articles;
  }

  // Atom 1.0
  const atomEntries = Array.from(doc.querySelectorAll("entry"));
  for (const entry of atomEntries.slice(0, max)) {
    const title = stripHtml(getText(entry, "title"));
    const link =
      getAttr(entry, "link[rel='alternate']", "href") ||
      getAttr(entry, "link", "href") ||
      getText(entry, "id");
    const pubDate = getText(entry, "published") || getText(entry, "updated") || "";
    const rawDesc = getText(entry, "summary") || getText(entry, "content") || "";
    const summary = truncate(stripHtml(rawDesc), 280);
    if (title) {
      articles.push({ title, href: link, source: feedName, pubDate, summary });
    }
  }
  return articles;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function fetchFeed(
  feedUrl: string,
  feedName: string,
  feedId: string,
  maxArticles: number
): Promise<RssFeedResult> {
  let lastError = "All proxies failed";

  for (const makeProxy of CORS_PROXIES) {
    const proxyUrl = makeProxy(feedUrl);
    try {
      const res = await fetchWithTimeout(proxyUrl, FETCH_TIMEOUT_MS);
      if (!res.ok) continue;
      const raw = await res.text();
      const xmlStr = extractRawXml(raw, proxyUrl);
      const doc = parseXml(xmlStr);

      // Check for parse errors
      if (doc.querySelector("parsererror")) {
        lastError = "XML parse error";
        continue;
      }

      const articles = parseArticles(doc, feedName, maxArticles);
      if (articles.length === 0) {
        lastError = "No articles found in feed";
        continue;
      }

      return {
        feedId,
        feedName,
        articles,
        fetchedAt: new Date().toISOString(),
      };
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    feedId,
    feedName,
    articles: [],
    fetchedAt: new Date().toISOString(),
    error: lastError,
  };
}

export async function fetchAllFeeds(
  feeds: Array<{ id: string; url: string; name: string; maxArticles: number }>,
  onProgress?: (done: number, total: number) => void
): Promise<RssFeedResult[]> {
  let done = 0;
  const results = await Promise.allSettled(
    feeds.map(async (f) => {
      const result = await fetchFeed(f.url, f.name, f.id, f.maxArticles);
      done++;
      onProgress?.(done, feeds.length);
      return result;
    })
  );
  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { feedId: "", feedName: "", articles: [], fetchedAt: new Date().toISOString(), error: "Promise rejected" }
  );
}
