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
import { EMAIL, KNOWS_ABOUT, SEO, SITE_URL, SOCIAL } from './site.config.mjs';

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
const SERVICES = get('SERVICES');

// Shell (nav, CTA banner, footer) and inline CSS from source/index.html.
const indexHtml = await read('index.html');
const inlineCss = indexHtml.match(/<style>([\s\S]*?)<\/style>/)[1];
const body = indexHtml.match(/<body>([\s\S]*?)<script /)[1];
const [navHtml, afterNav] = body.split('<main id="main"></main>');
const ctaHtml = afterNav.match(/<section class="mk-cta"[\s\S]*?<\/section>/)[0];
const footHtml = afterNav.match(/<footer[\s\S]*?<\/footer>/)[0];

// ---------------------------------------------------------------- render ---
let CSS_HREF; // set once the stylesheet bundle is written
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
    .replace('<div class="cl-grid" id="cl-grid"></div>', `<div class="cl-grid" id="cl-grid">${CLIENTS.map(clientCard).join('').replaceAll('<div class="cl-shot live">', '<div class="cl-shot live" aria-hidden="true" data-nosnippet>')}</div>`);
}

const text = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const url = r => SITE_URL + (r === 'home' ? '/' : '/' + r);
// JSON inside <script type="application/ld+json">: escape "<" so no string can close the tag.
const ldJson = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// Footer social links (only the ones set in site.config.mjs), under "Get in touch".
const SOCIAL_LINKS = [
  ['linkedin', 'brand-linkedin', 'LinkedIn'],
  ['google', 'brand-google', 'Google'],
].filter(([k]) => SOCIAL[k]);
const socialHtml = SOCIAL_LINKS.map(([k, ic, label]) => `<a class="mk-foot-social" href="${attr(SOCIAL[k])}" target="_blank" rel="noopener me"><i class="ti ti-${ic}"></i>${label}</a>`).join('');
const footWithSocial = footHtml.replace(`<a href="mailto:${EMAIL}">${EMAIL}</a></div>`, `<a href="mailto:${EMAIL}">${EMAIL}</a>${socialHtml}</div>`);
if (socialHtml && footWithSocial === footHtml) throw new Error('could not place social links in the footer');

// Structured data: who we are (every page), plus the service or breadcrumb for each page.
const ORG_ID = SITE_URL + '/#organization';
const ORG = {
  '@type': 'ProfessionalService',
  '@id': ORG_ID,
  name: 'copacetic.web',
  url: SITE_URL + '/',
  logo: SITE_URL + '/icons/icon-512.png',
  image: SITE_URL + '/og.png',
  email: EMAIL,
  description: 'Bespoke websites for law firms and legal tech. Web design, apps, AI chatbots, branding, SEO and secure UK hosting.',
  slogan: 'Websites as unique as you and your company are.',
  areaServed: { '@type': 'Country', name: 'United Kingdom' },
  knowsAbout: KNOWS_ABOUT,
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Services',
    itemListElement: SERVICES.map(([r, , name, desc]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: text(name), description: text(desc), url: url(r) } })),
  },
  ...(Object.values(SOCIAL).some(Boolean) && { sameAs: Object.values(SOCIAL).filter(Boolean) }),
};
function schema(route, title) {
  const graph = [ORG];
  if (route === 'home') graph.push({ '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL + '/', name: 'copacetic.web', publisher: { '@id': ORG_ID }, inLanguage: 'en-GB' });
  else if (route !== '404') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: url('home') },
        ...(NAVMAP[route] === 'services' ? [{ '@type': 'ListItem', position: 2, name: 'Services', item: url('services') }] : []),
        { '@type': 'ListItem', position: NAVMAP[route] === 'services' ? 3 : 2, name: title, item: url(route) },
      ],
    });
    const svc = SERVICES.find(s => s[0] === route);
    if (svc) graph.push({ '@type': 'Service', name: text(svc[2]), description: SEO[route].description, serviceType: text(svc[2]), provider: { '@id': ORG_ID }, areaServed: { '@type': 'Country', name: 'United Kingdom' }, url: url(route) });
  }
  return ldJson({ '@context': 'https://schema.org', '@graph': graph });
}

