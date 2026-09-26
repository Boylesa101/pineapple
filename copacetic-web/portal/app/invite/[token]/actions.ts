'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { portalUrl } from '@/lib/env';
import { formString } from '@/lib/validation';

export type InviteState = { status: 'idle' | 'sent' | 'error'; message?: string };

const TOKEN = /^[0-9a-f]{64}$/;

// Not signed in yet: email a sign-in link to the invited address (this creates the account).
export async function sendInviteSignIn(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const token = formString(formData, 'token');
  if (!TOKEN.test(token)) return { status: 'error', message: 'This invitation link is not valid.' };

  const supabase = await createClient();
  const { data } = await supabase.rpc('invitation_preview', { p_token: token });
  const invite = data?.[0];
  if (!invite || invite.status !== 'pending') {
    return { status: 'error', message: 'This invitation is no longer valid. Ask for a new one.' };
  }
  // The address comes from the invitation, never from the form.
  const { error } = await supabase.auth.signInWithOtp({
    email: invite.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: portalUrl(`/auth/callback?next=${encodeURIComponent(`/invite/${token}`)}`),
    },
  });
  if (error) {
    return {
      status: 'error',
      message: error.status === 429 ? 'Too many attempts. Wait a minute, then try again.' : 'We couldn’t send the email. Try again shortly.',
    };
  }
  return { status: 'sent' };
}

// Signed in as the invited person: join the firm.
export async function acceptInvite(formData: FormData) {
  const token = formString(formData, 'token');
  if (!TOKEN.test(token)) redirect('/');
  const supabase = await createClient();
  const { error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);  // page shows known messages only
  redirect('/?welcome=1');
}
