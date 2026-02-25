import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function SpacerBlock({ block, mode }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const height = Math.max(8, Math.min(120, Number(d.height) || 24));
  return (
    <div
      className={mode === "edit" ? "blk-spacer-edit" : "blk-spacer"}
      style={{ height: `${height}px` }}
    >
      {mode === "edit" && <span className="blk-spacer-label">Spacer — {height}px</span>}
    </div>
  );
}