function page(route, pageHtml, { active, cta = true, scripts = [] }) {
  const seo = SEO[route] ?? { title: 'Page not found · copacetic.web', description: '' };
  const h1 = text(pageHtml.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? '');
  const eyebrow = text(pageHtml.match(/<div class="mk-eyebrow">([\s\S]*?)<\/div>/)?.[1] ?? '');
  const indexable = route !== '404';
  let nav = linkify(navHtml);
  if (active) nav = nav.replace(`<a href="${href(active)}">`, `<a href="${href(active)}" class="on">`);
  return `<!DOCTYPE html>
<html lang="en-GB"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${attr(seo.title)}</title>
${seo.description ? `<meta name="description" content="${attr(seo.description)}">\n` : ''}${indexable ? `<link rel="canonical" href="${url(route)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="copacetic.web">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="${url(route)}">
<meta property="og:title" content="${attr(route === 'home' ? seo.title : (h1 || eyebrow) + ' | copacetic.web')}">
<meta property="og:description" content="${attr(seo.description)}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="copacetic.web: websites as unique as you and your company are.">
<meta name="twitter:card" content="summary_large_image">
` : '<meta name="robots" content="noindex">\n'}<meta name="theme-color" content="#1c1917">
<meta name="format-detection" content="telephone=no">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preload" href="/fonts/cormorant-garamond-10.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/dm-sans-2.woff2" as="font" type="font/woff2" crossorigin>
${route === 'home' ? '<link rel="preload" href="/fonts/cormorant-garamond-italic-5.woff2" as="font" type="font/woff2" crossorigin>\n' : ''}<link rel="preload" href="/fonts/tabler-icons.woff2?v2.47.0" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${CSS_HREF}">
${schema(route, eyebrow)}
</head>
<body>
${nav}<main id="main"><section class="page on" data-screen-label="${route}">${linkify(fill(pageHtml))}</section></main>
${cta ? linkify(ctaHtml) + '\n' : ''}${linkify(footWithSocial)}
${[...scripts, '/js/site.js'].map(s => `<script src="${s}" defer></script>`).join('\n')}
</body></html>
`;
}

// ----------------------------------------------------------------- write ---
await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'css'), { recursive: true });
await mkdir(join(OUT, 'js'), { recursive: true });
await cp(join(ROOT, 'public'), OUT, { recursive: true });
// One stylesheet, in the same cascade order as source/index.html, then the responsive fixes.
const cssParts = [
  ['fonts/fonts.css', await readFile(join(ROOT, 'public/fonts/fonts.css'), 'utf8')],
  ['fonts/tabler-icons.min.css', await readFile(join(ROOT, 'public/fonts/tabler-icons.min.css'), 'utf8')],
  ...(await Promise.all(['site.css', 'site-2.css', 'sites.css', 'device.css'].map(async f => [`source/${f}`, await read(f)]))),
  ['source/index.html <style>', inlineCss],
  ['src/responsive.css', await readFile(join(ROOT, 'src/responsive.css'), 'utf8')],
];
const cssBundle = cssParts.map(([name, css]) => `/* ${name} */\n${css.trim()}\n`).join('\n');
CSS_HREF = `/css/site.${createHash('sha256').update(cssBundle).digest('hex').slice(0, 10)}.css`;
await writeFile(join(OUT, CSS_HREF), cssBundle);
await rm(join(OUT, 'fonts/fonts.css'));
await rm(join(OUT, 'fonts/tabler-icons.min.css'));
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

// Sitemap and robots.txt, so search engines find every page.
const today = new Date().toISOString().slice(0, 10);
const priority = r => (r === 'home' ? '1.0' : ['legal', 'web-design', 'ai', 'branding', 'solicitors', 'services'].includes(r) ? '0.9' : '0.7');
await writeFile(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ORDER.map(r => `  <url><loc>${url(r)}</loc><lastmod>${today}</lastmod><priority>${priority(r)}</priority></url>`).join('\n')}
</urlset>
`);
await writeFile(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// ------------------------------------------------------------ icon check ---
// public/fonts holds a cut-down Tabler font. Fail loudly if a page uses an icon it lacks.
if (!process.env.SKIP_ICON_CHECK) {
  const iconCss = await readFile(join(ROOT, 'public/fonts/tabler-icons.min.css'), 'utf8').catch(() => '');
  const used = new Set();
  for (const f of await readdir(OUT)) {
    if (f.endsWith('.html')) for (const m of (await readFile(join(OUT, f), 'utf8')).matchAll(/\bti-([a-z0-9-]+)/g)) used.add(m[1]);
  }
  for (const f of ['sites.js', 'device.js']) for (const m of (await readFile(join(OUT, 'js', f), 'utf8')).matchAll(/\bti-([a-z0-9-]+)/g)) used.add(m[1]);
  const missing = [...used].filter(n => !iconCss.includes(`.ti-${n}:before`));
  if (missing.length) throw new Error(`icons missing from the subset font: ${missing.join(', ')}. Run: SKIP_ICON_CHECK=1 npm run build && python3 scripts/subset-icons.py && npm run build`);
}

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
  .filter(u => !u.endsWith('.html') && !['/og.png', '/sitemap.xml', '/robots.txt', '/favicon.ico'].includes(u))
  .map(u => (u === '/fonts/tabler-icons.woff2' ? '/fonts/tabler-icons.woff2?v2.47.0' : u));
const sw = (await readFile(join(ROOT, 'src/sw.js'), 'utf8'))
  .replace('__VERSION__', version)
  .replace('__PAGES__', JSON.stringify(pageUrls))
  .replace('__ASSETS__', JSON.stringify(assetUrls));
await writeFile(join(OUT, 'sw.js'), sw);

let bytes = 0;
for (const f of files) bytes += (await stat(f)).size;
console.log(`built ${ORDER.length + 1} pages, ${files.length} files (${(bytes / 1024).toFixed(0)} KB), sw ${version}`);
