'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { formString, uuid } from '@/lib/validation';
import { syncSoon } from '@/lib/jobs';
import { createClient } from '@/lib/supabase/server';
import { intervalsSchema, weekSchema } from '@/lib/website/hours';
import { loadWebsite } from '@/lib/website/load';
import { postSchema, slugify, slugSchema } from '@/lib/website/posts';

// Every action re-checks membership; the database (RLS + publish_post) enforces roles again.

type SaveResult = { ok: true; version: number } | { ok: false; reason: 'conflict' | 'locked' | 'invalid' };
const base = (orgId: string) => `/website/${orgId}`;

async function requireWebsite(orgId: string) {
  const ctx = await loadWebsite(orgId);
  if (!ctx.enabled && !ctx.isAgency) redirect(base(orgId));
  return ctx;
}

// -------------------------------------------------------------------- posts ---

export async function createPost(formData: FormData) {
  const orgId = formString(formData, 'orgId');
  if (!uuid.safeParse(orgId).success) redirect('/');
  const { viewer } = await requireWebsite(orgId);
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from('posts').insert({
    id, org_id: orgId, title: '', slug: `draft-${id.slice(0, 8)}`, created_by: viewer.userId,
  });
  if (error) redirect(`${base(orgId)}/blog?error=save_failed`);
  syncSoon();
  redirect(`${base(orgId)}/blog/${id}`);
}

const savePostSchema = postSchema.omit({ slug: true }).extend({ id: uuid, orgId: uuid, version: z.number().int() });

export async function savePost(input: z.input<typeof savePostSchema>): Promise<SaveResult> {
  const parsed = savePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  const { id, orgId, version, title, summary, body, coverMediaId } = parsed.data;
  await requireWebsite(orgId);
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('posts')
    .update({ title, summary, body, cover_media_id: coverMediaId })
    .eq('id', id)
    .eq('org_id', orgId)
    .eq('version', version)
    .select('version')
    .maybeSingle();
  if (error) return { ok: false, reason: 'invalid' }; // e.g. a cover that isn't a checked image
  if (!row) {
    // Someone else saved first, or this person can't edit it (a published post, for an editor).
    const { data: now } = await supabase.from('posts').select('version').eq('id', id).maybeSingle();
    return { ok: false, reason: now && now.version !== version ? 'conflict' : 'locked' };
  }
  syncSoon();
  return { ok: true, version: row.version };
}

export async function setPostSlug(
  orgId: string, id: string, raw: string, version: number,
): Promise<{ ok: true; slug: string; version: number } | { ok: false; message: string; conflict?: boolean }> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(id).success || !Number.isInteger(version)) return { ok: false, message: 'Invalid post.' };
  await requireWebsite(orgId);
  const parsed = slugSchema.safeParse(slugify(raw));
  if (!parsed.success) return { ok: false, message: 'Use letters, numbers and hyphens.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('posts').update({ slug: parsed.data })
    .eq('id', id).eq('org_id', orgId).eq('version', version).select('slug, version').maybeSingle();
  if (error?.code === '23505') return { ok: false, message: 'Another post already uses that address.' };
  if (error) return { ok: false, message: 'The address couldn’t be changed.' };
  if (!data) return { ok: false, message: 'Someone else changed this post. Reload the page to see their version.', conflict: true };
  syncSoon();
  revalidatePath(`${base(orgId)}/blog`);
  return { ok: true, slug: data.slug, version: data.version };
}

const publishSchema = z.object({
  orgId: uuid,
  id: uuid,
  // "YYYY-MM-DDTHH:MM" in UK time from a datetime-local input, or empty for now.
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).or(z.literal('')),
});

export async function publishPost(formData: FormData) {
  const parsed = publishSchema.safeParse({ orgId: formString(formData, 'orgId'), id: formString(formData, 'id'), at: formString(formData, 'at') });
  if (!parsed.success) redirect('/');
  const { orgId, id, at } = parsed.data;
  await requireWebsite(orgId);
  const supabase = await createClient();
  // Give the post a readable address from its title the first time it goes out.
  const { data: post } = await supabase.from('posts').select('title, slug').eq('id', id).eq('org_id', orgId).maybeSingle();
  if (!post) redirect(`${base(orgId)}/blog`);
  if (!post.title.trim()) redirect(`${base(orgId)}/blog/${id}?error=needs_title`);
  if (/^draft-[0-9a-f]{8}$/.test(post.slug)) {
    const wanted = slugify(post.title);
    const { error } = await supabase.from('posts').update({ slug: wanted }).eq('id', id);
    if (error?.code === '23505') await supabase.from('posts').update({ slug: `${wanted}-${id.slice(0, 4)}` }).eq('id', id);
  }
  const { error } = await supabase.rpc('publish_post', { p_post: id, p_at: at ? ukLocalToIso(at) : null });
  if (error) redirect(`${base(orgId)}/blog/${id}?error=${error.code === '42501' ? 'not_allowed' : 'save_failed'}`);
  syncSoon();
  revalidatePath(`${base(orgId)}/blog`);
  redirect(`${base(orgId)}/blog/${id}?published=1`);
}

