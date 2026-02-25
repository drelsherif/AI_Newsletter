import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { normalizeUrl } from "../../../core/utils/normalizeUrl";

export function ButtonBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const text = d.text || "Click Here";
  const href = normalizeUrl(d.href || "");
  const color = d.color || "#4F7FFF";
  const textColor = d.textColor || "#ffffff";
  const align = d.align || "center";

  return (
    <div className="blk-btn-wrap" style={{ textAlign: align as any }}>
      <a
        href={href || "#"}
        target={href ? "_blank" : undefined}
        rel="noreferrer"
        className="blk-btn"
        style={{ background: color, color: textColor }}
      >
        {text}
      </a>
    </div>
  );
}
