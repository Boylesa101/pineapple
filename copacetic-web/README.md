# copacetic.web

The copacetic.web marketing site, ported exactly from the finished design. It is a static site with one page per route, runs as a PWA, and deploys to Vercel.

Read `CLAUDE.md` (the fidelity rules) before changing anything.

## Layout

| Path | What it is |
|---|---|
| `source/` | The design, unpacked from `reference/copacetic.web (single file).html`. **This is the source of truth and the build reads it directly.** Edit copy here. |
| `reference/` | The original single-file design, plus the original build prompt. Open the HTML in a browser to compare. |
| `build.mjs` | Runs the `source/` page scripts in a sandbox and writes `dist/<route>.html` for every route. It retypes no copy. |
| `site.config.mjs` | **Settings you edit:** the public URL, LinkedIn and Google Business Profile links, and each page's search title and description. |
| `src/site.js` | Browser runtime: burger menu, device showcase mount, contact chips and form (with anti-bot checks), service worker registration. |
| `src/responsive.css` | Mobile fixes layered over the source CSS (loaded last). Desktop above 980px is unchanged. |
| `src/sw.js` | Service worker template. The build fills in the page and asset lists and a content hash. |
| `public/` | Self-hosted fonts (Cormorant Garamond, DM Sans, DM Mono, and the site's 49 Tabler icons), the "c" favicon, PWA icons made from `lutey/mood2.png`, the social share image `og.png`, the manifest, and `clients/` (the mock-up photos). |
| `vendor/` | The full Tabler Icons 2.47.0 webfont; `scripts/subset-icons.py` cuts it down to the icons in use. Not deployed. |
| `api/contact.js` | Vercel Function that emails form submissions to Andrew@copacetic.web through Resend. |
| `vercel.json` | Vercel settings: build command, `dist` output, clean URLs (`/pricing` serves `pricing.html`) and security/cache headers. |

Routes: `/`, `/services`, `/web-design`, `/apps`, `/ai`, `/branding`, `/solicitors`, `/seo`, `/social`, `/analytics`, `/hosting`, `/legal`, `/pricing`, `/clients`, `/about`, `/contact`. Any other path gets `404.html`, which uses the page-hero style.

## Commands

```bash
cd copacetic-web
npm run fetch:images   # once: downloads the Honest Coffee / Taylor Rose photos into public/clients/
npm run build          # writes dist/
npm run preview        # http://localhost:4321, like Vercel: clean URLs, vercel.json headers, the real api/contact.js (emails are printed, not sent)
npm run deploy         # vercel deploy --prod (Vercel runs `node build.mjs` itself, per vercel.json)
python3 scripts/subset-icons.py   # only when a page starts using a new Tabler icon; the build tells you
```

The build needs no dependencies, only Node 20 or later.

## Social links

Add your profile URLs to `SOCIAL` in `site.config.mjs`:

```js
export const SOCIAL = {
  linkedin: 'https://www.linkedin.com/company/…',
  google: 'https://g.page/r/…', // Google Business Profile → Share → copy link
};
```

Each one set appears in the footer under "Get in touch" (with its icon), and is added to the structured data as `sameAs`. That link tells Google your LinkedIn and Business Profile belong to the site, which helps the Business Profile show up alongside it. Empty ones are left out.

## Mobile

The design's own breakpoints (980px, 620px and 861–980px) are unchanged. `src/responsive.css` fixes what the design got wrong on narrow screens:

- The home hero was ~690px wide on every phone, which cut off the text and caused sideways scrolling. Grid tracks are now `minmax(0,1fr)`.
- Phones get 16px gutters and headings that scale with the screen width (`clamp()`). Form fields use 16px text so iOS doesn't zoom in.
- There's space reserved for the device showcase (no layout shift), larger hit areas for the carousel controls, and support for reduced motion.

Checked for horizontal overflow on every page at 320, 360, 375, 414, 600, 768, 834, 1024, 1366, 1920 and 2560px.

## SEO

- **Titles and descriptions**: each page leads with the search it targets (`site.config.mjs` → `SEO`), e.g. "Law Firm Web Design UK", "AI Chatbots & AI Web Design for Law Firms", "Branding for New Law Firms", "SRA-Compliant Law Firm Websites", "Consultant Solicitor Websites". Every claim is one the page already makes.
- **Structured data (JSON-LD)**: a `ProfessionalService` with the service catalogue, UK area served and topics; a `WebSite` entry on the home page; breadcrumbs on the other pages; and a `Service` entry on each service page.
- Every page has a canonical URL, Open Graph/Twitter cards (`og.png`) and `lang="en-GB"`. There's a `sitemap.xml` and a `robots.txt`, and the 404 page is `noindex`.
- **Speed** (Google ranks on Core Web Vitals): the icon font is cut from 778 KB to 10 KB, the nine stylesheets are one cached file, the above-the-fold fonts are preloaded, and layout shift is 0.
- Lighthouse, mobile: SEO 100 on every page tested (home, legal, contact, clients, web design). Performance 94–98, measured locally without compression.
- **Domain**: set `SITE_URL` in Vercel to the real domain when it's live. Until then, canonical URLs use the Vercel production URL.

## Security

- **Headers** (`vercel.json`): a strict Content Security Policy (scripts, styles, fonts and connections only from this site; no framing), HSTS, `X-Frame-Options: DENY`, `nosniff`, a Referrer-Policy, a locked-down Permissions-Policy, and cross-origin isolation (COOP/CORP).
- **Contact endpoint** (`api/contact.js`):
  - accepts same-origin JSON only, so other sites can't post to it;
  - caps the body at 16 KB;
  - rate-limits to 5 submissions per IP per 10 minutes;
  - uses a honeypot field and a 3-second minimum fill time (bots get a fake success and no email is sent);
  - strips control characters, sanitises the email subject line and uses a 10-second upstream timeout;
  - never caches responses.
- **DDoS**: Vercel's platform DDoS mitigation is on for every deployment automatically. The site is static files served from the CDN, so floods of page requests never reach a server. The one function is protected as above. For a hard limit that holds across all function instances, add a Firewall rule in the Vercel dashboard: Firewall → Rules → path `/api/contact`, rate limit 5 per 10 minutes per IP → Deny. If you're under attack, turn on Firewall → **Attack Challenge Mode**.
- The build publishes only `dist/`. `source/`, `reference/` and `vendor/` are never served.

## Client mock-up images

`source/sites.js` loads three photos from `static.wixstatic.com`. The build rewrites those URLs to `/clients/honest-coffee-hero.jpg`, `/clients/honest-coffee-tall.jpg` and `/clients/taylor-rose-hero.jpg` (see `scripts/client-images.mjs`). Run `npm run fetch:images` and commit the files. Until they exist, those panels show their CSS fallback colour.

## Contact form

The form posts JSON to `/api/contact`. On success it shows "Thanks, we've got it." If the endpoint can't be reached (for example, offline, or email isn't configured), it opens the visitor's mail app with the message already filled in, addressed to Andrew@copacetic.web, and then shows the same thanks state.

