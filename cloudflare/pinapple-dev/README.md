# pinapple-dev

Static Cloudflare Pages download page for the latest Pineapple Android test APK.

Deployment shape:
- Pages hosts the HTML and icon assets
- R2 stores the APK itself

Manual update flow:
1. Run `npm run deploy:pinapple-dev -- --apk "new apk/<your file>.apk" --build-label "Internal test build"` from the repo root
2. The script uploads the APK to R2, refreshes the static page metadata, and deploys this folder to the `pinapple-dev` Pages project
