## Pineapple

Pineapple is a local-first holiday planner and secure travel organiser built with Expo, React Native, and TypeScript. It runs fully offline after installation and keeps structured trip data in SQLite, sensitive security settings in secure device storage, and attached files in app-managed on-device storage.

### Android test and release builds

- Pineapple is back on Expo SDK 55 / React Native 0.83 and the Android project is configured with the required New Architecture setting for that SDK line
- Expo Go is no longer a supported Pineapple test path; use installable APKs for device testing and `.aab` for Play Store release
- For a dev-only APK that still expects Metro, run `npm run apk:debug`
- Pineapple copies the finished debug APK to `build/apk/pineapple-v2.2.7-debug.apk`
- For the fastest direct phone testing on a modern device, run `npm run apk:release:arm64`
- Pineapple copies that arm64-only release APK to `build/apk/pineapple-v2.2.7-release-arm64.apk`
- For direct phone testing without USB or Metro, run `npm run apk:release`
- Pineapple copies the finished standalone release APK to `build/apk/pineapple-v2.2.7-release.apk`
- The generated release APK will be at `android/app/build/outputs/apk/release/app-release.apk`
- Until you add a real upload keystore, release builds fall back to the Android debug key so they remain installable for testing only
- When you are ready for Google Play, provide these environment variables before building:
  - `PINEAPPLE_UPLOAD_STORE_FILE`
  - `PINEAPPLE_UPLOAD_STORE_PASSWORD`
  - `PINEAPPLE_UPLOAD_KEY_ALIAS`
  - `PINEAPPLE_UPLOAD_KEY_PASSWORD`
- Then build the Play Store bundle with `npm run aab:release`
- The generated Android App Bundle will be at `android/app/build/outputs/bundle/release/app-release.aab`
- Expo SDK 55’s native toolchain expects Node `>= 20.19.4`; this machine is currently on `20.19.0`, so update Node before relying on local native build verification

### Cloudflare test download page

- Cloudflare Pages project: `pinapple-dev`
- Public test page: `https://pinapple-dev.pages.dev`
- Preview deployment example: `https://ac48ec69.pinapple-dev.pages.dev`
- APK download is hosted from Cloudflare R2 because the release APK is too large to bundle directly into a Pages deployment
- Current stable APK link used by the page: `https://pub-e921959b6412492f9b7d39739cf8f48c.r2.dev/downloads/pineapple-latest.apk`
- The static page source lives in `cloudflare/pinapple-dev/`
- To refresh the hosted APK later in one command:
  - `npm run deploy:pinapple-dev -- --apk "new apk/<your file>.apk" --build-label "Internal test build"`
- If `--apk` is omitted, Pineapple will automatically use the newest APK in `new apk/` or `build/apk/`
- The deploy script uploads both the versioned APK object and the stable `downloads/pineapple-latest.apk` alias, updates the page metadata, and redeploys the Cloudflare Pages site

### Android themed icon check

- The Android adaptive icon config points at `./assets/android-icon-monochrome.png`, and the generated launcher XML in `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` includes the monochrome layer
- The monochrome source asset is a transparent single-colour glyph with no baked background and is regenerated from `scripts/generate-brand-assets.mjs`
- Pixel / Google phone verification:
  - build and install a fresh APK after the icon assets are regenerated
  - long-press the home screen and enable `Themed icons`
  - confirm the Pineapple launcher icon renders as the pineapple glyph rather than a filled square background

### First-run order

- First-run setup now follows this exact order: `Language` -> `Name` -> `PIN` -> `Biometrics` -> `Passport / traveller setup`
- Travel style and profile photo no longer block PIN setup; profile photo lives in `Account`, and travel style lives in `Account` / `Settings`

### Core features

