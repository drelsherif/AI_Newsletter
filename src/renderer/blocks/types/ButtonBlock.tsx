import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function ButtonBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const text = d.text || "Click Here";
  const href = d.href || "#";
  const color = d.color || "#4F7FFF";
  const textColor = d.textColor || "#ffffff";
  const align = d.align || "center";

  return (
    <div className="blk-button-wrap" style={{ textAlign: align as any }}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="blk-cta-btn"
        style={{ background: color, color: textColor }}
      >
        {text}
      </a>
    </div>
  );
}
