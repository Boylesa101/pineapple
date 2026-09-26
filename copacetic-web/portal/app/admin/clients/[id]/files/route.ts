import { NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { uuid } from '@/lib/validation';

// Every checked file for a client, zipped into folders by kind (Logos/, Images/, Fonts/, Documents/).
export async function GET(_req: Request, ctx: RouteContext<'/admin/clients/[id]/files'>) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer?.isAgencyAdmin || viewer.aal !== 'aal2' || !uuid.safeParse(id).success) {
    return new NextResponse('Not found', { status: 404 });
  }
  const supabase = await createClient();
  const [{ data: org }, { data: media }] = await Promise.all([
    supabase.from('organisations').select('slug').eq('id', id).maybeSingle(),
    supabase.from('media').select('kind, storage_path, original_name').eq('org_id', id).eq('status', 'clean'),
  ]);
  if (!org) return new NextResponse('Not found', { status: 404 });

  const folders = { logo: 'Logos', image: 'Images', font: 'Fonts', document: 'Documents' } as const;
  const entries: Record<string, Uint8Array> = {};
  for (const m of media ?? []) {
    const { data } = await supabase.storage.from('client-files').download(m.storage_path);
    if (!data) continue;
    const safe = m.original_name.replace(/[\\/:*?"<>|]+/g, '-');
    let name = `${folders[m.kind as keyof typeof folders]}/${safe}`;
    for (let n = 2; entries[name]; n++) name = `${folders[m.kind as keyof typeof folders]}/${n}-${safe}`;
    entries[name] = new Uint8Array(await data.arrayBuffer());
  }
  const zip = zipSync(entries, { level: 0 });
  return new NextResponse(Buffer.from(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${org.slug}-files.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
