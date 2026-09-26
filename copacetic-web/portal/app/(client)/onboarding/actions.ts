'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { portalUrl } from '@/lib/env';
import { env } from '@/lib/env';
import { briefingProgress, cleanBriefing } from '@/lib/content/briefing';
import { richTextSchema } from '@/lib/content/richtext';
import { cleanFields, sectionConfig, type SectionType } from '@/lib/content/sections';
import { sendEmail } from '@/lib/email';
import { syncSoon } from '@/lib/jobs';
import { checklist, loadOnboarding, requireMember, sectionMissing } from '@/lib/onboarding';
import { checkSignature, extOf, FILE_TYPES, KIND_EXTS, MAX_UPLOAD_BYTES, safeFileName } from '@/lib/uploads';
import { sha256Hex, signVerdict } from '@/lib/uploads-server';
import { createClient } from '@/lib/supabase/server';
import { uuid } from '@/lib/validation';

type SaveResult = { ok: true; version: number } | { ok: false; reason: 'conflict' | 'locked' | 'invalid' };

const base = (orgId: string) => `/onboarding/${orgId}`;

// Why did an update touch no rows? Someone else saved first, or editing is closed.
async function whyNotSaved(table: 'briefings' | 'content_sections', match: Record<string, string>): Promise<SaveResult> {
  const supabase = await createClient();
  let q = supabase.from(table).select('status, version');
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data } = await q.maybeSingle();
  if (!data || data.status !== 'draft') return { ok: false, reason: 'locked' };
  // Still a draft: either someone else saved first, or editing has closed for this stage.
  const orgId = match.org_id ?? (await supabase.from('content_sections').select('org_id').eq('id', match.id ?? '').maybeSingle()).data?.org_id;
  if (orgId) {
    const { data: site } = await supabase.from('sites').select('stage').eq('org_id', orgId)
      .in('stage', ['onboarding', 'content_submitted']).limit(1).maybeSingle();
    if (!site) return { ok: false, reason: 'locked' };
  }
  return { ok: false, reason: 'conflict' };
}

// ------------------------------------------------------------------ briefing ---

export async function saveBriefing(orgId: string, version: number, data: unknown): Promise<SaveResult> {
  if (!uuid.safeParse(orgId).success || !Number.isInteger(version)) return { ok: false, reason: 'invalid' };
  await requireMember(orgId);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('briefings')
    .update({ data: cleanBriefing(data) })
    .eq('org_id', orgId)
    .eq('version', version)
    .select('version')
    .maybeSingle();
  if (!row) return whyNotSaved('briefings', { org_id: orgId });
  return { ok: true, version: row.version };
}

export async function submitBriefing(orgId: string): Promise<{ ok: boolean; missing?: string[] }> {
  if (!uuid.safeParse(orgId).success) return { ok: false };
  await requireMember(orgId);
  const o = await loadOnboarding(orgId);
  const progress = briefingProgress(o.briefing.data as Record<string, Record<string, unknown>>);
  if (!progress.complete) return { ok: false, missing: progress.missing };
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_briefing', { p_org: orgId });
  if (error) return { ok: false };
  syncSoon();
  await notifyAgency(o.org.name, orgId, 'submitted their briefing');
  revalidatePath(base(orgId), 'layout');
  return { ok: true };
}

// ------------------------------------------------------------------ sections ---

const typeSchema = z.enum(['brand', 'about', 'service', 'team_member', 'office', 'price_page', 'testimonial', 'faq', 'custom']);

export async function createSection(formData: FormData) {
  const parsed = z
    .object({ orgId: uuid, type: typeSchema, service: z.string().max(60).optional() })
    .safeParse({
      orgId: formData.get('orgId'),
      type: formData.get('type'),
      service: formData.get('service') || undefined,
    });
  if (!parsed.success) redirect('/');
  const { orgId, type, service } = parsed.data;
  await requireMember(orgId);
  const cfg = sectionConfig(type)!;
  const supabase = await createClient();

  // Brand and About us are one per firm: open the existing one if it's there.
  if (!cfg.repeatable) {
    const { data: existing } = await supabase.from('content_sections').select('id').eq('org_id', orgId).eq('type', type).maybeSingle();
    if (existing) redirect(`${base(orgId)}/section/${existing.id}`);
  }
  const { count } = await supabase.from('content_sections').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('type', type);
  const fields = type === 'price_page' && service ? cleanFields('price_page', { service }) : {};
  const { data, error } = await supabase
    .from('content_sections')
    .insert({ org_id: orgId, type, title: cfg.repeatable ? null : cfg.label, fields, sort_order: count ?? 0 })
    .select('id')
    .single();
  if (error || !data) redirect(`${base(orgId)}?error=locked`);
  redirect(`${base(orgId)}/section/${data.id}`);
}

