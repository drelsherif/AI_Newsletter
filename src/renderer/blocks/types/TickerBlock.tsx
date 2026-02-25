import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function TickerBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  let items: string[] = [];
  if (Array.isArray(d.items)) {
    items = d.items.map(String);
  } else if (typeof d.items === "string") {
    items = d.items.split("•").map((x: string) => x.trim()).filter(Boolean);
  }
  return (
    <div className="blk blk-ticker">
      {items.map((x, i) => (
        <span key={i} className="blk-ticker-item">{x}</span>
      ))}
    </div>
  );
}
