// Static build for copacetic.web.
//
// source/ is the design and the single source of truth. This script runs the
// source page scripts (pages-1..4.js, sites.js, app.js) in a sandbox, takes the
// PAGES / CLIENTS / SERVER / SITES they define, and writes one real HTML file
// per route into dist/. No copy is retyped here: every string comes from source/.
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLIENT_IMAGES } from './scripts/client-images.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'source');
const OUT = join(ROOT, 'dist');
const read = f => readFile(join(SRC, f), 'utf8');

// ---------------------------------------------------------------- source ---
let sitesJs = await read('sites.js');
for (const [remote, local] of Object.entries(CLIENT_IMAGES)) {
  if (!sitesJs.includes(remote)) throw new Error(`sites.js no longer contains ${remote}`);
  sitesJs = sitesJs.replaceAll(remote, local);
}
if (sitesJs.includes('wixstatic.com')) throw new Error('sites.js has a wixstatic URL with no local copy');

const SCRIPTS = [
  ['pages-1.js', await read('pages-1.js')],
  ['pages-2.js', await read('pages-2.js')],
  ['pages-3.js', await read('pages-3.js')],
  ['pages-4.js', await read('pages-4.js')],
  ['sites.js', sitesJs],
  ['device.js', await read('device.js')],
  ['app.js', await read('app.js')],
];

