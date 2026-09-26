'use server';
import { createClient } from '@/lib/supabase/server';
import { portalUrl } from '@/lib/env';
import { safeNext } from '@/lib/auth';
import { email as emailSchema, formString } from '@/lib/validation';

export type LoginState = { status: 'idle' | 'sent' | 'error'; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formString(formData, 'email'));
  if (!parsed.success) return { status: 'error', message: 'Enter a valid email address.' };
  const next = safeNext(formString(formData, 'next'));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      // Accounts are only created from an invitation, never from the login page.
      shouldCreateUser: false,
      emailRedirectTo: portalUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
    },
  });
  if (error?.status === 429) {
    return { status: 'error', message: 'Too many attempts. Wait a minute, then try again.' };
  }
  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  return { status: 'sent' };
}
