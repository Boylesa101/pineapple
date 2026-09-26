'use client';
import { useActionState } from 'react';
import { sendMagicLink, type LoginState } from './actions';
import { Submit } from '@/components/submit';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(sendMagicLink, { status: 'idle' });
  if (state.status === 'sent') {
    return (
      <div className="notice ok" role="status">
        Check your email. If you have a portal account, we’ve sent you a sign-in link. It expires in an hour.
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
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      <Submit pending="Sending…">Email me a sign-in link</Submit>
    </form>
  );
}
