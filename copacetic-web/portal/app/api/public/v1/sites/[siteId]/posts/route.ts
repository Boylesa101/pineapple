import { fileUrl, json, limited, notFound, preflight, publicDb, validSite } from '@/lib/website/feed';

// GET /api/public/v1/sites/{siteId}/posts?page=1  — published posts, newest first, 12 a page.
const PAGE = 12;

type Row = { slug: string; title: string; summary: string; cover_media_id: string | null; cover_alt: string | null; published_at: string; updated_at: string };

export async function GET(request: Request, ctx: RouteContext<'/api/public/v1/sites/[siteId]/posts'>) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const { siteId } = await ctx.params;
  if (!validSite(siteId)) return notFound();
  const page = Math.min(Math.max(Number(new URL(request.url).searchParams.get('page')) || 1, 1), 500);
  const { data, error } = await publicDb().rpc('public_site_posts', { p_site: siteId, p_limit: PAGE + 1, p_offset: (page - 1) * PAGE });
  if (error) return json({ error: 'Unavailable' }, 503);
  const rows = (data ?? []) as Row[];
  return json({
    page,
    hasMore: rows.length > PAGE,
    posts: rows.slice(0, PAGE).map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      publishedAt: p.published_at,
      updatedAt: p.updated_at,
      cover: p.cover_media_id ? { url: fileUrl(p.cover_media_id), alt: p.cover_alt ?? '' } : null,
    })),
  });
}

export const OPTIONS = preflight;
