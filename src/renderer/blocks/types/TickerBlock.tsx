import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

function speedToSeconds(speed: string | undefined): number {
  switch (String(speed || "medium")) {
    case "slow": return 40;
    case "fast": return 18;
    default: return 28; // medium
  }
}

export function TickerBlock({ block, mode }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  let items: string[] = [];
  if (Array.isArray(d.items)) {
    items = d.items.map(String);
  } else if (typeof d.items === "string") {
    items = d.items.split("•").map((x: string) => x.trim()).filter(Boolean);
  }

  const scroll = (d.scroll ?? true) as boolean;
  const speed = (d.speed as string) || "medium";
  const duration = speedToSeconds(speed);

  // Email clients generally ignore/strip animations; render a static pill list in email mode.
  if (mode === "email" || !scroll) {
    return (
      <div className="blk blk-ticker">
        {items.map((x, i) => (
          <span key={i} className="blk-ticker-item">{x}</span>
        ))}
      </div>
    );
  }

  // Seamless loop: duplicate content.
  const dup = [...items, ...items];

  return (
    <div className="blk blk-ticker blk-ticker-marquee" data-speed={speed}>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ ["--tickerDur" as any]: `${duration}s` }}>
          {dup.map((x, i) => (
            <span key={i} className="blk-ticker-item blk-ticker-item-marquee">{x}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
