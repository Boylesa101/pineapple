# copacetic.web — FIDELITY CONTRACT (Claude Code reads this automatically)

You are rebuilding an existing, finished website design. This is a **faithful port**, not a redesign.

**Source of truth:** `source/` (the design split into readable files) and
`copacetic.web (single file).html` (the same site bundled; open it in a browser to see it running).
When the two seem to differ, `source/` wins.

## The one rule: lift, don't invent
- Every word, price, colour, font, spacing value, icon name, page and link already exists in `source/`.
  Copy it **character for character**.
- Before typing any copy, price, colour or label: find it in `source/` and paste it.
- If something is not in `source/`, it does not go in the build. No invented prices, testimonials,
  stats, team members, client logos, blog, extra pages, cookie banner or chatbot.
- Placeholders in square brackets (e.g. `[Who this is for]`, `[Inclusions to confirm]`, `[ — ]`,
  `[ team photo ]`, the About "[Our story…]" box) and "£—" / "Price to be confirmed" **stay exactly as they are**.
  Do not fill them in.

## Owner-approved additions (keep them)
The owner asked for these after the port, so they are part of the source now:
- `source/pages-5.js` + `source/site-3.css`: FAQ sections on For law firms, AI chatbots and Branding, and the
  `/starting-a-law-firm` guide (linked from the footer and the FAQs). Regulatory statements follow SRA guidance;
  keep them general, link to sra.org.uk, and keep the "not legal or regulatory advice" note.
- Search titles/descriptions, social links and the site URL in `site.config.mjs`; mobile fixes in `src/responsive.css`.

## Pinned values (most likely to drift)
- Brand shown in the header: **copacetic** + **.web** in green `#166534`. Footer uses `.web` in `#7fe3ad`.
  Lutey face (`lutey/mood2.png`) sits left of the wordmark. There is **no** "Web Design" pill.
- Page background **white `#fff`**. Sticky nav `rgba(255,255,255,.88)` + `backdrop-filter:blur(12px)`.
- Tokens: paper `#f3f0ea` · surface `#f7f4f0` · ink `#1c1917` · ink-2 `#292524` · border `#e5e0d9` ·
  border-2 `#d6d3d1` · hair `#f5f5f4` · muted `#78716c` · faint `#a8a29e` · accent `#166534` ·
  red `#991b1b` · amber `#b45309` · slate (primary buttons) `#393d47`.
- Fonts: **Cormorant Garamond** (headings), **DM Sans** (body, 13px base), **DM Mono** (URLs, codes).
  Icons: **Tabler Icons webfont 2.47.0**. Never substitute Inter/Arial/Roboto.
- Pricing: 3 tiers **Essential / Professional (featured, "Most popular") / Bespoke**, all "£—" +
  "Price to be confirmed". Separate dashed box: "iOS & Android apps — priced per project".
  **No other prices exist. No £199, no $ and no monthly/annual toggle.**
- ISO wording is always **"Built to ISO 27001 standards"**. Never say "certified" or "accredited".
- Hosting wording: **"our own servers in a UK data centre"**.
- Contact: **Andrew@copacetic.web** only. No phone and no address.
- No chatbot widget and no Lutey character anywhere except the logo.

## Self-check before calling any page done
1. Did I open the matching `source/` file and copy from it?
2. Is every string identical, including placeholders?
3. Are colours only the tokens above, and fonts only the three above?
4. Did I add anything not in `source/`? If so, delete it.
5. Does it match `copacetic.web (single file).html` side by side at 1280px, 900px and 390px?
