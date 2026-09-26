'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAndSendInvite } from '@/lib/invitations';
import type { MessageCode } from '@/lib/messages';
import { createClient } from '@/lib/supabase/server';
import { buildSchema, formString, inviteSchema, newClientSchema, role, stageSchema, uuid } from '@/lib/validation';

// Every action re-checks agency admin (flag + 2FA) itself; RLS then enforces it again in the database.

const toClient = (orgId: string, code?: MessageCode): never =>
  redirect(`/admin/clients/${orgId}${code ? `?error=${code}` : ''}`);

export async function createClientOrg(formData: FormData) {
  await requireAdmin();
  const parsed = newClientSchema.safeParse({
    name: formString(formData, 'name'),
    slug: formString(formData, 'slug'),
    sraNumber: formString(formData, 'sraNumber'),
    siteName: formString(formData, 'siteName'),
    invoiceOn: formString(formData, 'invoiceOn'),
    contactEmail: formString(formData, 'contactEmail'),
    contactRole: formString(formData, 'contactRole'),
  });
  if (!parsed.success) redirect('/admin/clients/new?error=invalid');
  const d = parsed.data;
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from('organisations')
    .insert({ name: d.name, slug: d.slug, sra_number: d.sraNumber ?? null })
    .select('id')
    .single();
  if (error || !org) redirect(`/admin/clients/new?error=${error?.code === '23505' ? 'slug_taken' : 'create_failed'}`);

  const { error: siteError } = await supabase
    .from('sites')
    .insert({ org_id: org.id, name: d.siteName, invoice_on: d.invoiceOn });
  if (siteError) toClient(org.id, 'create_failed');

  try {
    await createAndSendInvite(org.id, d.contactEmail, d.contactRole);
  } catch {
    toClient(org.id, 'invite_failed');
  }
  revalidatePath('/admin');
  toClient(org.id);
}

export async function inviteToClient(formData: FormData) {
  await requireAdmin();
  const parsed = inviteSchema.safeParse({
    orgId: formString(formData, 'orgId'),
    email: formString(formData, 'email'),
    role: formString(formData, 'role'),
  });
  if (!parsed.success) return toClient(formString(formData, 'orgId'), 'invalid');
  try {
    await createAndSendInvite(parsed.data.orgId, parsed.data.email, parsed.data.role);
  } catch {
    toClient(parsed.data.orgId, 'invite_failed');
  }
  toClient(parsed.data.orgId);
}

export async function revokeInvitation(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ orgId: uuid, inviteId: uuid }).safeParse({
    orgId: formString(formData, 'orgId'),
    inviteId: formString(formData, 'inviteId'),
  });
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  await supabase.from('invitations').update({ revoked_at: new Date().toISOString() }).eq('id', parsed.data.inviteId);
  toClient(parsed.data.orgId);
}

export async function setMemberRole(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ orgId: uuid, userId: uuid, role }).safeParse({
    orgId: formString(formData, 'orgId'),
    userId: formString(formData, 'userId'),
    role: formString(formData, 'role'),
  });
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  const { error } = await supabase
    .from('memberships')
    .update({ role: parsed.data.role })
    .eq('org_id', parsed.data.orgId)
    .eq('user_id', parsed.data.userId);
  toClient(parsed.data.orgId, error ? (error.message.includes('owner') ? 'keep_owner' : 'save_failed') : undefined);
}

export async function removeClientMember(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ orgId: uuid, userId: uuid }).safeParse({
    orgId: formString(formData, 'orgId'),
    userId: formString(formData, 'userId'),
  });
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('org_id', parsed.data.orgId)
    .eq('user_id', parsed.data.userId);
  toClient(parsed.data.orgId, error ? (error.message.includes('owner') ? 'keep_owner' : 'remove_failed') : undefined);
}

export async function moveStage(formData: FormData) {
  await requireAdmin();
  const parsed = stageSchema.safeParse({
    orgId: formString(formData, 'orgId'),
    siteId: formString(formData, 'siteId'),
    stage: formString(formData, 'stage'),
  });
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_stage', { p_site: parsed.data.siteId, p_to: parsed.data.stage });
  revalidatePath('/admin');
  toClient(parsed.data.orgId, error ? 'save_failed' : undefined);
}

export async function addBuild(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = buildSchema.safeParse({
    orgId: formString(formData, 'orgId'),
    siteId: formString(formData, 'siteId'),
    url: formString(formData, 'url').trim(),
    versionLabel: formString(formData, 'versionLabel'),
    notes: formString(formData, 'notes'),
    share: formData.get('share') === 'on',
  });
  if (!parsed.success) return toClient(formString(formData, 'orgId'), 'build_failed');
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from('builds').insert({
    org_id: d.orgId,
    site_id: d.siteId,
    url: d.url,
    version_label: d.versionLabel,
    notes: d.notes ?? null,
    shared_with_client: d.share,
    created_by: viewer.userId,
  });
  revalidatePath('/admin');
  toClient(d.orgId, error ? 'build_failed' : undefined);
}

const buildRef = z.object({ orgId: uuid, buildId: uuid });

export async function setBuildShared(formData: FormData) {
  await requireAdmin();
  const parsed = buildRef.safeParse({ orgId: formString(formData, 'orgId'), buildId: formString(formData, 'buildId') });
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  await supabase
    .from('builds')
    .update({ shared_with_client: formString(formData, 'share') === 'true' })
    .eq('id', parsed.data.buildId);
  toClient(parsed.data.orgId);
}

export async function deleteBuild(formData: FormData) {
  await requireAdmin();
  const parsed = buildRef.safeParse({ orgId: formString(formData, 'orgId'), buildId: formString(formData, 'buildId') });
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  await supabase.from('builds').delete().eq('id', parsed.data.buildId);
  toClient(parsed.data.orgId);
}

// ------------------------------------------------------------------ Phase 2 ---

export async function reopenSection(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ orgId: uuid, sectionId: uuid }).safeParse({
    orgId: formString(formData, 'orgId'),
    sectionId: formString(formData, 'sectionId'),
  });
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  await supabase.rpc('reopen_section', { p_section: parsed.data.sectionId });
  revalidatePath(`/admin/clients/${parsed.data.orgId}/content`);
  redirect(`/admin/clients/${parsed.data.orgId}/content`);
}

export async function reopenBriefing(formData: FormData) {
  await requireAdmin();
  const parsed = uuid.safeParse(formString(formData, 'orgId'));
  if (!parsed.success) redirect('/admin');
  const supabase = await createClient();
  await supabase.rpc('reopen_briefing', { p_org: parsed.data });
  revalidatePath(`/admin/clients/${parsed.data}/content`);
  redirect(`/admin/clients/${parsed.data}/content`);
}
