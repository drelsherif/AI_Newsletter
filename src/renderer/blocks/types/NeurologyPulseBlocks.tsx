import React from "react";
import type { Block } from "../../../core/issue/schema";
import type { RenderMode } from "../../modes";
import { RichTextView } from "../../../core/richtext/toReact";

export function GovernanceBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  return (
    <div className="blk blk-governance">
      <div className="gov-top">
        <div className="gov-badge">{d.badge || "Governance / Legal"}</div>
        <div className="gov-title">{d.title || "Regulatory / Governance"}</div>
      </div>
      {Array.isArray(d.body) ? <RichTextView value={d.body} /> : null}
    </div>
  );
}

export function SbarpBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const Row = ({ label, value }: any) => (
    <div className="sbar-row">
      <div className="sbar-label">{label}</div>
      {Array.isArray(value) ? <RichTextView value={value} /> : null}
    </div>
  );
  return (
    <div className="blk blk-sbarp">
      <div className="sbar-title">{d.title || "SBAR-P"}</div>
      <Row label="Situation" value={d.situation} />
      <Row label="Background" value={d.background} />
      <Row label="Assessment" value={d.assessment} />
      <Row label="Recommendation" value={d.recommendation} />
      <Row label="Prompt" value={d.prompt} />
    </div>
  );
}

export function PromptBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  const Section = ({ label, value }: any) => (
    <div className="prm-sec">
      <div className="prm-label">{label}</div>
      {Array.isArray(value) ? <RichTextView value={value} /> : null}
    </div>
  );
  return (
    <div className="blk blk-prompt">
      <div className="prm-title">{d.title || "Prompt like a Rockstar"}</div>
      <Section label="Template" value={d.template} />
      <div className="prm-grid">
        <Section label="Good Prompt" value={d.good} />
        <Section label="Bad Prompt" value={d.bad} />
      </div>
      <Section label="Tips" value={d.tips} />
    </div>
  );
}

export function TermBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  return (
    <div className="blk blk-term">
      <div className="term-top">
        <div className="term-badge">AI Term</div>
        <div className="term-title">{d.term || "Term of the Month"}</div>
      </div>
      {Array.isArray(d.definition) ? <div className="term-row"><div className="term-label">Definition</div><RichTextView value={d.definition} /></div> : null}
      {Array.isArray(d.why) ? <div className="term-row"><div className="term-label">Why it matters</div><RichTextView value={d.why} /></div> : null}
    </div>
  );
}

export function HistoryBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  return (
    <div className="blk blk-history">
      <div className="hx-title">{d.title || "AI History"}</div>
      {Array.isArray(d.body) ? <RichTextView value={d.body} /> : null}
    </div>
  );
}

export function HumorBlock({ block }: { block: Block; mode: RenderMode }) {
  const d = block.data as any;
  return (
    <div className="blk blk-humor">
      <div className="hm-title">{d.title || "AI Humor"}</div>
      {Array.isArray(d.body) ? <RichTextView value={d.body} /> : null}
    </div>
  );
}
