import 'server-only';
import type { FileItem } from '@/components/file-manager';
import { withFileUrls } from '@/lib/files';
import type { MediaRow } from '@/lib/onboarding';
import { createClient } from '@/lib/supabase/server';
import { readWeek, type Closure, type Week } from '@/lib/website/hours';

// Reads for the Website area, as the signed-in member (RLS applies).

const MEDIA_COLUMNS = 'id, section_id, kind, storage_path, original_name, mime_type, size_bytes, alt_text, label, status, created_at';

export async function loadLibrary(orgId: string, kind: 'image' | 'document'): Promise<FileItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('media').select(MEDIA_COLUMNS)
    .eq('org_id', orgId).is('section_id', null).eq('kind', kind)
    .order('created_at', { ascending: false });
  return withFileUrls((data ?? []) as MediaRow[]);
}

export type PostRow = {
  id: string; title: string; slug: string; summary: string; body: unknown; cover_media_id: string | null;
  status: 'draft' | 'published'; published_at: string | null; version: number; updated_at: string;
};

export async function loadPosts(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('id, title, slug, summary, status, published_at, updated_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });
  return (data ?? []) as Omit<PostRow, 'body' | 'cover_media_id' | 'version'>[];
}

export async function loadPost(orgId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('id, title, slug, summary, body, cover_media_id, status, published_at, version, updated_at')
    .eq('org_id', orgId).eq('id', id).maybeSingle();
  return data as PostRow | null;
}

export type OfficeHours = {
  id: string; name: string; address: string | null; weekly: Week; note: string | null;
  closures: (Closure & { id: string })[];
};

export async function loadOffices(orgId: string): Promise<OfficeHours[]> {
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  const [{ data: offices }, { data: hours }, { data: closures }] = await Promise.all([
    supabase.from('content_sections').select('id, title, fields').eq('org_id', orgId).eq('type', 'office')
      .order('sort_order').order('created_at'),
    supabase.from('office_hours').select('office_id, weekly, note').eq('org_id', orgId),
    supabase.from('office_closures').select('id, office_id, day, hours, note').eq('org_id', orgId).gte('day', today).order('day'),
  ]);
  return (offices ?? []).map((o) => {
    const h = hours?.find((x) => x.office_id === o.id);
    return {
      id: o.id,
      name: o.title || 'Office',
      address: typeof (o.fields as Record<string, unknown>)?.address === 'string' ? (o.fields as { address: string }).address : null,
      weekly: readWeek(h?.weekly),
      note: h?.note ?? null,
      closures: (closures ?? []).filter((c) => c.office_id === o.id)
        .map((c) => ({ id: c.id, day: c.day, hours: (c.hours as Closure['hours']) ?? null, note: c.note })),
    };
  });
}

export type DocumentRow = {
  id: string; title: string; description: string | null; visible: boolean; media_id: string; updated_at: string;
  file: FileItem | null;
};

export async function loadDocuments(orgId: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const [{ data: docs }, files] = await Promise.all([
    supabase.from('site_documents').select('id, title, description, visible, media_id, updated_at')
      .eq('org_id', orgId).order('sort_order').order('created_at'),
    loadLibrary(orgId, 'document'),
  ]);
  return (docs ?? []).map((d) => ({ ...d, file: files.find((f) => f.id === d.media_id) ?? null }));
}
