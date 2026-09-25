// Cloudflare Pages Function: POST /api/contact
// Emails contact-form submissions to Andrew@copacetic.web through Resend (https://resend.com).
//
// Environment (Pages project → Settings → Variables and secrets):
//   RESEND_API_KEY  secret, required
//   CONTACT_FROM    required, a sender on a domain verified in Resend, e.g. "copacetic.web <website@copacetic.web>"
//   CONTACT_TO      optional, defaults to Andrew@copacetic.web

const TO = 'Andrew@copacetic.web';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const name = clip(data.name, 200);
  const company = clip(data.company, 200);
  const email = clip(data.email, 320);
  const message = clip(data.message, 5000);
  const interests = Array.isArray(data.interests) ? data.interests.slice(0, 20).map(i => clip(i, 60)).filter(Boolean) : [];

  if (!name || !EMAIL.test(email)) return json({ error: 'Name and a valid email are required' }, 422);
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM) return json({ error: 'Email is not configured' }, 503);

  const text = [
    `Name: ${name}`,
    `Company: ${company || '-'}`,
    `Email: ${email}`,
    `Interested in: ${interests.join(', ') || '-'}`,
    '',
    message || '(no message)',
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO || TO],
      reply_to: email,
      subject: `Project enquiry from ${name}${company ? ` (${company})` : ''}`.replace(/[\r\n]+/g, ' '),
      text,
    }),
  });

  if (!res.ok) return json({ error: 'Could not send' }, 502);
  return json({ ok: true }, 200);
}
