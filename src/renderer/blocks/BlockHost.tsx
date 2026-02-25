import React from "react";
import type { Block } from "../../core/issue/schema";
import type { RenderMode } from "../modes";
import { blockRegistry } from "./registry";

export function BlockHost({ block, mode }: { block: Block; mode: RenderMode }) {
  const def = blockRegistry[block.type as Block["type"]];
  if (!def) {
    return (
      <div className="blk-warn">Unknown block type: {block.type}</div>
    );
  }
  return <def.Render block={block} mode={mode} />;
}
