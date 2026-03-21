# Pineapple Website

Static marketing and compliance website for Pineapple, built with Vite, React, and TypeScript for deployment to Cloudflare Pages.

## What this site includes

- Public marketing home page
- Privacy Policy page
- Terms of Use page
- Support page with FAQ
- Future-proof `delete-account` placeholder page
- Shared site/legal copy source in [`../shared/pineappleSiteContent.ts`](../shared/pineappleSiteContent.ts)

## Install

```bash
cd website
npm install
```

## Run locally

```bash
cd website
npm run dev
```

## Build

```bash
cd website
npm run build
```

The static output is written to:

```text
website/dist
```

## Deploy to Cloudflare Pages

1. Create a Cloudflare Pages project. Suggested name:
   - `get-pineapple`
2. Build locally or in CI:

```bash
cd website
npm install
npm run build
```

3. Deploy the built output:

```bash
cd website
npm run deploy:cloudflare
```

That script deploys `website/dist` to the Cloudflare Pages project named `get-pineapple`.

If you want a different Pages project name, edit the script in:

[`package.json`](./package.json)

## Suggested Cloudflare Pages settings

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `website`

## Where to change key site values

- App name, tagline, emails, URLs, and release text:
  - [`../shared/pineappleSiteContent.ts`](../shared/pineappleSiteContent.ts)
- Future Google Play URL:
  - `futurePlayStoreUrl` in [`../shared/pineappleSiteContent.ts`](../shared/pineappleSiteContent.ts)
- Public pages.dev URL:
  - `siteUrl`, `privacyUrl`, `termsUrl`, and `supportUrl` in [`../shared/pineappleSiteContent.ts`](../shared/pineappleSiteContent.ts)

## Release checklist

- Replace placeholder emails before release.
- Update the final Pages.dev or custom domain URLs.
- Update the Google Play link when the listing is live.
- Recheck legal wording if app data flows change.
- Confirm Privacy Policy and Terms links match the live Google Play listing.
