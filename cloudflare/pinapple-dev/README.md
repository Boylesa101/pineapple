# pinapple-dev

Static Cloudflare Pages download page for the latest Pineapple Android test APK.

Deployment shape:
- Pages hosts the HTML and icon assets
- A root Pages Worker now also hosts the `GET /api/vibes` Tripadvisor proxy
- R2 stores the APK itself

Manual update flow:
1. Run `npm run deploy:pinapple-dev -- --apk "new apk/<your file>.apk" --build-label "Internal test build"` from the repo root
2. The script uploads the APK to R2, refreshes the static page metadata, and deploys this folder to the `pinapple-dev` Pages project

Vibes setup:
- Add the Pages secret `TRIPADVISOR_API_KEY` to the `pinapple-dev` Cloudflare Pages project
- Optional: add `TRIPADVISOR_ALLOWED_DOMAIN=pinapple-dev.pages.dev`
- In Tripadvisor, allowlist the domain `pinapple-dev.pages.dev`
- The worker keeps the Tripadvisor key server-side and now enriches search results with image, website, and cleaner category metadata before the app renders the native swipe deck
- Current worker response lanes are `eat`, `drink`, `visit`, and `do`
