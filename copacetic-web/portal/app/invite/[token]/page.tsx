import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Submit } from '@/components/submit';
import { getViewer } from '@/lib/auth';
import { ROLE_HELP, ROLE_LABELS } from '@/lib/stages';
import { createClient } from '@/lib/supabase/server';
import { acceptInvite } from './actions';
import { InviteSignIn } from './invite-sign-in';

export const metadata: Metadata = { title: 'Invitation' };

// Only messages the database itself raises are shown; anything else in the URL is ignored.
const KNOWN_ERRORS = new Set([
  'This invitation is not valid',
  'This invitation has already been used',
  'This invitation has expired',
  'This invitation was sent to a different email address',
]);

const STATUS_TEXT = {
  accepted: 'This invitation has already been used. Sign in to reach the portal.',
  expired: 'This invitation has expired. Ask whoever invited you to send a new one.',
  revoked: 'This invitation has been withdrawn. Ask whoever invited you to send a new one.',
} as const;

export default async function InvitePage(props: PageProps<'/invite/[token]'>) {
  const { token } = await props.params;
  const { error } = await props.searchParams;
  const supabase = await createClient();
  const { data } = /^[0-9a-f]{64}$/.test(token)
    ? await supabase.rpc('invitation_preview', { p_token: token })
    : { data: null };
  const invite = data?.[0];
  const viewer = await getViewer();

  return (
    <>
      <Header email={viewer?.email} />
      <main className="narrow">
        <div className="eyebrow">Invitation</div>
        {!invite ? (
          <>
            <h1>Invitation not found</h1>
            <p className="lede">Check you used the whole link from the email.</p>
          </>
        ) : invite.status !== 'pending' ? (
          <>
            <h1>{invite.org_name}</h1>
            <p className="lede">{STATUS_TEXT[invite.status as keyof typeof STATUS_TEXT]}</p>
            <Link className="btn ghost" href="/login">
              Sign in
            </Link>
          </>
        ) : (
          <>
            <h1>Join {invite.org_name}</h1>
            <p className="lede">
              You’re invited as <strong>{ROLE_LABELS[invite.role as keyof typeof ROLE_LABELS]}</strong>:{' '}
              {ROLE_HELP[invite.role as keyof typeof ROLE_HELP].toLowerCase()}
            </p>
            {typeof error === 'string' && KNOWN_ERRORS.has(error) && (
              <div className="notice err" role="alert">
                {error}
              </div>
            )}
            {!viewer ? (
              <InviteSignIn token={token} email={invite.email} />
            ) : viewer.email === invite.email ? (
              <form action={acceptInvite}>
                <input type="hidden" name="token" value={token} />
                <Submit pending="Joining…">Accept and join</Submit>
              </form>
            ) : (
              <div className="notice info">
                You’re signed in as <strong>{viewer.email}</strong>, but this invitation is for{' '}
                <strong>{invite.email}</strong>. Sign out, then open the link again.
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
