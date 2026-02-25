import { z } from "zod";
import { RichTextSchema } from "../richtext/zod";

export const LinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1)
});

export const IssueMetaSchema = z.object({
  title: z.string().min(1),
  issueNumber: z.string().min(1),
  dateISO: z.string().min(4),
  editors: z.array(z.string()).default([]),
  orgName: z.string().optional(),
  department: z.string().optional(),
  contactEmail: z.string().optional(),
  disclaimer: z.string().optional()
});

export const FontSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("google"), googleCssHref: z.string().min(1) }),
  z.object({ kind: z.literal("local"), files: z.array(z.object({ path: z.string().min(1), weight: z.number().int(), style: z.enum(["normal","italic"]) })) })
]).optional();

export const FontSpecSchema = z.object({
  role: z.enum(["body","heading","mono"]),
  family: z.string().min(1),
  fallbacks: z.array(z.string()).default([]),
  source: FontSourceSchema
});

export const BrandSchema = z.object({
  logoText: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().default("#0057A8"),
  accentColor: z.string().default("#00B5CC"),
  footerLinks: z.array(LinkSchema).default([])
});

export const ThemeSchema = z.object({
  fonts: z.array(FontSpecSchema).default([]),
  maxWidthPx: z.number().int().min(320).max(1600).default(1100),
  radiusPx: z.number().int().min(0).max(32).default(16),
  bg: z.string().default("#03080F"),
  panel: z.string().default("rgba(255,255,255,0.06)"),
  text: z.string().default("rgba(255,255,255,0.92)"),
  muted: z.string().default("rgba(255,255,255,0.65)")
});

export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image","file"]).default("image"),
  src: z.string().min(1),
  alt: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional()
});

export const BlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text","article","ticker","rss","image"]),
  data: z.record(z.any())
});

export const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  layout: z.enum(["single","twoColumn"]).default("single"),
  blocks: z.array(BlockSchema).default([])
});

export const FeedSourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  mode: z.enum(["live","frozen"]).default("frozen"),
  fetchedAtISO: z.string().optional(),
  snapshot: z.any().optional()
});

export const IssueSchema = z.object({
  schemaVersion: z.number().int().default(2),
  meta: IssueMetaSchema,
  brand: BrandSchema,
  theme: ThemeSchema,
  assets: z.array(AssetSchema).default([]),
  sections: z.array(SectionSchema).default([]),
  feeds: z.array(FeedSourceSchema).default([])
});

export type Issue = z.infer<typeof IssueSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Asset = z.infer<typeof AssetSchema>;
