# PROMPT FOR CLAUDE CODE — paste everything below the line

---

Rebuild the **copacetic.web** marketing website exactly as designed. This is a faithful port, not a redesign.

## Files you have
- `CLAUDE.md`: the rules. Read it first and follow it throughout.
- `copacetic.web (single file).html`: the finished site running in one file. Open it in a browser and keep it open to compare against.
- `source/`: the same site split into readable files. **Copy every value from here.**
  - `index.html`: head, fonts, nav, closing CTA banner, footer, script order, and inline CSS (g4 grid, chat bubbles, price-proj box, report card `.rp`, mid-width hero rule)
  - `site.css`: tokens, buttons, nav, hero, browser bar, trust row, feature cards
  - `site-2.css`: page heroes, spotlights, server card, steps, pricing, clients, about, contact, CTA, footer, breakpoints
  - `sites.css`: client mock-up sites (Barker & Dixon, Honest Coffee, Taylor Rose Cumbria)
  - `device.css` + `device.js`: the hero Desktop | Mobile device showcase
  - `sites.js`: the three mock-up sites' HTML and the lion-head SVG
  - `pages-1.js` … `pages-4.js`: every page's content
  - `app.js`: client list, server status card, hash routing, form behaviour
  - `lutey/mood2.png`: the logo mark

## Stack
[Choose one before starting, e.g. "Next.js 14 App Router + plain CSS modules, static export", or "Astro + plain CSS".]
- Keep the CSS values identical. Port the existing CSS files as-is; don't convert them to Tailwind.
- Use real routes in place of the `#hash` routes: `/`, `/services`, `/web-design`, `/apps`, `/ai`, `/branding`, `/solicitors`, `/seo`, `/social`, `/analytics`, `/hosting`, `/legal`, `/pricing`, `/clients`, `/about`, `/contact`. Unknown routes go to a simple 404 page styled like the page heroes.
- The site must be a **PWA**: web app manifest (name "copacetic.web", theme `#1c1917`, background `#ffffff`, icon from `lutey/mood2.png`), a service worker that caches the pages, and installability.
- Fully mobile responsive, with the same breakpoints as the source (980px and 620px, plus the 861–980px hero rule in `index.html`).

## Build order (one step at a time; after each, compare with the single-file HTML)
1. **Tokens and global styles** from `site.css` `:root`. Page background is `#fff`.
2. **Layout shell**: sticky nav (logo = Lutey mark + "copacetic" + green ".web"; links Services · For law firms · Pricing · Clients · About; right side Contact link + "Start a project" button; burger menu below 980px); dark closing CTA banner (hidden on /contact); footer with 3 columns + CTA strip + bottom bar. Copy all text from `index.html`. The "Services" nav link is active on every service page (see `NAVMAP` in `app.js`).
3. **Home** (`pages-1.js` `PAGES.home`): hero with the device showcase, "Companies we work with" row (9 names from `app.js` `CLIENTS`), 9 service cards (`SERVICES` in `pages-1.js`), the "Built for law firms" spotlight with the server status card (`SERVER` in `app.js`).
4. **Device showcase** (`device.js` + `device.css`): a Desktop | Mobile segmented toggle with a sliding white pill. One device frame morphs between laptop (≤520px wide, 352px high, with a base) and phone (236×480, 38px radius, dynamic island, status bar "9:41", home bar). The track fades during the 0.6s morph. Horizontal scroll-snap track of the 3 mock-up sites from `sites.js`, with the caption (name + kind), dots and prev/next arrows below. The URL bar shows each site's `url`. Phone mode applies the `.phone …` mobile rules in `device.css`.
5. **Service pages**: `services`, `web-design` (`pages-1.js`); `seo`, `social`, `hosting` (`pages-2.js`); `apps`, `ai`, `branding`, `solicitors`, `legal` (`pages-3.js`); `analytics` (`pages-4.js`). Copy all copy and icons verbatim.
6. **Pricing** (`pages-2.js`): 3 tiers + apps-per-project box + all-inclusive row. Keep "£—", "Price to be confirmed" and every `[placeholder]` exactly.
7. **Clients** (`pages-2.js` + `app.js` `clientCard`): 9 cards in a 3-column grid. The 3 clients that have mock-ups show a live scaled thumbnail (`.cl-shot.live .thumb`, 40% scale); the others show the striped "[ Name — site screenshot ]" placeholder. Tags only where `CLIENTS` has one.
8. **About** and **Contact** (`pages-2.js`). Contact form: name, company, email, toggleable interest chips, message. On submit, show "Thanks, we've got it." Wire it to [email service / API route — choose one], sending to **Andrew@copacetic.web**.
9. **PWA**: manifest + service worker + install check in Lighthouse.

## Must not change
- Any copy, including the placeholders in square brackets.
- Colours, fonts, radii, shadows and spacing.
- The client list and order: T&M Legal Consulting Ltd, Barker & Dixon, Copacetic.legal, Inquiri, Taylor Rose Cumbria, Felicity Marsden, Tedius, Honest Coffee, Explore Cumbria.
- Barker & Dixon mock-up: Oxford blue `#002147`, lion-head SVG logo from `sites.js`.
- The Honest Coffee and Taylor Rose mock-ups load images from `static.wixstatic.com`. Download those images into `/public/clients/` and point the mock-ups at the local copies.

## Must not add
Chatbot widget · Lutey anywhere except the logo · prices · testimonials · stats · blog · extra pages · cookie banner (unless analytics cookies are added later) · "ISO certified" wording.

## When finished
Compare every page with `copacetic.web (single file).html` at 1280px, 900px and 390px, and list any differences. For each price, colour token and client name, cite the `source/` file it came from.
