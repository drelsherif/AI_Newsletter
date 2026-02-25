import type { Block } from "../../core/issue/schema";
import type { RenderMode } from "../modes";
import { TextBlock } from "./types/TextBlock";
import { ArticleBlock } from "./types/ArticleBlock";
import { TickerBlock } from "./types/TickerBlock";
import { ImageBlock } from "./types/ImageBlock";
import { HtmlBlock } from "./types/HtmlBlock";
import { DividerBlock } from "./types/DividerBlock";
import { ButtonBlock } from "./types/ButtonBlock";
import { SpacerBlock } from "./types/SpacerBlock";
import { RSSBlock } from "./types/RSSBlock";
import { SpotlightBlock } from "./types/SpotlightBlock";
import { ArticlePairBlock } from "./types/ArticlePairBlock";
import { LinkListBlock } from "./types/LinkListBlock";
import { GovernanceBlock, SbarpBlock, PromptBlock, TermBlock, HistoryBlock, HumorBlock } from "./types/NeurologyPulseBlocks";

export type BlockRenderProps = { block: Block; mode: RenderMode };

export type BlockDefinition = {
  title: string;
  description: string;
  emailSafe: boolean;
  icon: string;
  Render: (p: BlockRenderProps) => JSX.Element;
};

export const blockRegistry: Record<Block["type"], BlockDefinition> = {
  text: {
    title: "Text",
    description: "Rich text with heading, body, and links",
    emailSafe: true,
    icon: "T",
    Render: TextBlock,
  },
  article: {
    title: "Article",
    description: "Title, source, summary, and read more link",
    emailSafe: true,
    icon: "A",
    Render: ArticleBlock,
  },
  spotlight: {
    title: "Spotlight",
    description: "Featured article with image + 'Why it matters' + 'My take'",
    emailSafe: true,
    icon: "★",
    Render: SpotlightBlock,
  },
  articlePair: {
    title: "Article Pair",
    description: "Two articles side-by-side inside one block",
    emailSafe: true,
    icon: "Ⅱ",
    Render: ArticlePairBlock,
  },
  ticker: {
    title: "Ticker",
    description: "Pill-style announcement strip",
    emailSafe: true,
    icon: "~",
    Render: TickerBlock,
  },
  image: {
    title: "Image",
    description: "Upload or link an image with caption",
    emailSafe: true,
    icon: "⊡",
    Render: ImageBlock,
  },
  html: {
    title: "HTML",
    description: "Custom HTML block with label",
    emailSafe: true,
    icon: "<>",
    Render: HtmlBlock,
  },
  divider: {
    title: "Divider",
    description: "Line, dots, or blank space",
    emailSafe: true,
    icon: "—",
    Render: DividerBlock,
  },
  button: {
    title: "Button",
    description: "CTA button with custom color",
    emailSafe: true,
    icon: "◉",
    Render: ButtonBlock,
  },
  spacer: {
    title: "Spacer",
    description: "Adjustable vertical blank space",
    emailSafe: true,
    icon: "↕",
    Render: SpacerBlock,
  },
  linkList: {
    title: "Link List",
    description: "Curated list of links (Northwell News, Quick Reads, etc.)",
    emailSafe: true,
    icon: "≡",
    Render: LinkListBlock,
  },
  governance: {
    title: "Governance / Legal",
    description: "Styled governance/legal note with markdown body",
    emailSafe: true,
    icon: "§",
    Render: GovernanceBlock,
  },
  sbarp: {
    title: "SBAR-P",
    description: "Situation/Background/Assessment/Recommendation + Prompt",
    emailSafe: true,
    icon: "S",
    Render: SbarpBlock,
  },
  prompt: {
    title: "Prompt Block",
    description: "Template + Good/Bad prompt example + tips",
    emailSafe: true,
    icon: "⚡",
    Render: PromptBlock,
  },
  term: {
    title: "AI Term",
    description: "Term of the month with definition and why it matters",
    emailSafe: true,
    icon: "Ω",
    Render: TermBlock,
  },
  history: {
    title: "AI History",
    description: "Short historical vignette / timeline nugget",
    emailSafe: true,
    icon: "⌛",
    Render: HistoryBlock,
  },
  humor: {
    title: "Humor",
    description: "Lighthearted closing block",
    emailSafe: true,
    icon: "☺",
    Render: HumorBlock,
  },
  rss: {
    title: "RSS Feed",
    description: "Live articles from RSS/Atom feeds",
    emailSafe: true,
    icon: "📡",
    Render: RSSBlock,
  },
};
