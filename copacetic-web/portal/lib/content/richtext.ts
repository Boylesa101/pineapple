import { z } from 'zod';

// Rich text is stored as Tiptap JSON. Only these nodes and marks are accepted from the client,
// so stored content can never carry raw HTML, scripts or unexpected attributes.

type Node = { type: string; content?: Node[]; text?: string; attrs?: Record<string, unknown>; marks?: Mark[] };
type Mark = { type: string; attrs?: Record<string, unknown> };

const safeHref = z
  .string()
  .max(2000)
  .refine((h) => /^(https?:\/\/|mailto:)/i.test(h), 'Links must start with https://, http:// or mailto:');

const mark: z.ZodType<Mark> = z.union([
  z.object({ type: z.enum(['bold', 'italic']) }).strict(),
  z
    .object({
      type: z.literal('link'),
      attrs: z.object({ href: safeHref }).passthrough().transform(({ href }) => ({ href })),
    })
    .strict(),
]);

const node: z.ZodType<Node> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('text'), text: z.string().max(20000), marks: z.array(mark).max(5).optional() }).strict(),
    z.object({ type: z.literal('hardBreak') }).strict(),
    z
      .object({
        type: z.literal('heading'),
        attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }).passthrough().transform(({ level }) => ({ level })),
        content: z.array(node).max(500).optional(),
      })
      .strict(),
    z
      .object({
        type: z.enum(['paragraph', 'bulletList', 'orderedList', 'listItem', 'blockquote']),
        attrs: z.record(z.string(), z.unknown()).optional().transform(() => undefined),
        content: z.array(node).max(500).optional(),
      })
      .strict(),
  ]),
);

export const richTextSchema = z
  .object({ type: z.literal('doc'), content: z.array(node).max(1000).optional() })
  .strict()
  .refine((d) => JSON.stringify(d).length < 150_000, 'This text is too long');

export type RichText = z.infer<typeof richTextSchema>;

export function plainText(doc: unknown): string {
  const out: string[] = [];
  const walk = (n: Node, depth = 0) => {
    if (n.type === 'text' && n.text) out.push(n.text);
    if (n.type === 'hardBreak') out.push('\n');
    n.content?.forEach((c) => walk(c, depth + 1));
    if (['paragraph', 'heading', 'listItem', 'blockquote'].includes(n.type)) out.push('\n');
  };
  if (doc && typeof doc === 'object') walk(doc as Node);
  return out.join('').replace(/\n{3,}/g, '\n\n').trim();
}

export const isEmptyRichText = (doc: unknown) => plainText(doc).length === 0;
