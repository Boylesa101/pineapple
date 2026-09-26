// Vercel Function: POST /api/contact
// Emails contact-form submissions to Andrew@copacetic.web through Resend (https://resend.com).
//
// Environment (Vercel project → Settings → Environment Variables):
//   RESEND_API_KEY  required
//   CONTACT_FROM    required, a sender on a domain verified in Resend, e.g. "copacetic.web <website@copacetic.web>"
//   CONTACT_TO      optional, defaults to Andrew@copacetic.web
//
// Abuse protection, in order: JSON-only + same-origin (blocks cross-site form posts),
// 16 KB body cap, a per-IP rate limit, and a honeypot + minimum fill time for bots.
// The rate limit lives in the function instance's memory, so it is best-effort; add a
// Vercel Firewall rate-limit rule on /api/contact for a hard limit (see README).

const TO = 'Andrew@copacetic.web';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 16 * 1024;
const LIMIT = 5; // submissions per IP...
const WINDOW_MS = 10 * 60 * 1000; // ...per 10 minutes
const MIN_FILL_MS = 3000; // humans take longer than this to fill the form

const hits = new Map(); // ip -> timestamps
const clip = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n) : '');
const reply = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
  return recent.length > LIMIT;
}

export async function POST(request) {
  // Same-origin JSON only. A cross-site page can't send application/json without a
  // CORS preflight, which this endpoint never approves.
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return reply({ error: 'Unsupported content type' }, 415);
  }
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host')) return reply({ error: 'Forbidden' }, 403);

  const ip = (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return reply({ error: 'Too many requests' }, 429);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return reply({ error: 'Too large' }, 413);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return reply({ error: 'Invalid JSON' }, 400);
  }
  if (!data || typeof data !== 'object') return reply({ error: 'Invalid JSON' }, 400);

  // Bots: fill the hidden field, or submit instantly. Pretend it worked.
  if (clip(data.website, 200) || !(Number(data.elapsed) >= MIN_FILL_MS)) return reply({ ok: true });

  const name = clip(data.name, 200);
  const company = clip(data.company, 200);
  const email = clip(data.email, 320);
  const message = clip(data.message, 5000);
  const interests = Array.isArray(data.interests) ? data.interests.slice(0, 20).map(i => clip(i, 60)).filter(Boolean) : [];

  if (!name || !EMAIL.test(email)) return reply({ error: 'Name and a valid email are required' }, 422);
  const { RESEND_API_KEY, CONTACT_FROM, CONTACT_TO } = process.env;
  if (!RESEND_API_KEY || !CONTACT_FROM) return reply({ error: 'Email is not configured' }, 503);

  const text = [
    `Name: ${name}`,
    `Company: ${company || '-'}`,
    `Email: ${email}`,
    `Interested in: ${interests.join(', ') || '-'}`,
    '',
    message || '(no message)',
  ].join('\n');

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO || TO],
        reply_to: email,
        subject: `Project enquiry from ${name}${company ? ` (${company})` : ''}`.replace(/\s+/g, ' ').slice(0, 250),
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return reply({ error: 'Could not send' }, 502);
  }

  if (!res.ok) return reply({ error: 'Could not send' }, 502);
  return reply({ ok: true });
}
