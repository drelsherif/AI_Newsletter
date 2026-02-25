import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function TickerBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const items: string[] = Array.isArray(d.items) ? d.items.map(String) : [];
  return (
    <div className="blk ticker">
      <div className="ticker-row">
        <span className="pill">Ticker</span>
        <div className="ticker-items">
          {items.map((x, i) => (
            <span key={i} className="ticker-item">{x}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