In the Vercel project (Settings → Environment Variables), set:

- `RESEND_API_KEY` (secret)
- `CONTACT_FROM`: a sender on a domain you've verified in Resend, e.g. `copacetic.web <website@copacetic.web>`
- `CONTACT_TO` (optional): defaults to `Andrew@copacetic.web`

## PWA

- `manifest.webmanifest`: name "copacetic.web", theme `#1c1917`, background `#ffffff`, and 192/512/maskable icons made from `lutey/mood2.png`.
- `sw.js` precaches every page and asset. Pages are network-first with an offline fallback, so an unknown page falls back to the cached 404. Assets are cache-first. Each build changes the cache name, so a new deploy replaces the old cache.
- Chrome's installability check (`Page.getInstallabilityErrors`, which Lighthouse uses) returns no errors.

## Fidelity check

Every route was screenshotted full-page at 1280px, 900px and 390px in Chromium, next to `reference/copacetic.web (single file).html`, and diffed pixel by pixel. All 48 pairs were **identical (0 px differ)** before the mobile and SEO work. The Mobile device toggle, next-site arrow and the open burger menu at 390px were also identical.

Deliberate differences from the reference:

- Real routes replace `#hash` routes. The nav's active state is set in the HTML, using the same `NAVMAP` from `source/app.js`.
- On `/contact` the closing CTA banner is left out of the HTML. The reference hid it with `display:none`, so the result looks the same.
- Fonts and icons are self-hosted with the same files, instead of loading from Google Fonts and the CDN, so the site works offline. The Tabler `@font-face` only lists the woff2 file.
- Each page has a search-optimised `<title>` and meta description (see SEO below).
- The icons are drawn from a cut-down copy of the same font. On Linux, FreeType's auto-hinter can snap some of them by up to 1px (a 5–151 px difference per page in the comparison). macOS, Windows and iOS render them identically.
- Mobile fixes in `src/responsive.css` (see Mobile below), so the 390px screenshots now differ from the reference on purpose.
- A 404 page is added because the brief requires one.

## Where the pinned values come from

- **Prices**: `source/pages-2.js`, `tier()`: `£` + `—` and "Price to be confirmed" for Essential, Professional ("Most popular") and Bespoke. `price-proj`: "iOS & Android apps", "Priced per project…". There are no other prices.
- **Colour tokens**: `source/site.css` `:root`: paper `#f3f0ea`, surface `#f7f4f0`, card `#fff`, ink `#1c1917`, ink-2 `#292524`, border `#e5e0d9`, border-2 `#d6d3d1`, hair `#f5f5f4`, muted `#78716c`, faint `#a8a29e`, accent `#166534`, red `#991b1b`, amber `#b45309`, slate `#393d47`. The footer `.web` colour `#7fe3ad` comes from `source/index.html`. Barker & Dixon's `#002147` comes from `source/sites.css`.
- **Client names and order**: `source/app.js` `CLIENTS`: T&M Legal Consulting Ltd, Barker & Dixon, Copacetic.legal, Inquiri, Taylor Rose Cumbria, Felicity Marsden, Tedius, Honest Coffee, Explore Cumbria.
