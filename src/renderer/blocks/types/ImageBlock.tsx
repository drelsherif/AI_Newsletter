import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { useIssueAsset } from "../../../shared/useIssueAsset";
import { RichTextView } from "../../../core/richtext/toReact";
import type { RichText } from "../../../core/richtext/zod";

export function ImageBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const asset = useIssueAsset(String(d.assetId ?? ""));
  const caption: RichText = Array.isArray(d.caption) ? d.caption : [];

  // Support direct src URL in addition to asset system
  const src = d.src || asset?.src;
  const alt = d.alt || asset?.alt || "";

  if (!src) {
    return (
      <div className="blk-warn">
        No image source. Add an asset ID or direct URL in the Inspector.
      </div>
    );
  }

  return (
    <div className="blk">
      <img className="img" src={src} alt={alt} loading="lazy" />
      {caption.length > 0 && (
        <div className="img-cap"><RichTextView value={caption} /></div>
      )}
    </div>
  );
}
