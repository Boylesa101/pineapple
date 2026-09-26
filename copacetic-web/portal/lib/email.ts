import 'server-only';
import { env } from '@/lib/env';

type Mail = { to: string; subject: string; text: string };

// Sends through Resend when configured. Returns false (never throws) so callers can fall back
// to showing the link on screen.
export async function sendEmail({ to, subject, text }: Mail): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: subject.replace(/\s+/g, ' '), text }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function inviteEmail(orgName: string, link: string, role: string) {
  return {
    subject: `You're invited to the ${orgName} website portal`,
    text: [
      `You've been invited to join ${orgName} on the copacetic.web client portal as ${role}.`,
      '',
      'Use this link to accept. It works once and expires in 7 days:',
      link,
      '',
      'In the portal you can complete your briefing, send your content and review previews of your new website.',
      '',
      'If you weren’t expecting this, you can ignore this email.',
    ].join('\n'),
  };
}
