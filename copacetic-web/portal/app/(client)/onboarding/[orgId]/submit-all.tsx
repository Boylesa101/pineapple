'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitAll } from '../actions';

export function SubmitAll({ orgId, canSubmit }: { orgId: string; canSubmit: boolean }) {
  const [pending, start] = useTransition();
  const [blocking, setBlocking] = useState<string[] | null>(null);
  const router = useRouter();
  if (!canSubmit) {
    return <p className="small">When everything’s ready, an owner or approver at your firm submits it all to us.</p>;
  }
  return (
    <div>
      {blocking && (
        <div className="notice err" role="alert">
          <p style={{ marginBottom: 6 }}>Not quite ready. Still to do:</p>
          <ul style={{ paddingLeft: 18 }}>{blocking.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}
      <button
        className="btn"
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm('Submit everything? Your content becomes read-only while we build your site. We can reopen any section if you need to change it.')) return;
          start(async () => {
            const res = await submitAll(orgId);
            if (res.ok) router.push('/?submitted=1');
            else setBlocking(res.blocking ?? ['Submission failed. Try again.']);
          });
        }}
      >
        {pending ? 'Submitting…' : 'Submit everything to copacetic.web'}
      </button>
    </div>
  );
}
