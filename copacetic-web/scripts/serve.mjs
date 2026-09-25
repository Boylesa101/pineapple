// Local preview of dist/ with Cloudflare Pages-style clean URLs (/pricing -> pricing.html).
// POST /api/contact is stubbed: it logs the submission instead of sending email.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../dist');
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const tryRead = async p => { try { return await readFile(p); } catch { return null; } };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/contact' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    console.log('[contact]', body);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
    return;
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '').replace(/\/$/, '') || '/';
  const candidates = path === '/' ? ['index.html'] : [path, `${path}.html`, `${path}/index.html`];
  for (const c of candidates) {
    const data = await tryRead(join(DIST, c));
    if (data) {
      res.writeHead(200, { 'Content-Type': TYPES[extname(c)] || 'application/octet-stream' }).end(data);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(await tryRead(join(DIST, '404.html')));
}).listen(PORT, () => console.log(`copacetic.web preview: http://localhost:${PORT}`));
