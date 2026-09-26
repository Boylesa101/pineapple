import { limited, notFound, publicDb } from '@/lib/website/feed';
import { uuid } from '@/lib/validation';

// GET /api/public/v1/files/{mediaId} — redirects to a short-lived link for a file that is currently
// public (a live post's cover or a visible document). Anything else is a 404.
export async function GET(request: Request, ctx: RouteContext<'/api/public/v1/files/[id]'>) {
  const blocked = limited(request, 600);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return notFound();
  const db = publicDb();
  const { data } = await db.rpc('public_file', { p_media: id });
  const file = ((data ?? []) as { storage_path: string; file_name: string; mime_type: string }[])[0];
  if (!file) return notFound();
  const isImage = file.mime_type.startsWith('image/') && file.mime_type !== 'image/svg+xml';
  const { data: signed } = await db.storage
    .from('client-files')
    .createSignedUrl(file.storage_path, 600, isImage ? undefined : { download: file.file_name });
  if (!signed?.signedUrl) return notFound();
  return new Response(null, {
    status: 302,
    headers: {
      Location: signed.signedUrl,
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'X-Robots-Tag': 'noindex',
    },
  });
}
