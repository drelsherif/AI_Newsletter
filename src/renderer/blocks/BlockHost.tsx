import React from "react";
import type { Block } from "../../core/issue/schema";
import type { RenderMode } from "../modes";
import { blockRegistry } from "./registry";

export function BlockHost({ block, mode }: { block: Block; mode: RenderMode }) {
  const def = blockRegistry[block.type];
  if (!def) return <div className="blk">Unknown block type: {block.type}</div>;
  if (mode === "email" && !def.emailSafe) {
    return <div className="blk blk-warn">This block type (“{def.title}”) is not email-safe. Consider replacing for email export.</div>;
  }
  return <def.Render block={block} mode={mode} />;
}
