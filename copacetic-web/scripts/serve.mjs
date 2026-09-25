// Local preview of dist/ that behaves like Vercel: clean URLs (/pricing -> pricing.html),
// the headers from vercel.json, and the real api/contact.js. Without RESEND_API_KEY set,
// the call to Resend is intercepted and the email is printed here instead of sent.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
};

const config = JSON.parse(await readFile(join(ROOT, 'vercel.json'), 'utf8'));
const headerRules = config.headers.map(h => [new RegExp(`^${h.source}$`), h.headers]);
const headersFor = path => Object.fromEntries(headerRules.filter(([re]) => re.test(path)).flatMap(([, hs]) => hs.map(h => [h.key, h.value])));

if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = 'dev';
  process.env.CONTACT_FROM ||= 'copacetic.web <dev@localhost>';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith('https://api.resend.com/')) {
      console.log('[contact] would send:', opts.body);
      return new Response('{"id":"dev"}', { status: 200 });
    }
    return realFetch(url, opts);
  };
}
const contact = await import('../api/contact.js');

const tryRead = async p => { try { return await readFile(p); } catch { return null; } };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/contact') {
    if (req.method !== 'POST') return res.writeHead(405, { Allow: 'POST' }).end();
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: 'POST', headers: { ...req.headers, 'x-real-ip': req.socket.remoteAddress }, body: Buffer.concat(chunks) });
    const out = await contact.POST(request);
    res.writeHead(out.status, { ...headersFor(url.pathname), ...Object.fromEntries(out.headers) }).end(await out.text());
    return;
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '').replace(/\/$/, '') || '/';
  const candidates = path === '/' ? ['index.html'] : [path, `${path}.html`, `${path}/index.html`];
  for (const c of candidates) {
    const data = await tryRead(join(DIST, c));
    if (data) {
      res.writeHead(200, { ...headersFor(path), 'Content-Type': TYPES[extname(c)] || 'application/octet-stream' }).end(data);
      return;
    }
  }
  res.writeHead(404, { ...headersFor(path), 'Content-Type': TYPES['.html'] }).end(await tryRead(join(DIST, '404.html')));
}).listen(PORT, () => console.log(`copacetic.web preview: http://localhost:${PORT}`));
