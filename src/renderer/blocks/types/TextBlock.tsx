import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { RichTextView } from "../../../core/richtext/toReact";
import type { RichText } from "../../../core/richtext/zod";
import type { LinkSchema } from "../../../core/issue/schema";
import { z } from "zod";

type Link = z.infer<typeof import("../../../core/issue/schema").LinkSchema>;

export function TextBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const body: RichText = Array.isArray(d.body) ? d.body : [];
  const links: Link[] = Array.isArray(d.links) ? d.links : [];

  return (
    <div className="blk blk-text">
      {d.heading ? <h3 className="blk-h">{String(d.heading)}</h3> : null}
      {body.length ? <RichTextView value={body} /> : null}
      {links.length > 0 && (
        <div className="blk-links">
          {links.map((l, i) => (
            <a key={i} href={l.href} target="_blank" rel="noreferrer" className="blk-link">
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