const saveSchema = z.object({
  id: uuid,
  orgId: uuid,
  version: z.number().int(),
  title: z.string().max(200).nullable(),
  body: richTextSchema.nullable(),
  fields: z.record(z.string(), z.unknown()),
});

export async function saveSection(input: z.input<typeof saveSchema>): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  const { id, orgId, version, title, body, fields } = parsed.data;
  await requireMember(orgId);
  const supabase = await createClient();
  const { data: current } = await supabase.from('content_sections').select('type').eq('id', id).eq('org_id', orgId).maybeSingle();
  if (!current) return { ok: false, reason: 'locked' };
  const { data: row } = await supabase
    .from('content_sections')
    .update({ title: title?.trim() || null, body, fields: cleanFields(current.type as SectionType, fields) })
    .eq('id', id)
    .eq('version', version)
    .select('version')
    .maybeSingle();
  if (!row) return whyNotSaved('content_sections', { id });
  return { ok: true, version: row.version };
}

export async function submitSection(orgId: string, id: string): Promise<{ ok: boolean; missing?: string[] }> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(id).success) return { ok: false };
  await requireMember(orgId);
  const o = await loadOnboarding(orgId);
  const row = o.sections.find((s) => s.id === id);
  if (!row) return { ok: false };
  const missing = sectionMissing(o, row);
  if (missing.length) return { ok: false, missing };
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_section', { p_section: id });
  if (error) return { ok: false };
  syncSoon();
  revalidatePath(base(orgId), 'layout');
  return { ok: true };
}

export async function deleteSection(formData: FormData) {
  const parsed = z.object({ orgId: uuid, id: uuid }).safeParse({ orgId: formData.get('orgId'), id: formData.get('id') });
  if (!parsed.success) redirect('/');
  const { orgId, id } = parsed.data;
  await requireMember(orgId);
  const supabase = await createClient();
  const { data: row } = await supabase.from('content_sections').select('type').eq('id', id).eq('org_id', orgId).maybeSingle();
  const cfg = row && sectionConfig(row.type);
  // Remove the section's files from storage first (the rows cascade with the section).
  const { data: files } = await supabase.from('media').select('storage_path').eq('section_id', id);
  if (files?.length) await supabase.storage.from('client-files').remove(files.map((f) => f.storage_path));
  await supabase.from('content_sections').delete().eq('id', id).eq('org_id', orgId);
  revalidatePath(base(orgId), 'layout');
  redirect(cfg ? `${base(orgId)}/${cfg.slug}` : base(orgId));
}

export async function submitAll(orgId: string): Promise<{ ok: boolean; blocking?: string[] }> {
  if (!uuid.safeParse(orgId).success) return { ok: false };
  const { role } = await requireMember(orgId);
  if (role !== 'owner' && role !== 'approver') return { ok: false, blocking: ['Only owners and approvers can submit everything.'] };
  const o = await loadOnboarding(orgId);
  const { blocking } = checklist(o);
  if (blocking.length) return { ok: false, blocking };
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_all', { p_org: orgId });
  if (error) return { ok: false, blocking: ['Submission failed. Try again.'] };
  syncSoon();
  await notifyAgency(o.org.name, orgId, 'submitted all their content');
  revalidatePath('/', 'layout');
  return { ok: true };
}

async function notifyAgency(firm: string, orgId: string, what: string) {
  if (!env.AGENCY_NOTIFY_EMAIL) return;
  await sendEmail({
    to: env.AGENCY_NOTIFY_EMAIL,
    subject: `${firm} ${what}`,
    text: `${firm} has ${what} in the client portal.\n\nReview it here:\n${portalUrl(`/admin/clients/${orgId}/content`)}`,
  });
}

// ------------------------------------------------------------------- uploads ---

const uploadSchema = z.object({
  orgId: uuid,
  // null = a website file (blog image or document) rather than part of an onboarding section.
  sectionId: uuid.nullable(),
  kind: z.enum(['logo', 'image', 'font', 'document']),
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  label: z.string().max(120).optional(),
  altText: z.string().max(500).optional(),
  fontLicence: z.boolean().optional(),
});

export type UploadTicket =
  | { ok: true; mediaId: string; path: string; token: string; contentType: string }
  | { ok: false; message: string };