- PIN setup and lock flow with a minimum 4-digit PIN, explicit Enter/Cancel actions, and optional biometric unlock
- Direct-to-unlock auth flow with rotating multilingual greetings and 100 short etiquette facts to keep the lock screen polished without adding extra taps
- Optional biometric unlock when the device supports it
- Auto-lock after inactivity, persistent PIN cooldown after repeated failures, and best-effort privacy overlay for the app switcher
- Mockup-matched blue/white shell with a safe-area-aware bottom nav for Home, SOS, and Vault, while trip-specific navigation now lives inside the trip flow itself
- Home now uses a minimal header plus a stacked trip-card deck, with a single floating `New trip` action instead of the older hero and summary blocks
- Trip CRUD with searchable destination entry, automatic destination hero imagery, local cached trip covers, per-trip transfer / pickup notes, and optional stored travel-to-airport duration for departure planning
- Multi-traveller trip profiles with DOB, nationality, relationship type, notes, and colour badges
- Traveller management with passport, GHIC / EHIC, and medical notes
- Secure vault for passports, insurance, visas, boarding passes, hotel bookings, excursion tickets, and custom docs
- Passport documents now render with a dedicated physical passport cover and identity spread experience instead of a generic document card
- Passport image scans and passport PDFs can now prefill passport fields with on-device OCR and MRZ parsing in the Android build, while keeping the extracted fields editable before save
- Driving licences now render with their own UK photocard object and fuller official record view, including front/back scan support and Android OCR from front scans
- GHIC / EHIC cards now render with a dedicated health-card object that prioritises quick expiry, issuer, emergency, and card-number access
- Payment cards now render with their own secure premium-card object, masked number defaults, explicit reveal/hide action, and non-sensitive copy behaviour
- Insurance records, confirmations, letters, passes, and similar paperwork now render with a dedicated formal-document folder that opens into metadata plus source-preview layout
- All major document types now share the same support layer for source viewing, copy actions, verification status, expiry badges, and extracted-field editing
- The Vault now includes a first-time document setup flow for empty trips, including traveller-name capture, secure setup guidance, and one-tap first-document prompts
- Document intake now leads with OCR-first actions in this order: `Scan document`, `Add photo for OCR`, then `Enter manually`
- Live camera scan capture is now available for document intake, with OCR-supported types flowing straight into editable review when possible
- The Vault now uses a floating blue add action with a cleaner add/import sheet for passport, driving-licence, health-card, payment-card, formal-document, and PDF/image intake
- The Vault now includes a quick-access row for flights, passports, and hotel info under the main header, with an honest internal placeholder for future Google Wallet flight-ticket linking
- Guided scan/import flow now shows framed capture guidance, animated processing states, and calmer OCR review messaging before Pineapple opens the editable fields view
- Native camera scans now use a live document-scanner module on supported Android/iOS native builds, with a fallback to the plain camera flow only if the scanner is unavailable
- Metadata-only document entries for cases where you want reminders and document numbers before attaching a file
- Vault filtering by traveller or document type with grouped traveller/type views and document expiry warnings
- Local image upload and PDF import with sensitive preview locking
- Home alerts now live behind the bell icon instead of taking over the dashboard, with a red-dot badge only when something needs attention
- Reusable document expiry status system for passports, visas, GHIC / EHIC, travel insurance, driving licences, ID cards, and custom docs with expiry dates
- Packing lists grouped by category with multi-traveller assignment, templates, duplicate action, and priority flags
- Transport segment management with outbound/return direction support, dynamic flight/private-flight/train/ferry/eurotunnel/car/hire-car/taxi modes, searchable operator suggestions where useful, stored provider codes, and safe local logo fallback handling
- The flight provider picker now bundles 50 common airline brand marks locally so transport selection does not depend on remote logo URLs at runtime
- Hotel stay management with free OpenStreetMap/Nominatim address search, editable address normalization, automatic free image lookup, and offline cache after the first successful fetch
- Structured transfer/pickup management with provider, method, location, time, notes, and optional travel-to-airport duration stored directly on the trip
- Automatic trip-card destination images that resolve from country or place text, cache locally after the first fetch, and fall back cleanly when offline or unresolved
- Trip detail destination insights with live timezone resolution, real local destination time, GMT/UTC difference versus the device timezone, and graceful fallback when the destination cannot be resolved
- Trip detail airport set-off timing that calculates `departure - 2 hours - airport travel duration` from the stored outbound flight and airport travel minutes
- Trip detail 7-day destination weather driven by a dedicated live forecast provider with caching, cleaner Pineapple-styled summary/detail cards, and safe failure fallbacks
- Trip-card destination imagery now prefers Pexels when an optional `EXPO_PUBLIC_PEXELS_API_KEY` is supplied at build time, falls back to Wikimedia Commons otherwise, caches the chosen image locally, and exposes source attribution through a small in-card info action
- Flight entry now includes a built-in searchable airport picker with stored IATA codes, takeoff/landing field icons, and optional connecting-flight capture for cleaner travel records
- Date-of-birth entry now uses direct typed `DD / MM / YYYY` input in traveller, passport, and driving-licence flows instead of the calendar picker
- Trip detail now uses a contextual footer for `Packing`, `Vibes`, `Travel`, and `Hotel`, keeping those sections in the trip flow instead of the global footer
- Honest limitation: destination time and weather depend on successful live destination geocoding and forecast lookups, so Pineapple intentionally shows calm fallback states instead of guessed values when those requests fail
- `Vibes` is now a premium swipe deck backed by the existing Pineapple Tripadvisor proxy, with a first-time intro, clear `Eat`, `Drink`, `See`, and `Do` lanes, live image-led cards, and a per-trip `Mood` shortlist for saved right-swipes
- `Mood` persists saved Vibes locally per trip, prevents duplicates, caches venue imagery locally where possible, and lets the user review saved places, open reliable source links, or add a place into the itinerary later
- To enable live Vibes on Cloudflare Pages, add the Pages secret `TRIPADVISOR_API_KEY`, optionally set `TRIPADVISOR_ALLOWED_DOMAIN=pinapple-dev.pages.dev`, and allowlist `pinapple-dev.pages.dev` in Tripadvisor
- Honest limitation: Tripadvisor does not reliably expose first-party social handles through the current Content API, so Pineapple only shows the official website and Tripadvisor links when the live data includes them and never invents social accounts
- Honest limitation: Tripadvisor publishes stricter storage/display rules than Pineapple’s normal local-first sources, so the current Vibes implementation keeps only a short-lived local deck cache plus the user’s saved Mood shortlist for continuity, while the app locally caches venue images it has already fetched for smoother repeat viewing
- Chronological itinerary timeline
- Emergency reference storage per trip
- High-contrast Travel Mode with family overview, traveller tabs/swipe, quick copy actions, and temporary sensitive reveal
- Printable branded trip PDF export with inclusion/hide controls
- Encrypted local backup export/import with `.pineapplebackup` files, validation, and attachment preservation where the original local files are still available
- Vault-managed document attachments and trip hero images are encrypted at rest on-device and only materialized into a temporary readable cache when Pineapple needs to view or OCR them
- Sensitive structured record fields are also encrypted before Pineapple writes them into local storage, covering trips, travellers, document metadata, itinerary notes, emergency records, and sync payloads
- Local reminders and notifications for trip countdown milestones, trip day, passport/GHIC expiry, missing insurance, packing completeness, per-segment transport departures, hotels, transfers, travel mode, SOS readiness, and excursions
- Optional local expiry reminders for passports, GHIC / EHIC cards, insurance, visas, and supported custom documents
- Version `2.2.7` keeps the dedicated transport-notification proof build: it seeds one temporary `Transport Notification Proof Trip` on device, adds one flight/train/taxi/ferry/Eurotunnel segment, compresses those lock-screen alert timings into a short 2-26 minute local test window, and is intended for real APK verification rather than Expo Go
- First-run setup now starts with language choice, persists the selected app language immediately, then continues through name, PIN, biometrics, and optional passport / traveller setup
- Vault travel records now expose hire-car bookings, airport lounge passes, airline loyalty cards, and a Pineapple-stored UK rail ticket record with local QR generation
- UK rail ticket records stay explicitly honest: Pineapple stores a reference copy and QR payload for your own trip organisation, but it does not issue a valid National Rail travel ticket
- Trip detail can now surface a visa-check warning or softer official-check prompt using destination-specific official immigration links when Pineapple can match the saved trip destination safely
- Trip sharing now surfaces Android Nearby / Quick Share through the existing local exported trip file flow instead of sounding like a backend sync feature
- Weather detail returns to the cleaner selected-day layout: scenic top card first, then the selected day’s hourly time, icon, and temperature rows directly underneath
- The temporary `Transport Notification Proof Trip` is build-scoped and should be removed again after transport lock-screen verification is complete
- Bootstrap correction: build-scoped proof-trip seeding now uses a safe in-place snapshot persist instead of a destructive full data replacement, so existing local data is not cleared during startup
- Android icon correction: the adaptive monochrome icon now uses a proper transparent monochrome glyph asset for themed launcher icons, and the checked-in launcher XML keeps the monochrome layer wired in
- Dedicated expiry warnings screen with filters for all, expiring soon, expired, and notifications off
- Optional manual-share trip sync with participant roles, invite records, conflict review, trip-share export/import, record-level packet validation, and SHA-256 integrity checks for newly exported share files
- Expanded settings surface for security, reminders, sync, backup/restore, and privacy masking
- Trip sharing now supports Pineapple-owned shared files plus a trip-level Pineapple QR handoff route for smaller transfers
- Account and traveller profiles can each keep an optional local profile photo stored in Pineapple-managed device storage
- Explicit first-launch onboarding in this exact order: language, name, PIN, biometrics, then passport / traveller setup
- Blue first-run welcome/auth flow with setup-aware greeting copy and centered PIN pad layout
- Pineapple web is treated as a companion surface; sensitive vault editing, encrypted backups, and manual-share sync stay disabled there and are intended for the installed Android app
- Retryable startup recovery if local bootstrap fails unexpectedly
- Lighter startup path with lazy file-directory creation for faster cold launch
- Development-only demo data reset for QA

