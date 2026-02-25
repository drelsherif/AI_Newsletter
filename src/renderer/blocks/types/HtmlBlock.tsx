import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function HtmlBlock({ block, mode }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const html = d.html || "";
  const label = d.label || "";

  if (!html.trim()) {
    return (
      <div className="blk blk-html blk-html-empty">
        <span>HTML block is empty. Edit in the Inspector panel.</span>
      </div>
    );
  }

  return (
    <div className="blk blk-html">
      {label && mode === "edit" && (
        <div className="blk-html-label">{label}</div>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