// Step 1: register the file and get a one-time upload link (the browser uploads straight to storage).
export async function requestUpload(input: z.input<typeof uploadSchema>): Promise<UploadTicket> {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'That file is too large or its details aren’t valid (25 MB maximum).' };
  const d = parsed.data;
  const { viewer } = await requireMember(d.orgId);
  const ext = extOf(d.name);
  if (!ext || !KIND_EXTS[d.kind].includes(ext)) {
    return { ok: false, message: `That file type isn’t accepted here. Use ${KIND_EXTS[d.kind].join(', ')}.` };
  }
  if (d.kind === 'font' && !d.fontLicence) return { ok: false, message: 'Confirm you have a licence to share this font file.' };
  if (d.sectionId === null && d.kind !== 'image' && d.kind !== 'document') {
    return { ok: false, message: 'Only images and documents can be added here.' };
  }

  const supabase = await createClient();
  const mediaId = crypto.randomUUID();
  const path = `${d.orgId}/${mediaId}/${safeFileName(d.name)}`;
  const { error } = await supabase.from('media').insert({
    id: mediaId,
    org_id: d.orgId,
    section_id: d.sectionId,
    kind: d.kind,
    storage_path: path,
    original_name: d.name,
    mime_type: FILE_TYPES[ext].mime,
    size_bytes: d.size,
    label: d.label?.trim() || null,
    alt_text: d.altText?.trim() || null,
    font_licence_confirmed: d.kind === 'font' ? true : false,
    uploaded_by: viewer.userId,
  });
  if (error) return { ok: false, message: 'Files can’t be added here right now.' };
  const { data: signed, error: signError } = await supabase.storage.from('client-files').createSignedUploadUrl(path);
  if (signError || !signed) {
    await supabase.from('media').delete().eq('id', mediaId);
    return { ok: false, message: 'The upload couldn’t start. Try again.' };
  }
  return { ok: true, mediaId, path, token: signed.token, contentType: FILE_TYPES[ext].mime };
}

// Step 2: check what actually arrived, then sign the verdict so the database will accept it.
export async function finalizeUpload(orgId: string, mediaId: string): Promise<{ status: 'clean' | 'rejected' | 'pending'; message?: string }> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(mediaId).success) return { status: 'rejected', message: 'Invalid file.' };
  await requireMember(orgId);
  const supabase = await createClient();
  const { data: m } = await supabase
    .from('media')
    .select('id, storage_path, original_name, status')
    .eq('id', mediaId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (!m) return { status: 'rejected', message: 'File not found.' };
  if (m.status !== 'pending') return { status: m.status as 'clean' | 'rejected' };

  const { data: blob } = await supabase.storage.from('client-files').download(m.storage_path);
  const bytes = blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  const ext = extOf(m.original_name);
  let reason: string | null = null;
  if (!bytes || !bytes.length) reason = 'the upload didn’t arrive';
  else if (bytes.length > MAX_UPLOAD_BYTES) reason = 'it’s larger than 25 MB';
  else if (!ext) reason = 'unsupported file type';
  else reason = checkSignature(ext, bytes);

  const ok = reason === null;
  const sha = bytes && ok ? sha256Hex(bytes) : null;
  const size = bytes?.length || 1;
  const signature = signVerdict(mediaId, ok, sha, size);
  if (!signature) {
    // No signing secret configured: leave it pending for the agency to see.
    return { status: 'pending', message: ok ? undefined : `This file was not accepted: ${reason}.` };
  }
  const { error: finalizeError } = await supabase.rpc('finalize_media', { p_media: mediaId, p_ok: ok, p_sha256: sha, p_size: size, p_signature: signature });
  if (finalizeError) {
    // e.g. MEDIA_SIGNING_SECRET doesn't match the Vault secret: the file stays unchecked.
    console.error('[uploads] finalize_media failed', finalizeError.code, finalizeError.message);
    return { status: 'pending', message: 'The file uploaded but couldn’t be marked as checked. We’ve been notified; you can carry on.' };
  }
  if (!ok) {
    await supabase.storage.from('client-files').remove([m.storage_path]);
    await supabase.from('media').delete().eq('id', mediaId);
    return { status: 'rejected', message: `This file was not accepted: ${reason}.` };
  }
  revalidatePath(base(orgId), 'layout');
  return { status: 'clean' };
}

export async function deleteMedia(orgId: string, mediaId: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(mediaId).success) return { ok: false };
  await requireMember(orgId);
  const supabase = await createClient();
  const { data: m } = await supabase.from('media').select('storage_path').eq('id', mediaId).eq('org_id', orgId).maybeSingle();
  if (!m) return { ok: false };
  // Object first: the storage policy needs the media row to still exist.
  await supabase.storage.from('client-files').remove([m.storage_path]);
  const { error } = await supabase.from('media').delete().eq('id', mediaId);
  if (error) return { ok: false };
  revalidatePath(base(orgId), 'layout');
  return { ok: true };
}

export async function updateMedia(orgId: string, mediaId: string, patch: { altText?: string; label?: string }): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(orgId).success || !uuid.safeParse(mediaId).success) return { ok: false };
  await requireMember(orgId);
  const supabase = await createClient();
  const update: Record<string, string | null> = {};
  if (patch.altText !== undefined) update.alt_text = patch.altText.trim().slice(0, 500) || null;
  if (patch.label !== undefined) update.label = patch.label.trim().slice(0, 120) || null;
  const { error } = await supabase.from('media').update(update).eq('id', mediaId).eq('org_id', orgId);
  return { ok: !error };
}
