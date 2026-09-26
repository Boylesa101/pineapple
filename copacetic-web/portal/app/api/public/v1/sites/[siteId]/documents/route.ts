import { fileUrl, json, limited, notFound, preflight, publicDb, validSite } from '@/lib/website/feed';

// GET /api/public/v1/sites/{siteId}/documents — documents the firm has chosen to show.

type Row = { id: string; title: string; description: string | null; media_id: string; file_name: string; mime_type: string; size_bytes: number; updated_at: string };

export async function GET(request: Request, ctx: RouteContext<'/api/public/v1/sites/[siteId]/documents'>) {
  const blocked = limited(request);
  if (blocked) return blocked;
  const { siteId } = await ctx.params;
  if (!validSite(siteId)) return notFound();
  const { data, error } = await publicDb().rpc('public_site_documents', { p_site: siteId });
  if (error) return json({ error: 'Unavailable' }, 503);
  return json({
    documents: ((data ?? []) as Row[]).map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      fileName: d.file_name,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      // Always points at the current file, even after the firm replaces it.
      url: fileUrl(d.media_id),
      updatedAt: d.updated_at,
    })),
  });
}

export const OPTIONS = preflight;
