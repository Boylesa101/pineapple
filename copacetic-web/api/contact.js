// Vercel Function: POST /api/contact
// Emails contact-form submissions to Andrew@copacetic.web through Resend (https://resend.com).
//
// Environment (Vercel project → Settings → Environment Variables):
//   RESEND_API_KEY  required
//   CONTACT_FROM    required, a sender on a domain verified in Resend, e.g. "copacetic.web <website@copacetic.web>"
//   CONTACT_TO      optional, defaults to Andrew@copacetic.web

const TO = 'Andrew@copacetic.web';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = clip(data.name, 200);
  const company = clip(data.company, 200);
  const email = clip(data.email, 320);
  const message = clip(data.message, 5000);
  const interests = Array.isArray(data.interests) ? data.interests.slice(0, 20).map(i => clip(i, 60)).filter(Boolean) : [];

  if (!name || !EMAIL.test(email)) return Response.json({ error: 'Name and a valid email are required' }, { status: 422 });
  const { RESEND_API_KEY, CONTACT_FROM, CONTACT_TO } = process.env;
  if (!RESEND_API_KEY || !CONTACT_FROM) return Response.json({ error: 'Email is not configured' }, { status: 503 });

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
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: [CONTACT_TO || TO],
      reply_to: email,
      subject: `Project enquiry from ${name}${company ? ` (${company})` : ''}`.replace(/[\r\n]+/g, ' '),
      text,
    }),
  });

  if (!res.ok) return Response.json({ error: 'Could not send' }, { status: 502 });
  return Response.json({ ok: true });
}
