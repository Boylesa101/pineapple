'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Mode = { kind: 'loading' } | { kind: 'enrol'; factorId: string; qr: string; secret: string } | { kind: 'verify'; factorId: string };

// Agency admins must pass a TOTP check (aal2) before any admin page or admin data is available.
export function MfaForm() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: 'loading' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal2') return router.replace('/admin');
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp.find((f) => f.status === 'verified');
      if (verified) return setMode({ kind: 'verify', factorId: verified.id });
      // Clear any half-finished enrolment, then start a new one.
      for (const f of data?.all ?? []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: enrol, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' });
      if (error || !enrol) return setError('Two-factor setup couldn’t start. Reload the page to try again.');
      const qr = enrol.totp.qr_code.startsWith('data:')
        ? enrol.totp.qr_code
        : `data:image/svg+xml;utf-8,${encodeURIComponent(enrol.totp.qr_code)}`;
      setMode({ kind: 'enrol', factorId: enrol.id, qr, secret: enrol.totp.secret });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind === 'loading') return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mode.factorId, code: code.replace(/\s/g, '') });
    setBusy(false);
    if (error) return setError('That code didn’t work. Check your authenticator app and try again.');
    router.replace('/admin');
    router.refresh();
  }

  if (mode.kind === 'loading') return <p className="small" role="status">{error ?? 'Loading…'}</p>;

  return (
    <form onSubmit={submit}>
      {mode.kind === 'enrol' && (
        <div className="card muted">
          <p style={{ marginBottom: 12 }}>Scan this with an authenticator app (such as 1Password, Google Authenticator or Authy):</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mode.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ background: '#fff' }} />
          <p className="hint">
            Can’t scan it? Enter this key instead: <code>{mode.secret}</code>
          </p>
        </div>
      )}
      {error && (
        <div className="notice err" role="alert">
          {error}
        </div>
      )}
      <div className="field">
        <label htmlFor="code">6-digit code from your authenticator app</label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
      </div>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Checking…' : mode.kind === 'enrol' ? 'Turn on two-factor and continue' : 'Verify'}
      </button>
    </form>
  );
}
