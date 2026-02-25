import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function TickerBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  // Support both array format (old) and string format (new, bullet-separated)
  let items: string[] = [];
  if (Array.isArray(d.items)) {
    items = d.items.map(String);
  } else if (typeof d.items === "string") {
    items = d.items.split("•").map((x: string) => x.trim()).filter(Boolean);
  }

  return (
    <div className="blk blk-ticker">
      <div className="ticker-inner">
        {items.map((x, i) => (
          <span key={i} className="ticker-pill">{x}</span>
        ))}
      </div>
    </div>
  );
}
