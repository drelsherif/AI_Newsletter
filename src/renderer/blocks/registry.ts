import type { Block } from "../../core/issue/schema";
import type { RenderMode } from "../modes";
import { TextBlock } from "./types/TextBlock";
import { ArticleBlock } from "./types/ArticleBlock";
import { TickerBlock } from "./types/TickerBlock";
import { RSSBlock } from "./types/RSSBlock";
import { ImageBlock } from "./types/ImageBlock";

export type BlockRenderProps = { block: Block; mode: RenderMode };

export type BlockDefinition = {
  title: string;
  emailSafe: boolean;
  Render: (p: BlockRenderProps) => JSX.Element;
};

export const blockRegistry: Record<Block["type"], BlockDefinition> = {
  text: { title: "Text", emailSafe: true, Render: TextBlock },
  article: { title: "Article", emailSafe: true, Render: ArticleBlock },
  ticker: { title: "Ticker", emailSafe: true, Render: TickerBlock },
  rss: { title: "RSS", emailSafe: false, Render: RSSBlock },
  image: { title: "Image", emailSafe: true, Render: ImageBlock }
};
