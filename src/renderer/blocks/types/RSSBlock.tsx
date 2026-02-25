import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { useIssue } from "../../../shared/IssueContext";
import { normalizeUrl } from "../../../core/utils/normalizeUrl";

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso.slice(0, 10); }
}

export function RSSBlock({ block, mode }: { block: Block; mode: RenderMode }) {
  const issue = useIssue();
  const d = block.data as any;
  const feedIds: string[] = Array.isArray(d.feedIds) ? d.feedIds : [];
  const maxArticles: number = Number(d.maxArticles) || 10;
  const layout: string = d.layout || "list";

  const allArticles = issue.feeds
    .filter((f) => feedIds.length === 0 || feedIds.includes(f.id))
    .flatMap((f) => f.articles)
    .slice(0, maxArticles);

  if (allArticles.length === 0) {
    return (
      <div className="blk blk-rss blk-rss-empty">
        {mode === "edit" ? (
          <>
            <div className="blk-rss-empty-icon">📡</div>
            <div className="blk-rss-empty-title">RSS Feed Block</div>
            <div className="blk-rss-empty-hint">
              {feedIds.length === 0
                ? "Open the Feeds tab → add a feed → click Fetch."
                : "No articles yet — click Fetch in the Feeds tab."}
            </div>
          </>
        ) : (
          <div className="blk-rss-empty-hint">Feed articles will appear here.</div>
        )}
      </div>
    );
  }

  return (
    <div className={`blk blk-rss blk-rss-${layout}`}>
      {allArticles.map((article, i) => {
        const href = normalizeUrl(article.href || "");
        return (
          <div key={i} className="rss-article">
            <div className="rss-article-meta">
              <span className="rss-source">{article.source}</span>
              {article.pubDate && (
                <span className="rss-date">{formatDate(article.pubDate)}</span>
              )}
            </div>
            <div className="rss-article-title">
              {href ? (
                <a href={href} target="_blank" rel="noreferrer">{article.title}</a>
              ) : (
                <span>{article.title}</span>
              )}
            </div>
            {article.summary && layout !== "compact" && (
              <div className="rss-article-summary">{article.summary}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
