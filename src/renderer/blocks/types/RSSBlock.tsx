import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";

export function RSSBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  return (
    <div className="blk">
      <div className="blk-warn">
        RSS is scaffolded. vNext will support live vs frozen snapshots and provenance.
      </div>
      <div className="blk-p">Feed: {String(d.url ?? "(not set)")}</div>
    </div>
  );
}