// Just enough of a browser for app.js's route() to run once without effect.
const stubEl = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll: () => [] };
const sandbox = {
  console,
  location: { hash: '' },
  addEventListener() {},
  scrollTo() {},
  requestAnimationFrame() {},
  document: {
    getElementById: id => (['main', 'cta', 'nav', 'burger'].includes(id) ? stubEl : null),
    querySelectorAll: () => [],
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const [name, code] of SCRIPTS) vm.runInContext(code, sandbox, { filename: name });
const get = expr => vm.runInContext(expr, sandbox);
const PAGES = get('PAGES');
const ORDER = get('ORDER');
const NAVMAP = get('NAVMAP');
const CLIENTS = get('CLIENTS');
const SERVER = get('SERVER');
const clientCard = get('clientCard');
const esc = get('esc');
const heroFn = get('hero');

// Shell (nav, CTA banner, footer) and inline CSS from source/index.html.
const indexHtml = await read('index.html');
const inlineCss = indexHtml.match(/<style>([\s\S]*?)<\/style>/)[1];
const body = indexHtml.match(/<body>([\s\S]*?)<script /)[1];
const [navHtml, afterNav] = body.split('<main id="main"></main>');
const ctaHtml = afterNav.match(/<section class="mk-cta"[\s\S]*?<\/section>/)[0];
const footHtml = afterNav.match(/<footer[\s\S]*?<\/footer>/)[0];

// ---------------------------------------------------------------- render ---
const href = r => (r === 'home' ? '/' : '/' + r);
const linkify = html =>
  html
    .replace(/href="#([a-z-]+)"/g, (m, r) => (ORDER.includes(r) ? `href="${href(r)}"` : m))
    .replaceAll('src="lutey/mood2.png"', 'src="/lutey/mood2.png"');

// The same fills route() does after injecting a page.
function fill(html) {
  return html
    .replace('<div class="mk-trust-row" id="trust"></div>', `<div class="mk-trust-row" id="trust">${CLIENTS.map(c => `<span>${esc(c[0])}</span>`).join('')}</div>`)
    .replaceAll('<div class="mk-spot-art" id="server-card"></div>', `<div class="mk-spot-art" id="server-card">${SERVER}</div>`)
    .replace('<div class="cl-grid" id="cl-grid"></div>', `<div class="cl-grid" id="cl-grid">${CLIENTS.map(clientCard).join('')}</div>`);
}

const text = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function meta(route, pageHtml) {
  const eyebrow = pageHtml.match(/<div class="mk-eyebrow">([\s\S]*?)<\/div>/)?.[1];
  const p = pageHtml.match(/<div class="mk-phero">[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1] ?? pageHtml.match(/<h1>[\s\S]*?<\/h1>\s*<p>([\s\S]*?)<\/p>/)?.[1];
  const title = route === 'home' ? 'copacetic.web' : `${text(eyebrow)} · copacetic.web`;
  return { title, description: p ? text(p) : '' };
}
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function page(route, pageHtml, { active, cta = true, scripts = [] }) {
  const { title, description } = meta(route, pageHtml);
  let nav = linkify(navHtml);
  if (active) nav = nav.replace(`<a href="${href(active)}">`, `<a href="${href(active)}" class="on">`);
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${description ? `<meta name="description" content="${attr(description)}">\n` : ''}<meta name="theme-color" content="#1c1917">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" href="/icons/favicon-48.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preload" href="/fonts/tabler-icons.woff2?v2.47.0" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css">
<link rel="stylesheet" href="/fonts/tabler-icons.min.css">
<link rel="stylesheet" href="/css/site.css">
<link rel="stylesheet" href="/css/site-2.css">
<link rel="stylesheet" href="/css/sites.css">
<link rel="stylesheet" href="/css/device.css">
<link rel="stylesheet" href="/css/index.css">
</head>
<body>
${nav}<main id="main"><section class="page on" data-screen-label="${route}">${linkify(fill(pageHtml))}</section></main>
${cta ? linkify(ctaHtml) + '\n' : ''}${linkify(footHtml)}
${[...scripts, '/js/site.js'].map(s => `<script src="${s}"></script>`).join('\n')}
</body></html>
`;
}

// ----------------------------------------------------------------- write ---
await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'css'), { recursive: true });
await mkdir(join(OUT, 'js'), { recursive: true });
await cp(join(ROOT, 'public'), OUT, { recursive: true });
for (const f of ['site.css', 'site-2.css', 'sites.css', 'device.css']) await cp(join(SRC, f), join(OUT, 'css', f));
await writeFile(join(OUT, 'css/index.css'), `/* inline <style> from source/index.html */\n${inlineCss}\n`);
await writeFile(join(OUT, 'js/sites.js'), sitesJs);
await cp(join(SRC, 'device.js'), join(OUT, 'js/device.js'));
await cp(join(ROOT, 'src/site.js'), join(OUT, 'js/site.js'));

for (const r of ORDER) {
  if (!PAGES[r]) throw new Error(`PAGES.${r} is missing`);
  const html = page(r, PAGES[r], {
    active: NAVMAP[r] || r,
    cta: r !== 'contact',
    scripts: r === 'home' ? ['/js/sites.js', '/js/device.js'] : [],
  });
  await writeFile(join(OUT, r === 'home' ? 'index.html' : `${r}.html`), html);
}

// 404: a page hero, like every other page.
const notFound = heroFn('404', 'Page not found.', 'The page you were looking for doesn\'t exist. <a href="#home">Back to the home page</a>.');
await writeFile(join(OUT, '404.html'), page('404', notFound, {}));

// --------------------------------------------------------- service worker ---
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const files = (await walk(OUT)).filter(f => !/(^|\/)(sw\.js)$/.test(f));
const hash = createHash('sha256');
for (const f of files.sort()) hash.update(relative(OUT, f)).update(await readFile(f));
const version = hash.digest('hex').slice(0, 12);
const pageUrls = ORDER.map(href).concat('/404');
const assetUrls = files
  .map(f => '/' + relative(OUT, f).split('\\').join('/'))
  .filter(u => !u.endsWith('.html'))
  .map(u => (u === '/fonts/tabler-icons.woff2' ? '/fonts/tabler-icons.woff2?v2.47.0' : u));
const sw = (await readFile(join(ROOT, 'src/sw.js'), 'utf8'))
  .replace('__VERSION__', version)
  .replace('__PAGES__', JSON.stringify(pageUrls))
  .replace('__ASSETS__', JSON.stringify(assetUrls));
await writeFile(join(OUT, 'sw.js'), sw);

let bytes = 0;
for (const f of files) bytes += (await stat(f)).size;
console.log(`built ${ORDER.length + 1} pages, ${files.length} files (${(bytes / 1024).toFixed(0)} KB), sw ${version}`);
