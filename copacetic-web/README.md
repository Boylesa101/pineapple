# copacetic.web

The copacetic.web marketing site, ported exactly from the finished design. It is a static site with one page per route, runs as a PWA, and deploys to Cloudflare Pages.

Read `CLAUDE.md` (the fidelity rules) before changing anything.

## Layout

| Path | What it is |
|---|---|
| `source/` | The design, unpacked from `reference/copacetic.web (single file).html`. **This is the source of truth and the build reads it directly.** Edit copy here. |
| `reference/` | The original single-file design, plus the original build prompt. Open the HTML in a browser to compare. |
| `build.mjs` | Runs the `source/` page scripts in a sandbox and writes `dist/<route>.html` for every route. It retypes no copy. |
| `src/site.js` | Browser runtime: burger menu, device showcase mount, contact chips and form, service worker registration. |
| `src/sw.js` | Service worker template. The build fills in the page and asset lists and a content hash. |
| `public/` | Self-hosted fonts (Cormorant Garamond, DM Sans, DM Mono, Tabler Icons 2.47.0 webfont), PWA icons made from `lutey/mood2.png`, the manifest, `_headers`, and `clients/` (the mock-up photos). |
| `functions/api/contact.js` | Cloudflare Pages Function that emails form submissions to Andrew@copacetic.web through Resend. |

Routes: `/`, `/services`, `/web-design`, `/apps`, `/ai`, `/branding`, `/solicitors`, `/seo`, `/social`, `/analytics`, `/hosting`, `/legal`, `/pricing`, `/clients`, `/about`, `/contact`. Any other path gets `404.html`, which uses the page-hero style.

## Commands

```bash
cd copacetic-web
npm run fetch:images   # once: downloads the Honest Coffee / Taylor Rose photos into public/clients/
npm run build          # writes dist/
npm run preview        # http://localhost:4321 with clean URLs; /api/contact is stubbed and logs to the console
npm run deploy         # build + wrangler pages deploy dist --project-name copacetic-web
```

The build needs no dependencies, only Node 20 or later.

## Client mock-up images

`source/sites.js` loads three photos from `static.wixstatic.com`. The build rewrites those URLs to `/clients/honest-coffee-hero.jpg`, `/clients/honest-coffee-tall.jpg` and `/clients/taylor-rose-hero.jpg` (see `scripts/client-images.mjs`). Run `npm run fetch:images` and commit the files. Until they exist, those panels show their CSS fallback colour.

## Contact form

The form posts JSON to `/api/contact`. On success it shows "Thanks, we've got it." If the endpoint can't be reached (for example, offline, or email isn't configured), it opens the visitor's mail app with the message already filled in, addressed to Andrew@copacetic.web, and then shows the same thanks state.

In the Cloudflare Pages project, set:

- `RESEND_API_KEY` (secret)
- `CONTACT_FROM`: a sender on a domain you've verified in Resend, e.g. `copacetic.web <website@copacetic.web>`
- `CONTACT_TO` (optional): defaults to `Andrew@copacetic.web`

## PWA

- `manifest.webmanifest`: name "copacetic.web", theme `#1c1917`, background `#ffffff`, and 192/512/maskable icons made from `lutey/mood2.png`.
- `sw.js` precaches every page and asset. Pages are network-first with an offline fallback, so an unknown page falls back to the cached 404. Assets are cache-first. Each build changes the cache name, so a new deploy replaces the old cache.
- Chrome's installability check (`Page.getInstallabilityErrors`, which Lighthouse uses) returns no errors.

## Fidelity check

Every route was screenshotted full-page at 1280px, 900px and 390px in Chromium, next to `reference/copacetic.web (single file).html`, and diffed pixel by pixel. All 48 pairs were **identical (0 px differ)**. The Mobile device toggle, next-site arrow and the open burger menu at 390px were also identical.

Deliberate differences from the reference:

- Real routes replace `#hash` routes. The nav's active state is set in the HTML, using the same `NAVMAP` from `source/app.js`.
- On `/contact` the closing CTA banner is left out of the HTML. The reference hid it with `display:none`, so the result looks the same.
- Fonts and icons are self-hosted with the same files, instead of loading from Google Fonts and the CDN, so the site works offline. The Tabler `@font-face` only lists the woff2 file.
- Each page has a `<title>` ("Pricing · copacetic.web") and a meta description, both taken from its page-hero text. The home page title stays "copacetic.web".
- A 404 page is added because the brief requires one.

## Where the pinned values come from

- **Prices**: `source/pages-2.js`, `tier()`: `£` + `—` and "Price to be confirmed" for Essential, Professional ("Most popular") and Bespoke. `price-proj`: "iOS & Android apps", "Priced per project…". There are no other prices.
- **Colour tokens**: `source/site.css` `:root`: paper `#f3f0ea`, surface `#f7f4f0`, card `#fff`, ink `#1c1917`, ink-2 `#292524`, border `#e5e0d9`, border-2 `#d6d3d1`, hair `#f5f5f4`, muted `#78716c`, faint `#a8a29e`, accent `#166534`, red `#991b1b`, amber `#b45309`, slate `#393d47`. The footer `.web` colour `#7fe3ad` comes from `source/index.html`. Barker & Dixon's `#002147` comes from `source/sites.css`.
- **Client names and order**: `source/app.js` `CLIENTS`: T&M Legal Consulting Ltd, Barker & Dixon, Copacetic.legal, Inquiri, Taylor Rose Cumbria, Felicity Marsden, Tedius, Honest Coffee, Explore Cumbria.
