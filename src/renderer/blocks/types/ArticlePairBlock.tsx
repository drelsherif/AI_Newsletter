import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { RichTextView } from "../../../core/richtext/toReact";
import { normalizeUrl } from "../../../core/utils/normalizeUrl";

function Card({ a }: { a: any }) {
  const href = normalizeUrl(a?.href ?? "");
  return (
    <div className="pair-card">
      {href ? (
        <a className="pair-title" href={href} target="_blank" rel="noreferrer">{a?.title || "Article"}</a>
      ) : (
        <div className="pair-title">{a?.title || "Article"}</div>
      )}
      {a?.source ? <div className="pair-src">{a.source}</div> : null}
      {Array.isArray(a?.summary) ? <RichTextView value={a.summary} /> : null}
      {href ? <a className="pair-link" href={href} target="_blank" rel="noreferrer">{a?.linkText || "Read more →"}</a> : null}
    </div>
  );
}

export function ArticlePairBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  return (
    <div className="blk blk-articlepair">
      <div className="pair-grid">
        <Card a={d.left} />
        <Card a={d.right} />
      </div>
    </div>
  );
}
