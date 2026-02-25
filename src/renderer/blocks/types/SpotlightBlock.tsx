import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { RichTextView } from "../../../core/richtext/toReact";
import { normalizeUrl } from "../../../core/utils/normalizeUrl";

export function SpotlightBlock({ block, mode }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const href = normalizeUrl(d.href ?? "");
  const badge = (d.badge as string) || "Spotlight";
  const title = (d.title as string) || "";
  const source = (d.source as string) || "";
  const kicker = (d.kicker as string) || "";
  const hasImg = typeof d.imageSrc === "string" && d.imageSrc.trim().length > 0;

  const header = (
    <div className="spot-hd">
      <div className="spot-badge">{badge}</div>
      {kicker ? <div className="spot-kicker">{kicker}</div> : null}
      {href ? (
        <a className="spot-title" href={href} target="_blank" rel="noreferrer">{title || "Featured article"}</a>
      ) : (
        <div className="spot-title">{title || "Featured article"}</div>
      )}
      {source ? <div className="spot-src">{source}</div> : null}
    </div>
  );

  const body = (
    <>
      {Array.isArray(d.takeaways) ? (
        <div className="spot-row">
          <div className="spot-label">Why it matters</div>
          <RichTextView value={d.takeaways} />
        </div>
      ) : null}

      {Array.isArray(d.myView) ? (
        <div className="spot-row">
          <div className="spot-label">My take</div>
          <RichTextView value={d.myView} />
        </div>
      ) : null}

      {href ? (
        <div className="spot-cta">
          <a className="spot-link" href={href} target="_blank" rel="noreferrer">{(d.linkText as string) || "Read full article →"}</a>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="blk blk-spotlight">
      {header}
      {hasImg ? (
        <a className="spot-imgwrap" href={href || undefined} target={href ? "_blank" : undefined} rel={href ? "noreferrer" : undefined}>
          <img className="spot-img" src={d.imageSrc} alt={d.imageAlt || ""} />
        </a>
      ) : null}
      <div className="spot-body">{body}</div>
      {mode === "email" ? <div className="spot-emailhint"> </div> : null}
    </div>
  );
}