### Stack

- Expo SDK 55
- React Native 0.83
- Expo Router
- TypeScript
- SQLite via `expo-sqlite`
- Secure settings via `expo-secure-store`
- Biometric auth via `expo-local-authentication`
- Local files via `expo-file-system`
- Media import via `expo-image-picker` and `expo-document-picker`
- PDF generation via `expo-print`
- Local sharing via `expo-sharing`
- Local notifications via `expo-notifications`
- Passport OCR via `@infinitered/react-native-mlkit-text-recognition`
- PDF page rendering for OCR via `react-native-pdf-page-image`
- Backup encryption via PBKDF2-derived AES with HMAC integrity using `crypto-js`
- State management via `zustand`

### Security notes

- PIN configuration is stored in device secure storage and verified locally using a stronger PBKDF2-based hash for current installs
- Repeated failed PIN attempts now trigger a persisted cooldown, so restarting the app no longer clears the brute-force window
- Backup exports are encrypted before they leave the app
- Vault-managed document attachments are encrypted at rest in Pineapple storage on-device
- Pineapple only materializes encrypted local sensitive files into a temporary readable cache when viewing or OCR needs access, and clears that cache when the app locks or backgrounds
- Trip hero images are now stored in the same encrypted-at-rest local format as Vault attachments; non-Vault exports still remain normal app-managed files unless they are inside an encrypted backup
- Vault PIN unlock now uses the same real lockout-aware verification path as the main app unlock flow instead of a weaker raw PIN check
- Local record IDs no longer rely on `expo-crypto` UUID generation; Pineapple now uses a runtime-safe app-local ID utility for trips, travellers, documents, reminders, invites, and similar records, while keeping true secure-random generation only for keys, salts, and IVs
- Pineapple still uses `expo-sqlite` for structured local records, so whole-database engine encryption is not yet in place; instead, Pineapple encrypts sensitive text fields before they are written, while keeping IDs, timestamps, routing fields, and expiry dates plaintext where the app needs them for queries and navigation
- Transient picker/cache copies are removed after import so scans are not left duplicated in common temp locations unnecessarily
- OCR-generated temporary images are cleaned up after use
- Android screenshots are blocked with `FLAG_SECURE`
- Android OS backup is disabled; Pineapple relies on its own encrypted backup/restore flow instead
- A fuller threat model and security posture summary lives in `SECURITY.md`

