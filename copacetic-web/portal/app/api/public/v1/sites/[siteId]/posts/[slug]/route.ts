import { fileUrl, json, limited, notFound, preflight, publicDb, validSite } from '@/lib/website/feed';
import { readingMinutes, richTextToHtml } from '@/lib/website/render';

// GET /api/public/v1/sites/{siteId}/posts/{slug} — one published post, with its body as safe HTML.

type Row = {
  slug: string; title: string; summary: string; body: unknown; cover_media_id: string | null; cover_alt: string | null;
  published_at: string; updated_at: string;
};

export async function GET(request: Request, ctx: RouteContext<'/api/public/v1/sites/[siteId]/posts/[slug]'>) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const { siteId, slug } = await ctx.params;
  if (!validSite(siteId) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return notFound();
  const { data, error } = await publicDb().rpc('public_site_post', { p_site: siteId, p_slug: slug });
  if (error) return json({ error: 'Unavailable' }, 503);
  const p = ((data ?? []) as Row[])[0];
  if (!p) return notFound();
  return json({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    html: richTextToHtml(p.body),
    readingMinutes: readingMinutes(p.body),
    publishedAt: p.published_at,
    updatedAt: p.updated_at,
    cover: p.cover_media_id ? { url: fileUrl(p.cover_media_id), alt: p.cover_alt ?? '' } : null,
  });
}

export const OPTIONS = preflight;
