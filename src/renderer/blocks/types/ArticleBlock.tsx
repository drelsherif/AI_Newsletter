import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { RichTextView } from "../../../core/richtext/toReact";
import type { RichText } from "../../../core/richtext/zod";
import { normalizeUrl } from "../../../core/utils/normalizeUrl";

export function ArticleBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const summary: RichText = Array.isArray(d.summary) ? d.summary : [];
  const linkText = d.linkText || "Read more →";
  const href = normalizeUrl(d.href || "");

  return (
    <div className="blk blk-article">
      {d.source ? <div className="blk-article-source">{String(d.source)}</div> : null}
      <div className="blk-article-title">
        {href
          ? <a href={href} target="_blank" rel="noreferrer">{String(d.title ?? "Untitled")}</a>
          : <span>{String(d.title ?? "Untitled")}</span>
        }
      </div>
      {summary.length ? (
        <div className="blk-article-summary"><RichTextView value={summary} /></div>
      ) : null}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="blk-article-link">
          {linkText}
        </a>
      ) : null}
    </div>
  );
}
