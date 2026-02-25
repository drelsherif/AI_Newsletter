import { z } from "zod";
import { RichTextSchema } from "../richtext/zod";

export const LinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const IssueMetaSchema = z.object({
  title: z.string().min(1),
  issueNumber: z.string().min(1),
  dateISO: z.string().min(4),
  editors: z.array(z.string()).default([]),
  orgName: z.string().optional(),
  department: z.string().optional(),
  contactEmail: z.string().optional(),
  disclaimer: z.string().optional(),
});

export const FontSourceSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("google"), googleCssHref: z.string().min(1) }),
    z.object({
      kind: z.literal("local"),
      files: z.array(
        z.object({
          path: z.string().min(1),
          weight: z.number().int(),
          style: z.enum(["normal", "italic"]),
        })
      ),
    }),
  ])
  .optional();

export const FontSpecSchema = z.object({
  role: z.enum(["body", "heading", "mono"]),
  family: z.string().min(1),
  fallbacks: z.array(z.string()).default([]),
  source: FontSourceSchema,
});

export const BrandSchema = z.object({
  logoMode: z.enum(["text", "image", "html"]).default("text"),
  logoText: z.string().optional(),
  logoUrl: z.string().optional(),
  logoHtml: z.string().optional(),
  primaryColor: z.string().default("#4F7FFF"),
  accentColor: z.string().default("#7C3AED"),
  footerLinks: z.array(LinkSchema).default([]),
});

export const ThemeSchema = z.object({
  fonts: z.array(FontSpecSchema).default([]),
  maxWidthPx: z.number().int().min(320).max(1600).default(680),
  radiusPx: z.number().int().min(0).max(32).default(12),
  bg: z.string().default("#0A0C0F"),
  panel: z.string().default("rgba(255,255,255,0.05)"),
  text: z.string().default("rgba(255,255,255,0.92)"),
  muted: z.string().default("rgba(255,255,255,0.60)"),
});

export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "file"]).default("image"),
  src: z.string().min(1),
  alt: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
});

export const BlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "text",
    "article",
    "spotlight",
    "articlePair",
    "ticker",
    "image",
    "html",
    "divider",
    "button",
    "spacer",
    "rss",
    "linkList",
    "governance",
    "sbarp",
    "prompt",
    "term",
    "history",
    "humor",
  ]),
  label: z.string().optional(),
  data: z.record(z.any()),
});

export const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  layout: z.enum(["single", "twoColumn", "threeColumn"]).default("single"),
  blocks: z.array(BlockSchema).default([]),
});

export const RssFeedArticleSchema = z.object({
  title: z.string().default(""),
  href: z.string().default(""),
  source: z.string().default(""),
  pubDate: z.string().default(""),
  summary: z.string().default(""),
});

export const FeedSourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  name: z.string().default(""),
  maxArticles: z.number().int().min(5).max(20).default(10),
  articles: z.array(RssFeedArticleSchema).default([]),
  lastFetchedAt: z.string().optional(),
  lastError: z.string().optional(),
});

export const IssueSchema = z.object({
  schemaVersion: z.number().int().default(4),
  meta: IssueMetaSchema,
  brand: BrandSchema,
  theme: ThemeSchema,
  assets: z.array(AssetSchema).default([]),
  sections: z.array(SectionSchema).default([]),
  feeds: z.array(FeedSourceSchema).default([]),
});

export type Issue = z.infer<typeof IssueSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type FeedSource = z.infer<typeof FeedSourceSchema>;
export type RssFeedArticle = z.infer<typeof RssFeedArticleSchema>;
