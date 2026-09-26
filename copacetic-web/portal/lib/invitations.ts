import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { portalUrl } from '@/lib/env';
import { inviteEmail, sendEmail } from '@/lib/email';
import { ROLE_LABELS } from '@/lib/stages';
import type { Role } from '@/lib/auth';

// Mint an invitation (the database checks the caller may invite into this firm), email it,
// and leave the link in a short-lived cookie so the page can offer it for copying.
export async function createAndSendInvite(orgId: string, email: string, role: Role) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_invitation', { p_org: orgId, p_email: email, p_role: role });
  if (error || !data?.[0]) throw new Error('Could not create the invitation.');
  const link = portalUrl(`/invite/${data[0].token}`);

  const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).single();
  const emailed = await sendEmail({ to: email, ...inviteEmail(org?.name ?? 'your firm', link, ROLE_LABELS[role].toLowerCase()) });

  (await cookies()).set('invite_link', JSON.stringify({ email, link, emailed }), {
    // Readable by the page so it can clear itself after showing once; it only holds the on-screen link.
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  });
  return { link, emailed };
}

// Read (once) the link left by createAndSendInvite.
export async function takeInviteFlash(): Promise<{ email: string; link: string; emailed: boolean } | null> {
  const store = await cookies();
  const raw = store.get('invite_link')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