### Destination image providers

- Trip cards always render with a background image: Pineapple uses the encrypted cached trip image when available and falls back to the built-in card background if no remote result can be resolved
- Destination image lookup is local-first friendly after the first fetch because Pineapple downloads and stores the chosen trip image in app-managed storage
- Hotel stays can also fetch and cache a free image after save by combining the typed hotel address with free geocoding and the same Pexels/Wikimedia pipeline
- Pexels is the preferred remote source when `EXPO_PUBLIC_PEXELS_API_KEY` is present during the build; if no key is set, Pineapple skips Pexels and falls back to Wikimedia Commons and then the default local background
- Attribution is available from the small `i` icon on each trip card
- Honest limitation: a client-side Pexels key bundled into an APK can still be extracted by a determined attacker, so treat it as an optional convenience integration rather than a secret credential

### Project structure

```text
app/                Expo Router routes
src/brand/          Pineapple brand mark
src/components/     Shared UI building blocks
src/constants/      Theme tokens
src/data/           Demo seed helpers
src/db/             SQLite schema and repositories
src/services/       Backup, PDF, notification, and manual-share sync services
src/store/          App state and mutations
src/types/          Domain models
src/utils/          Formatting, security, file storage, selectors
scripts/            Asset generation
assets/             Generated app icon and splash assets
```

