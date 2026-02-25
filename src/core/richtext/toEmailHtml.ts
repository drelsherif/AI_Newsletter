import type { RichText } from "./zod";

function esc(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function inline(node: any): string {
  switch (node.t) {
    case "txt": return esc(String(node.v ?? ""));
    case "code": return `<code>${esc(String(node.v ?? ""))}</code>`;
    case "b": return `<strong>${(node.c ?? []).map(inline).join("")}</strong>`;
    case "i": return `<em>${(node.c ?? []).map(inline).join("")}</em>`;
    case "a": return `<a href="${esc(String(node.href ?? ""))}">${(node.c ?? []).map(inline).join("")}</a>`;
    default: return "";
  }
}

function block(node: any): string {
  switch (node.t) {
    case "p": return `<p style="margin:8px 0;line-height:1.45">${(node.c ?? []).map(inline).join("")}</p>`;
    case "h": {
      const size = node.l === 2 ? 18 : node.l === 3 ? 16 : 14;
      return `<div style="font-weight:700;font-size:${size}px;margin:12px 0 6px">${(node.c ?? []).map(inline).join("")}</div>`;
    }
    case "ul": return `<ul style="margin:8px 0 8px 18px;padding:0">${(node.items ?? []).map((x:any)=>`<li>${block(x)}</li>`).join("")}</ul>`;
    case "ol": return `<ol style="margin:8px 0 8px 18px;padding:0">${(node.items ?? []).map((x:any)=>`<li>${block(x)}</li>`).join("")}</ol>`;
    case "quote": return `<blockquote style="margin:10px 0;padding:10px 12px;border-left:3px solid #ddd;background:#fafafa">${(node.c ?? []).map(block).join("")}</blockquote>`;
    default: return "";
  }
}

export function richTextToEmailHtml(rt: RichText): string {
  return rt.map(block).join("");
}
