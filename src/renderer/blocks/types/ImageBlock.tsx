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
  if (!asset) return <div className="blk blk-warn">Image asset not found: {String(d.assetId ?? "")}</div>;
  return (
    <div className="blk">
      <img className="img" src={asset.src} alt={asset.alt ?? ""} />
      {caption.length ? <div className="img-cap"><RichTextView value={caption} /></div> : null}
    </div>
  );
}