export async function unpublishPost(formData: FormData) {
  const orgId = formString(formData, 'orgId');
  const id = formString(formData, 'id');
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(id).success) redirect('/');
  await requireWebsite(orgId);
  const supabase = await createClient();
  const { error } = await supabase.rpc('unpublish_post', { p_post: id });
  if (error) redirect(`${base(orgId)}/blog/${id}?error=not_allowed`);
  syncSoon();
  revalidatePath(`${base(orgId)}/blog`);
  redirect(`${base(orgId)}/blog/${id}`);
}

export async function deletePost(formData: FormData) {
  const orgId = formString(formData, 'orgId');
  const id = formString(formData, 'id');
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(id).success) redirect('/');
  await requireWebsite(orgId);
  const supabase = await createClient();
  const { data } = await supabase.from('posts').delete().eq('id', id).eq('org_id', orgId).select('id');
  if (!data?.length) redirect(`${base(orgId)}/blog/${id}?error=not_allowed`);
  syncSoon();
  revalidatePath(`${base(orgId)}/blog`);
  redirect(`${base(orgId)}/blog`);
}

// A UK wall-clock time ("2026-10-01T09:00") as an instant, whatever the server's time zone.
function ukLocalToIso(local: string) {
  const asUtc = new Date(`${local}:00Z`);
  const offsetMs = (d: Date) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - d.getTime();
  };
  return new Date(asUtc.getTime() - offsetMs(asUtc)).toISOString();
}

// ------------------------------------------------------------ opening times ---

const hoursSchema = z.object({ orgId: uuid, officeId: uuid, weekly: weekSchema, note: z.string().trim().max(300) });

export async function saveHours(input: z.input<typeof hoursSchema>): Promise<{ ok: boolean; message?: string }> {
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the times and try again.' };
  const { orgId, officeId, weekly, note } = parsed.data;
  await requireWebsite(orgId);
  const supabase = await createClient();
  const { error } = await supabase
    .from('office_hours')
    .upsert({ office_id: officeId, org_id: orgId, weekly, note: note || null }, { onConflict: 'office_id' });
  if (error) return { ok: false, message: 'Those opening times couldn’t be saved.' };
  syncSoon();
  revalidatePath(`${base(orgId)}/opening-times`);
  return { ok: true };
}

const closureSchema = z.object({
  orgId: uuid,
  officeIds: z.array(uuid).min(1).max(50),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closed: z.boolean(),
  hours: intervalsSchema,
  note: z.string().trim().max(200),
});

export async function addClosure(input: z.input<typeof closureSchema>): Promise<{ ok: boolean; message?: string }> {
  const parsed = closureSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the date and times.' };
  const { orgId, officeIds, day, closed, hours, note } = parsed.data;
  if (!closed && !hours.length) return { ok: false, message: 'Add the special opening hours, or mark the day as closed.' };
  await requireWebsite(orgId);
  const supabase = await createClient();
  const { error } = await supabase.from('office_closures').upsert(
    officeIds.map((officeId) => ({ office_id: officeId, org_id: orgId, day, hours: closed ? null : hours, note: note || null })),
    { onConflict: 'office_id,day' },
  );
  if (error) return { ok: false, message: 'That day couldn’t be saved.' };
  syncSoon();
  revalidatePath(`${base(orgId)}/opening-times`);
  return { ok: true };
}

export async function deleteClosure(formData: FormData) {
  const orgId = formString(formData, 'orgId');
  const id = formString(formData, 'id');
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(id).success) redirect('/');
  await requireWebsite(orgId);
  const supabase = await createClient();
  await supabase.from('office_closures').delete().eq('id', id).eq('org_id', orgId);
  syncSoon();
  revalidatePath(`${base(orgId)}/opening-times`);
  redirect(`${base(orgId)}/opening-times`);
}

// ---------------------------------------------------------------- documents ---

