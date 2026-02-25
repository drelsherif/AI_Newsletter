export type Inline =
  | { t: "txt"; v: string }
  | { t: "b"; c: Inline[] }
  | { t: "i"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "a"; href: string; c: Inline[] };

export type BlockNode =
  | { t: "p"; c: Inline[] }
  | { t: "h"; l: 2 | 3 | 4; c: Inline[] }
  | { t: "ul"; items: BlockNode[] }
  | { t: "ol"; items: BlockNode[] }
  | { t: "quote"; c: BlockNode[] };

export type RichText = BlockNode[];
