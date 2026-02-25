import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { useIssueAsset } from "../../../shared/useIssueAsset";
import { RichTextView } from "../../../core/richtext/toReact";
import type { RichText } from "../../../core/richtext/zod";
import { normalizeUrl } from "../../../core/utils/normalizeUrl";

export function ImageBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const asset = useIssueAsset(String(d.assetId ?? ""));
  const caption: RichText = Array.isArray(d.caption) ? d.caption : [];
  const src = d.src || asset?.src;
  const alt = d.alt || asset?.alt || "";
  const href = normalizeUrl(d.href || "");

  if (!src) {
    return (
      <div className="blk-warn">
        No image source. Upload an image or enter a URL in the Inspector.
      </div>
    );
  }

  const img = <img className="img" src={src} alt={alt} loading="lazy" />;

  return (
    <div className="blk">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" style={{ display: "block" }}>
          {img}
        </a>
      ) : img}
      {caption.length > 0 && (
        <div className="img-cap"><RichTextView value={caption} /></div>
      )}
    </div>
  );
}
