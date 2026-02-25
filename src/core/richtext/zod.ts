import { z } from "zod";

export const InlineSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion("t", [
    z.object({ t: z.literal("txt"), v: z.string() }),
    z.object({ t: z.literal("code"), v: z.string() }),
    z.object({ t: z.literal("b"), c: z.array(InlineSchema) }),
    z.object({ t: z.literal("i"), c: z.array(InlineSchema) }),
    z.object({ t: z.literal("a"), href: z.string(), c: z.array(InlineSchema) })
  ])
);

export const BlockNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion("t", [
    z.object({ t: z.literal("p"), c: z.array(InlineSchema) }),
    z.object({ t: z.literal("h"), l: z.union([z.literal(2), z.literal(3), z.literal(4)]), c: z.array(InlineSchema) }),
    z.object({ t: z.literal("ul"), items: z.array(BlockNodeSchema) }),
    z.object({ t: z.literal("ol"), items: z.array(BlockNodeSchema) }),
    z.object({ t: z.literal("quote"), c: z.array(BlockNodeSchema) })
  ])
);

export const RichTextSchema = z.array(BlockNodeSchema);
export type RichText = z.infer<typeof RichTextSchema>;
