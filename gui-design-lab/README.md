# Pineapple GUI Design Lab

Private mockup environment for Pineapple GUI review. This project is separate from the real Pineapple Expo / React Native app and exists only for page-by-page design review, interactive testing, and versioned UI iteration.

## Stack

- React
- Vite
- TypeScript
- React Router
- Framer Motion
- CSS modules

## Local development

```bash
npm install
npm run dev
```

Local development runs on:

- `http://localhost:4321`

Build for Cloudflare Pages:

```bash
npm run build
```

The app is a standard SPA. Cloudflare Pages should use:

- Build command: `npm run build`
- Output directory: `dist`

The `public/_redirects` file is included for SPA route fallback.

## Auth

This is intentionally simple local-only auth for private review sessions.

Credentials live in:

- `src/config/auth.ts`

Session helpers live in:

- `src/utils/auth.ts`

Default credentials:

- username: `admin`
- password: `pineapple123`

To reset access, edit `src/config/auth.ts` and clear localStorage for `pineapple-gui-design-lab-session`.

## Versioning

GUI lab version text lives in:

- `src/config/version.ts`

Current GUI review version:

- `v1.1`

Package version is also set in:

- `package.json`

Update both when creating a new GUI review revision, then add a new entry to `CHANGELOG.md`.

## Page registry

All pages are registered in:

- `src/data/pages.ts`

Each page includes:

- `id`
- `slug`
- `name`
- `shortDescription`
- `category`
- `recommendedOrder`
- `template`
- optional notes

The dashboard and `/gui/:pageSlug` route both read from this registry, so new pages should be added there first.

## Mock data

Shared dummy data lives in:

- `src/data/mockData.ts`

Use that file to update trips, travellers, alerts, documents, and transfer examples.

## Screen editing

Viewer shell and route composition:

- `src/pages/GuiViewer/GuiViewerPage.tsx`
- `src/components/PhoneShell/PhoneShell.tsx`
- `src/components/PageInfo/PageInfoPanel.tsx`

Mock screen rendering:

- `src/components/MockScreens/ScreenRenderer.tsx`
- `src/components/MockScreens/ScreenRenderer.module.css`

Page 01 Home Dashboard is the most complete screen and should be the reference when refining the broader GUI system.

## Trip card standard

The GUI lab now records Pineapple's default secondary-card rule directly in `src/components/MockScreens/ScreenRenderer.module.css`:

- standard content cards: full width, `min-height: 112px`, `border-radius: 20px`, `padding: 16px 18px`
- compact launcher cards: full width, `min-height: 88px`, `border-radius: 20px`, `padding: 16px`
- default vertical rhythm between stacked cards: `14px`

Use the hero card separately for the master trip card. The Trip Overview mock and the flagship Home Dashboard both follow this sizing system.

## Cloudflare Pages deployment

1. Push the repo to GitHub.
2. Create a Cloudflare Pages project named `pineapplegui`.
3. Point the project at the `gui-design-lab` directory in this repo.
4. Set build command to `npm run build`.
5. Set output directory to `dist`.
6. Keep framework preset as Vite if Cloudflare detects it.

The repo also includes:

- `wrangler.toml`

That file declares the intended Cloudflare Pages project name and output directory:

- name: `pineapplegui`
- pages build output: `dist`

## Reminder

This project is not the real Pineapple app. It is a private GUI laboratory for review and iteration only.
