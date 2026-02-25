import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function DividerBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const style = d.style || "line";

  if (style === "space") {
    return <div className="blk-spacer" style={{ height: d.height ? `${d.height}px` : "24px" }} />;
  }
  if (style === "dots") {
    return (
      <div className="blk-divider blk-divider-dots">
        <span>·</span><span>·</span><span>·</span>
      </div>
    );
  }
  return <hr className="blk-divider blk-divider-line" />;
}
