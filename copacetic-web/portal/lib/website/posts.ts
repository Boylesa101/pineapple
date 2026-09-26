import { z } from 'zod';
import { richTextSchema } from '@/lib/content/richtext';

// "Buying your first home: a guide" -> "buying-your-first-home-a-guide"
export function slugify(title: string) {
  const s = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return s || 'post';
}

export const slugSchema = z
  .string()
  .trim()
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lower-case letters, numbers and single hyphens');

export const postSchema = z.object({
  title: z.string().trim().max(200),
  slug: slugSchema,
  summary: z.string().trim().max(500),
  body: richTextSchema,
  coverMediaId: z.uuid().nullable(),
});
export type PostInput = z.infer<typeof postSchema>;

export type PostStatus = 'draft' | 'scheduled' | 'published';
export const postState = (p: { status: string; published_at: string | null }, now = new Date()): PostStatus =>
  p.status !== 'published' || !p.published_at ? 'draft' : new Date(p.published_at) > now ? 'scheduled' : 'published';
