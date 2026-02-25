import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { RichTextView } from "../../../core/richtext/toReact";
import type { RichText } from "../../../core/richtext/zod";

export function ArticleBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const summary: RichText = Array.isArray(d.summary) ? d.summary : [];
  const linkText = d.linkText || "Read more →";

  return (
    <div className="blk blk-article">
      {d.source ? <div className="article-src">{String(d.source)}</div> : null}
      <div className="article-title">
        {d.href
          ? <a href={String(d.href)} target="_blank" rel="noreferrer">{String(d.title ?? "Untitled")}</a>
          : <span>{String(d.title ?? "Untitled")}</span>
        }
      </div>
      {summary.length ? (
        <div className="article-sum"><RichTextView value={summary} /></div>
      ) : null}
      {d.href ? (
        <a href={String(d.href)} target="_blank" rel="noreferrer" className="article-link">
          {linkText}
        </a>
      ) : null}
    </div>
  );
}
