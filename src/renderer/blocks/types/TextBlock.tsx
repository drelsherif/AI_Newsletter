import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { RichTextView } from "../../../core/richtext/toReact";
import type { RichText } from "../../../core/richtext/zod";

export function TextBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const body: RichText = Array.isArray(d.body) ? d.body : [];
  return (
    <div className="blk">
      {d.heading ? <h3 className="blk-h">{String(d.heading)}</h3> : null}
      {body.length ? <RichTextView value={body} /> : null}
    </div>
  );
}