### Getting started

1. Install dependencies:

```bash
npm install
```

2. Regenerate brand assets if needed:

```bash
npm run generate:brand
```

3. Start Metro only if you are doing local native development:

```bash
npm run start
```

4. Run checks:

```bash
npm test
npm run typecheck
npx expo export --platform ios --platform android
npx expo export --platform web
```

### Passport OCR

- Passport OCR is available in the Android native build of Pineapple
- It works with local image scans and attached passport PDFs stored on the device
- PDF OCR now reads multiple pages when needed, instead of stopping at only the first page
- Pineapple always lets the user review and edit extracted passport fields before saving
- When multiple candidate dates or numbers are detected, Pineapple now surfaces review notes before save

### Driving Licence

- Driving licences use a dedicated photocard-style component instead of the generic document card
- The closed state behaves like a compact licence card and the open state reveals a fuller official record layout
- Pineapple can keep front and reverse scans separately so the photocard and endorsements stay together offline
- Driving-licence OCR is available in the Android native build for local front images and PDFs, with extracted fields kept editable before save
- Driving-licence OCR now flags ambiguous dates or licence numbers for manual review in the Vault flow

### Health Cards

- GHIC / EHIC cards use a dedicated health-card component instead of the generic document card
- The closed state behaves like a real travel health card and the open state prioritises holder, issuer, emergency line, and expiry details
- Health-card OCR is available in the Android native build for local images and PDFs, with extracted fields always reviewable and editable before save
- Health-card OCR now flags ambiguous dates or card numbers for manual review in the Vault flow

### Payment Cards

- Payment cards use a dedicated premium-card component instead of the generic document card
- The closed state always masks the card number except the last 4 digits
- The open state behaves like a secure stored-record drawer with explicit reveal/hide control for the full number
- Pineapple does not show the security code by default in the payment-card detail view, and copy actions only include non-sensitive masked data

### Formal Documents

- Insurance records, policy documents, passes, confirmations, certificates, letters, and similar paperwork use a dedicated formal-document folder instead of the generic document card
- The closed state behaves like an official record cover, while the open state pairs extracted metadata with the original image or PDF preview
- Formal-document OCR is available in the Android native build for local images and PDFs, with extracted fields kept editable before save
- When Pineapple detects multiple candidate dates or reference codes, it flags the formal document for manual review in the Vault flow

### Shared document systems

- Pineapple now uses a shared full-screen document source viewer for local scans and PDFs across Passport, Driving Licence, Health Card, Payment Card, and Formal Documents
- Copy actions, verification badges, expiry badges, and extracted-field editor shells are now reused across the main document experiences instead of being reimplemented per document type
- Missing files and metadata-only records now surface clearer, consistent viewer messaging in the Vault detail flow

### Vault onboarding

- When a trip has no documents yet, the Vault now switches into a first-time setup flow instead of showing an empty list
- Pineapple prompts for a traveller name first when needed, links into PIN security if it is not configured, and then guides the user toward adding a passport or driving licence first
- Secondary prompts encourage adding a health card, insurance/formal records, and other supporting travel paperwork without overwhelming the user

### Local data model

- `Trip`
- `Traveller`
- `Document`
- `PackingItem`
- `TravelSegment`
- `HotelStay`
- `ItineraryEvent`
- `EmergencyInfo`
- `ReminderSetting`
- `AppSecuritySettings`
- `AppPreferences`
- `TripParticipant`
- `TripInvite`
- `SharedTripState`
- `SyncConflict`

### Security model

- PIN hashes are stored in secure device storage with a random salt and current installs use PBKDF2-based derivation
- SQLite stores only structured trip data, not raw PINs
- Sensitive vault previews stay hidden until the vault is authenticated
- App content is relocked after inactivity and on background return past the configured timeout
- Repeated failed PIN attempts trigger a persisted cooldown to slow brute-force attempts
- Biometric unlock is optional and device-dependent
- Backup export/import uses password-protected AES encryption in the local backup layer
- Shared trip sync is optional and manual-share only in phase 3
- Shared-trip packets are validated and integrity-checked before import, but they are not encrypted or cryptographically authenticated in the current release
- Conflict review is explicit; Pineapple does not silently overwrite local trip changes
- Pineapple is currently shipped and tested as an installable mobile app, with the Android build remaining the main secure home for sensitive vault images
- Notification text stays privacy-aware and does not include document numbers, images, or full document contents
- Expiry reminder notifications also avoid traveller names and specific document types so lock-screen reminder text stays more generic
- Android screenshots are blocked and Android OS backup is disabled

