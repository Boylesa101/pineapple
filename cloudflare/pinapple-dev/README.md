# pinapple-dev

Static Cloudflare Pages download page for the latest Pineapple Android test APK.

Deployment shape:
- Pages hosts the HTML and icon assets
- R2 stores the APK itself

Manual update flow:
1. Upload the latest APK to the R2 bucket
2. Replace the `__APK_URL__` placeholder in `index.html`
3. Deploy this folder to the `pinapple-dev` Pages project
