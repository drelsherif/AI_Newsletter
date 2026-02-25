import type { Inline, BlockNode, RichText } from "./types";

/**
 * Minimal, export-safe markdown-ish parser.
 * Features:
 *  - Headings: ##, ###, ####
 *  - Unordered list: "- item"
 *  - Ordered list: "1. item"
 *  - Paragraphs separated by blank lines
 *  - Inline: **bold**, *italic*, `code`, [label](url)
 */

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;

  const pushTxt = (v: string) => { if (v) out.push({ t: "txt", v }); };

  while (i < text.length) {
    // code `...`
    if (text[i] === "`") {
      const j = text.indexOf("`", i + 1);
      if (j !== -1) {
        out.push({ t: "code", v: text.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }

    // link [label](url)
    if (text[i] === "[") {
      const close = text.indexOf("]", i + 1);
      const openP = close !== -1 ? text.indexOf("(", close + 1) : -1;
      const closeP = openP !== -1 ? text.indexOf(")", openP + 1) : -1;
      if (close !== -1 && openP === close + 1 && closeP !== -1) {
        const label = text.slice(i + 1, close);
        const href = text.slice(openP + 1, closeP);
        out.push({ t: "a", href, c: [{ t: "txt", v: label }] });
        i = closeP + 1;
        continue;
      }
    }

    // bold **...**
    if (text.startsWith("**", i)) {
      const j = text.indexOf("**", i + 2);
      if (j !== -1) {
        out.push({ t: "b", c: parseInline(text.slice(i + 2, j)) });
        i = j + 2;
        continue;
      }
    }

    // italic *...*
    if (text[i] === "*") {
      const j = text.indexOf("*", i + 1);
      if (j !== -1) {
        out.push({ t: "i", c: parseInline(text.slice(i + 1, j)) });
        i = j + 1;
        continue;
      }
    }

    // plain run
    const nextCandidates = ["`", "[", "*"].map(ch => text.indexOf(ch, i)).filter(n => n !== -1);
    const next = nextCandidates.length ? Math.min(...nextCandidates) : -1;
    if (next === -1) {
      pushTxt(text.slice(i));
      break;
    }
    pushTxt(text.slice(i, next));
    i = next;
  }

  return out;
}

export function parseMarkdown(md: string): RichText {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlockNode[] = [];

  let para: string[] = [];
  let listKind: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushPara = () => {
    const text = para.join(" ").trim();
    if (text) blocks.push({ t: "p", c: parseInline(text) });
    para = [];
  };

  const flushList = () => {
    if (!listKind || listItems.length === 0) { listKind = null; listItems = []; return; }
    const items: BlockNode[] = listItems.map(t => ({ t: "p", c: parseInline(t) }));
    blocks.push({ t: listKind, items });
    listKind = null;
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    // Heading
    const h = /^(#{2,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara(); flushList();
      const level = h[1].length as 2|3|4;
      blocks.push({ t: "h", l: level, c: parseInline(h[2]) });
      continue;
    }

    // Unordered list
    const ul = /^-\s+(.*)$/.exec(trimmed);
    if (ul) {
      flushPara();
      if (listKind && listKind !== "ul") flushList();
      listKind = "ul";
      listItems.push(ul[1]);
      continue;
    }

    // Ordered list
    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ol) {
      flushPara();
      if (listKind && listKind !== "ol") flushList();
      listKind = "ol";
      listItems.push(ol[1]);
      continue;
    }

    // Paragraph line
    if (listKind) flushList();
    para.push(trimmed);
  }

  flushPara();
  flushList();
  return blocks;
}