### Backup and restore

- Backups are exported as encrypted `.pineapplebackup` files from Settings > Backup & Restore
- Backup payloads include trips, travellers, document metadata, packing items, itinerary items, hotel stays, travel segments, emergency info, reminder settings, app preferences that are safe to restore, participant/share records, and sync conflict records
- Pineapple attempts to include locally managed attachment files such as trip cover images and vault files; if a referenced local file is no longer readable, its database metadata remains in the backup and the export still completes
- Vault attachments are decrypted only long enough to be wrapped inside the encrypted backup payload, then restored back into encrypted-at-rest Vault storage when imported
- Restore validates the backup structure, schema version, and encryption envelope before decrypting
- Restore currently replaces the existing local database after an explicit confirmation step; Pineapple does not silently merge or overwrite data
- Security-sensitive unlock material such as the PIN hash itself is not bundled into backups
- Deleting trips, deleting documents, and replacing current local data during restore now clean up superseded managed files where possible

### Document expiry warnings

- Pineapple surfaces expiry warnings for passports, visas, GHIC / EHIC cards, travel insurance documents, driving licences, ID cards, and custom documents that have an expiry date saved
- Documents can be saved with or without an attached local file, so expiry tracking still works when a scan or import is not available yet
- Expiry thresholds are handled locally with reusable buckets for expired, within 1 day, within 7 days, within 14 days, within 30 days, within 90 days, and within 180 days
- Passports get a stronger six-month warning because many destinations require at least six months of remaining validity
- Missing expiry dates are prompted for document types that usually need them, but they are not treated as expired
- Expiry alerts appear in the dashboard, vault, trip detail, document detail views, and the dedicated warnings screen
- Local expiry reminders are optional and device-only; Pineapple reschedules them when document records change, documents are deleted, or a backup restore refreshes local data
- Each document can keep its own reminder toggle and reminder schedule, while Settings controls the default schedule, master enable switch, and silent reminder preference
- Pineapple does not currently auto-extract expiry dates from OCR; document expiry entry remains explicit and user-confirmed

### Permissions and privacy

- Pineapple only requests notification access when the user explicitly enables local reminders in Settings
- Photo library access is requested only when the user chooses to import a local image for a trip or document
- File picker access is used only for user-selected local files such as PDFs, images, shared-trip packets, and encrypted backups
- Pineapple does not connect to a live inbox; any “email import” workflow is limited to local files the user chooses on-device
- Pineapple relies on device-local secure storage and local files in the native app build for onboarding, security state, and encrypted attachments

### Brand direction

- Soft sand backgrounds and white cards
- Ocean blue accents
- Pineapple gold highlights
- Sunset coral for timeline and action emphasis
- Poppins for headings
- Inter for body copy
- Minimal geometric pineapple mark for icon, splash, and lock flows
- Supplied sunglasses pineapple artwork for launcher, splash, and in-app brand mark assets

### Current phase 3 additions

- Local on-device notification scheduling with global enable/disable plus trip-level reminder toggles
- Optional shared-trip packet export/import and manual-share sync state
- Participant avatars, invite records, and conflict review UI
- Settings hub for security, reminders, sync, backup, and privacy preferences
- Improved Travel Mode with a next-action card and today timeline
- Mobile-app release and deployment guidance

### Roadmap

- Stronger attachment-aware shared trip imports and richer participant acceptance flows
- Optional encrypted sync destinations beyond manual-share packet exchange
- Better in-app PDF viewing
- Multi-trip archive filtering and search

### Release support docs

- Google Play draft copy and screenshot guidance: [docs/GOOGLE_PLAY_DRAFT.md](docs/GOOGLE_PLAY_DRAFT.md)
- Internal release-readiness notes: [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md)
- Legal and compliance release checklist:
  - Confirm support and privacy emails in `src/content/legal.ts` still point at the live support inbox
  - Confirm final support and policy URLs in `src/content/legal.ts`
  - Verify whether analytics or crash reporting are enabled before Play submission
  - Recheck what data leaves the device for third-party lookups and keep legal wording aligned
  - Confirm Google Play Data safety answers against the shipped build
  - Confirm the in-app privacy and terms pages still match the shipped behavior
  - Review SOS and location wording before release if nearby SOS features are added
