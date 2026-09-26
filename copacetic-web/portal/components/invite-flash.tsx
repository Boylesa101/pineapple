'use client';
import { useEffect, useState } from 'react';

// Shows the invitation link once after it's created, so it can be copied if email isn't set up.
export function InviteFlash({ email, link, emailed }: { email: string; link: string; emailed: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    // The flash cookie is single use: clear it now it has been shown.
    document.cookie = 'invite_link=; Max-Age=0; path=/';
  }, []);
  return (
    <div className={`notice ${emailed ? 'ok' : 'info'}`} role="status">
      <p style={{ marginBottom: 8 }}>
        {emailed ? (
          <>Invitation emailed to <strong>{email}</strong>. You can also send them this link:</>
        ) : (
          <>Invitation created for <strong>{email}</strong>. Email isn’t set up yet, so send them this link yourself:</>
        )}
      </p>
      <div className="copy">
        <input readOnly value={link} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="hint">It works once and expires in 7 days.</p>
    </div>
  );
}