const docSchema = z.object({
  orgId: uuid,
  mediaId: uuid,
  title: z.string().trim().min(1, 'Give the document a title').max(200),
  description: z.string().trim().max(500),
});

export async function addDocument(input: z.input<typeof docSchema>): Promise<{ ok: boolean; message?: string }> {
  const parsed = docSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the details.' };
  const { orgId, mediaId, title, description } = parsed.data;
  const { canPublish } = await requireWebsite(orgId);
  const supabase = await createClient();
  const { count } = await supabase.from('site_documents').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
  // Editors prepare documents; an owner or approver shows them on the site.
  const { error } = await supabase.from('site_documents').insert({
    org_id: orgId, media_id: mediaId, title, description: description || null, sort_order: count ?? 0, visible: canPublish,
  });
  if (error) return { ok: false, message: 'The document couldn’t be added. Wait for the file check to finish, then try again.' };
  syncSoon();
  revalidatePath(`${base(orgId)}/documents`);
  return { ok: true };
}

export async function updateDocument(formData: FormData) {
  const parsed = z.object({
    orgId: uuid, id: uuid,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(500),
    visible: z.enum(['on', '']),
  }).safeParse({
    orgId: formString(formData, 'orgId'), id: formString(formData, 'id'),
    title: formString(formData, 'title'), description: formString(formData, 'description'), visible: formString(formData, 'visible'),
  });
  const orgId = formString(formData, 'orgId');
  if (!parsed.success) redirect(uuid.safeParse(orgId).success ? `${base(orgId)}/documents?error=invalid` : '/');
  const d = parsed.data;
  await requireWebsite(d.orgId);
  const supabase = await createClient();
  const { data: updated } = await supabase.from('site_documents')
    .update({ title: d.title, description: d.description || null, visible: d.visible === 'on' })
    .eq('id', d.id).eq('org_id', d.orgId).select('id');
  if (!updated?.length) redirect(`${base(d.orgId)}/documents?error=not_allowed`);
  syncSoon();
  revalidatePath(`${base(d.orgId)}/documents`);
  redirect(`${base(d.orgId)}/documents`);
}

// Swap the file behind a document; its public link stays the same.
export async function replaceDocumentFile(orgId: string, id: string, mediaId: string): Promise<{ ok: boolean; message?: string }> {
  if (![orgId, id, mediaId].every((v) => uuid.safeParse(v).success)) return { ok: false, message: 'Invalid document.' };
  await requireWebsite(orgId);
  const supabase = await createClient();
  const { data: doc } = await supabase.from('site_documents').select('media_id').eq('id', id).eq('org_id', orgId).maybeSingle();
  if (!doc) return { ok: false, message: 'Document not found.' };
  const { data: swapped, error } = await supabase.from('site_documents').update({ media_id: mediaId }).eq('id', id).select('id');
  if (!error && !swapped?.length) return { ok: false, message: 'Only owners and approvers can change a document that’s on the website.' };
  if (error) return { ok: false, message: 'The new file couldn’t be used. Wait for the file check to finish, then try again.' };
  await removeFile(orgId, doc.media_id);
  syncSoon();
  revalidatePath(`${base(orgId)}/documents`);
  return { ok: true };
}

export async function deleteDocument(formData: FormData) {
  const orgId = formString(formData, 'orgId');
  const id = formString(formData, 'id');
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(id).success) redirect('/');
  await requireWebsite(orgId);
  const supabase = await createClient();
  const { data: doc } = await supabase.from('site_documents').delete().eq('id', id).eq('org_id', orgId).select('media_id').maybeSingle();
  if (!doc) redirect(`${base(orgId)}/documents?error=not_allowed`);
  await removeFile(orgId, doc.media_id);
  syncSoon();
  revalidatePath(`${base(orgId)}/documents`);
  redirect(`${base(orgId)}/documents`);
}

// Delete a website file and its stored object (only if nothing else still uses it).
async function removeFile(orgId: string, mediaId: string) {
  const supabase = await createClient();
  const [{ count: docs }, { count: covers }] = await Promise.all([
    supabase.from('site_documents').select('id', { count: 'exact', head: true }).eq('media_id', mediaId),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('cover_media_id', mediaId),
  ]);
  if (docs || covers) return;
  const { data: m } = await supabase.from('media').select('storage_path').eq('id', mediaId).eq('org_id', orgId).is('section_id', null).maybeSingle();
  if (!m) return;
  // Object first: the storage policy needs the media row to still exist.
  await supabase.storage.from('client-files').remove([m.storage_path]);
  await supabase.from('media').delete().eq('id', mediaId);
}
