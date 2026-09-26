'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireOrgRole } from '@/lib/auth';
import { createAndSendInvite } from '@/lib/invitations';
import { createClient } from '@/lib/supabase/server';
import { formString, inviteSchema, role, uuid } from '@/lib/validation';
import { z } from 'zod';

import type { MessageCode } from '@/lib/messages';

const back = (code?: MessageCode) => redirect(`/team${code ? `?error=${code}` : ''}`);

export async function inviteMember(formData: FormData) {
  const parsed = inviteSchema.safeParse({
    orgId: formString(formData, 'orgId'),
    email: formString(formData, 'email'),
    role: formString(formData, 'role'),
  });
  if (!parsed.success) return back('invalid');
  await requireOrgRole(parsed.data.orgId, ['owner']);
  try {
    await createAndSendInvite(parsed.data.orgId, parsed.data.email, parsed.data.role);
  } catch {
    return back('invite_failed');
  }
  revalidatePath('/team');
  back();
}

export async function changeRole(formData: FormData) {
  const parsed = z
    .object({ orgId: uuid, userId: uuid, role })
    .safeParse({ orgId: formString(formData, 'orgId'), userId: formString(formData, 'userId'), role: formString(formData, 'role') });
  if (!parsed.success) return back();
  await requireOrgRole(parsed.data.orgId, ['owner']);
  const supabase = await createClient();
  const { error } = await supabase
    .from('memberships')
    .update({ role: parsed.data.role })
    .eq('org_id', parsed.data.orgId)
    .eq('user_id', parsed.data.userId);
  if (error) return back(error.message.includes('owner') ? 'keep_owner' : 'save_failed');
  revalidatePath('/team');
  back();
}

export async function removeMember(formData: FormData) {
  const parsed = z
    .object({ orgId: uuid, userId: uuid })
    .safeParse({ orgId: formString(formData, 'orgId'), userId: formString(formData, 'userId') });
  if (!parsed.success) return back();
  await requireOrgRole(parsed.data.orgId, ['owner']);
  const supabase = await createClient();
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('org_id', parsed.data.orgId)
    .eq('user_id', parsed.data.userId);
  if (error) return back(error.message.includes('owner') ? 'keep_owner' : 'remove_failed');
  revalidatePath('/team');
  back();
}

export async function revokeInvite(formData: FormData) {
  const parsed = z
    .object({ orgId: uuid, inviteId: uuid })
    .safeParse({ orgId: formString(formData, 'orgId'), inviteId: formString(formData, 'inviteId') });
  if (!parsed.success) return back();
  await requireOrgRole(parsed.data.orgId, ['owner']);
  const supabase = await createClient();
  await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.inviteId)
    .eq('org_id', parsed.data.orgId);
  revalidatePath('/team');
  back();
}
