# copacetic.web — Claude Code build prompt

Paste everything below the line into Claude Code. Put these in the repo root first:
- `copacetic.web (single file).html` — the finished design (open it in a browser)
- `source/` — the readable source files (copy of `web/v3/`)

---

You are rebuilding an existing, finished marketing website called **copacetic.web** as a production site. This is a **faithful port, not a redesign**. The design in `source/` is the source of truth. Reproduce it exactly.

## Rules
1. **Lift, don't invent.** Every string, colour, size, spacing value and icon already exists in `source/`. Copy them character for character. If a value isn't in the source, it doesn't ship.
2. **No placeholder inventions.** Prices are "£—" with "Price to be confirmed". Keep them that way. Do not add prices, testimonials, stats, team members, addresses or phone numbers.
3. **Keep every `[ bracketed ]` placeholder** visible as-is (e.g. `[Who this is for]`, `[Inclusions to confirm]`, `[Our story…]`). The owner will fill them later.
4. Work one page at a time. After each page, compare it side-by-side with `copacetic.web (single file).html` in a browser.

## Stack
- Static site, no backend. Use **Astro** (or plain HTML/CSS/JS if you prefer). One route per page.
- Must be a **PWA**: `manifest.webmanifest`, service worker with offline cache of all pages, installable. Icons from `source/lutey/mood2.png`.
- Fully **mobile responsive** — breakpoints at **980px** and **620px** exactly as in the CSS.
- Contact form: front-end only for now. On submit, hide fields and show the "Thanks, we've got it." state. Leave a `TODO` for the email endpoint.

## Source files — what each one holds
| File | Contains |
|---|---|
| `Copacetic Web Design.html` | Shell: nav, CTA band, footer, font links, inline extra CSS (4-col grid, chat bubbles, `.price-proj`, `.rp` report card, tablet hero fix) |
| `site.css` | Tokens, buttons, nav, hero, browser preview, trust row, feature cards |
| `site-2.css` | Page hero, spotlight, server card, steps, pricing, clients, about, contact, CTA, footer, breakpoints |
| `sites.css` | The three client mock-up sites (Barker & Dixon, Honest Coffee, Taylor Rose Cumbria) + client card thumbnails |
| `device.css` / `device.js` | Desktop ↔ Mobile device showcase on the home page |
| `sites.js` | HTML for the three client mock-ups + lion-head SVG |
| `pages-1.js` | Services list, Home, Services, Web design |
| `pages-2.js` | SEO, Social, Hosting, Pricing, Clients, About, Contact |
| `pages-3.js` | Apps, AI chatbots, Branding, Solicitor profile sites, For law firms |
| `pages-4.js` | Custom analytics |
| `app.js` | Client list, server status card, routing, nav active states |

Convert the JS template strings into real page components/markup. The copy inside them is final.
