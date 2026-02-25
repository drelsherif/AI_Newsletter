import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { normalizeUrl } from "../../../core/utils/normalizeUrl";

export function LinkListBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const title = (d.title as string) || "";
  const items: any[] = Array.isArray(d.items) ? d.items : [];
  return (
    <div className="blk blk-linklist">
      {title ? <div className="ll-title">{title}</div> : null}
      <div className="ll-list">
        {items.map((it, i) => {
          const href = normalizeUrl(it.href ?? "");
          return (
            <div key={i} className="ll-item">
              {href ? <a href={href} target="_blank" rel="noreferrer">{it.label || href}</a> : <span>{it.label || ""}</span>}
              {it.meta ? <span className="ll-meta">{it.meta}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
