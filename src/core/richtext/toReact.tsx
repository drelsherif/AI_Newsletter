import React from "react";
import type { RichText } from "./zod";

function Inline({ node }: { node: any }) {
  switch (node.t) {
    case "txt": return <>{node.v}</>;
    case "code": return <code className="rt-code">{node.v}</code>;
    case "b": return <strong>{node.c?.map((n: any, i: number) => <Inline key={i} node={n} />)}</strong>;
    case "i": return <em>{node.c?.map((n: any, i: number) => <Inline key={i} node={n} />)}</em>;
    case "a": return <a href={node.href} target="_blank" rel="noreferrer">{node.c?.map((n: any, i: number) => <Inline key={i} node={n} />)}</a>;
    default: return null;
  }
}

function Block({ node }: { node: any }) {
  switch (node.t) {
    case "p": return <p className="rt-p">{node.c?.map((n: any, i: number) => <Inline key={i} node={n} />)}</p>;
    case "h": {
      const L = node.l === 2 ? "h2" : node.l === 3 ? "h3" : "h4";
      const Tag: any = L;
      return <Tag className={`rt-h rt-h${node.l}`}>{node.c?.map((n: any, i: number) => <Inline key={i} node={n} />)}</Tag>;
    }
    case "ul": return <ul className="rt-ul">{node.items?.map((x: any, i: number) => <li key={i}><Block node={x} /></li>)}</ul>;
    case "ol": return <ol className="rt-ol">{node.items?.map((x: any, i: number) => <li key={i}><Block node={x} /></li>)}</ol>;
    case "quote": return <blockquote className="rt-q">{node.c?.map((x: any, i: number) => <Block key={i} node={x} />)}</blockquote>;
    default: return null;
  }
}

export function RichTextView({ value }: { value: RichText }) {
  return <div className="rt">{value.map((n: any, i: number) => <Block key={i} node={n} />)}</div>;
}
