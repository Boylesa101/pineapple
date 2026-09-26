'use client';
import { useActionState } from 'react';
import { sendInviteSignIn, type InviteState } from './actions';
import { Submit } from '@/components/submit';

export function InviteSignIn({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState<InviteState, FormData>(sendInviteSignIn, { status: 'idle' });
  if (state.status === 'sent') {
    return (
      <div className="notice ok" role="status">
        We’ve emailed a secure link to <strong>{email}</strong>. Open it on this device to finish joining.
      </div>
    );
  }
  return (
    <form action={action}>
      {state.status === 'error' && (
        <div className="notice err" role="alert">
          {state.message}
        </div>
      )}
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="email">Your email</label>
        <input id="email" value={email} readOnly aria-readonly="true" />
        <p className="hint">The invitation is for this address. We’ll email it a sign-in link.</p>
      </div>
      <Submit pending="Sending…">Email me a link to join</Submit>
    </form>
  );
}
