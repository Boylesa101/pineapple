## Pineapple

Pineapple is a local-first holiday planner and secure travel organiser built with Expo, React Native, and TypeScript. It runs fully offline after installation and keeps structured trip data in SQLite, sensitive security settings in secure device storage, and attached files in app-managed on-device storage.

### Android test and release builds

- Pineapple is back on Expo SDK 55 / React Native 0.83 and the Android project is configured with the required New Architecture setting for that SDK line
- For a dev-only APK that still expects Metro, run `npm run apk:debug`
- Pineapple copies the finished debug APK to `build/apk/pineapple-v2-debug.apk`
- For direct phone testing without USB or Metro, run `npm run apk:release`
- Pineapple copies the finished standalone release APK to `build/apk/pineapple-v2-release.apk`
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

### Core features

- PIN setup and lock flow with a minimum 4-digit PIN, explicit Enter/Cancel actions, and optional biometric unlock
- Direct-to-unlock auth flow with rotating multilingual greetings and 100 short etiquette facts to keep the lock screen polished without adding extra taps
- Optional biometric unlock when the device supports it
- Expo Go first-run testing now clears stale PIN state when no onboarding or trip data exists yet
- Auto-lock after inactivity and best-effort privacy overlay for the app switcher
- Mockup-matched blue/white shell with a safe-area-aware bottom nav for Home, Account, Vault, Trips, and SOS
- Trip CRUD with automatic destination hero imagery, local cached trip covers, and per-trip transfer / pickup notes
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
- Metadata-only document entries for cases where you want reminders and document numbers before attaching a file
- Vault filtering by traveller or document type with grouped traveller/type views and document expiry warnings
- Local image upload and PDF import with sensitive preview locking
- Home alerts now live behind the bell icon instead of taking over the dashboard, with a red-dot badge only when something needs attention
- Reusable document expiry status system for passports, visas, GHIC / EHIC, travel insurance, driving licences, ID cards, and custom docs with expiry dates
- Packing lists grouped by category with multi-traveller assignment, templates, duplicate action, and priority flags
- Flight / travel segment management
- Hotel stay management
- Automatic trip-card destination images that resolve from country or place text, cache locally after the first fetch, and fall back cleanly when offline or unresolved
- Chronological itinerary timeline
- Emergency reference storage per trip
- High-contrast Travel Mode with family overview, traveller tabs/swipe, quick copy actions, and temporary sensitive reveal
- Printable branded trip PDF export with inclusion/hide controls
- Encrypted local backup export/import with `.pineapplebackup` files, validation, and attachment preservation where the original local files are still available
- Vault-managed document attachments and trip hero images are encrypted at rest on-device and only materialized into a temporary readable cache when Pineapple needs to view or OCR them
- Sensitive structured record fields are also encrypted before Pineapple writes them into local storage, covering trips, travellers, document metadata, itinerary notes, emergency records, and sync payloads
- Local reminders and notifications for trip start, passport/GHIC expiry, missing insurance, packing completeness, flights, and excursions
- Optional local expiry reminders for passports, GHIC / EHIC cards, insurance, visas, and supported custom documents
- Dedicated expiry warnings screen with filters for all, expiring soon, expired, and notifications off
- Optional manual-share trip sync with participant roles, invite records, conflict review, and trip-share export/import
- Expanded settings surface for security, reminders, sync, backup/restore, and privacy masking
- Expo web/PWA companion mode for trip overview, packing, itinerary, emergency info, and printable summaries
- Five-screen first-launch onboarding with PIN setup, first-trip creation, and a setup checklist
- Blue first-run welcome/auth flow with setup-aware greeting copy and centered PIN pad layout
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

- PIN configuration is stored in device secure storage and verified locally
- Backup exports are encrypted before they leave the app
- Vault-managed document attachments are encrypted at rest in Pineapple storage on-device
- Pineapple only materializes encrypted local sensitive files into a temporary readable cache when viewing or OCR needs access, and clears that cache when the app locks or backgrounds
- Trip hero images are now stored in the same encrypted-at-rest local format as Vault attachments; non-Vault exports still remain normal app-managed files unless they are inside an encrypted backup
- Pineapple still uses `expo-sqlite` for structured local records, so whole-database engine encryption is not yet in place; instead, Pineapple encrypts sensitive text fields before they are written, while keeping IDs, timestamps, routing fields, and expiry dates plaintext where the app needs them for queries and navigation
- Transient picker/cache copies are removed after import so scans are not left duplicated in common temp locations unnecessarily
- OCR-generated temporary images are cleaned up after use

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

3. Start Expo:

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

- PIN hashes are stored in secure device storage with a random salt
- SQLite stores only structured trip data, not raw PINs
- Sensitive vault previews stay hidden until the vault is authenticated
- App content is relocked after inactivity and on background return past the configured timeout
- Biometric unlock is optional and device-dependent
- Backup export/import uses password-protected AES encryption in the local backup layer
- Shared trip sync is optional and manual-share only in phase 3
- Conflict review is explicit; Pineapple does not silently overwrite local trip changes
- Web/PWA is supported as a companion surface, but the Android app remains the most secure home for sensitive vault images
- Notification text stays privacy-aware and does not include document numbers, images, or full document contents
- Expiry reminder notifications also avoid traveller names and specific document types so lock-screen reminder text stays more generic

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
- The web companion uses browser-safe local storage fallbacks for onboarding and security state instead of relying on native secure storage APIs
- Expo Go on Android can run Pineapple for general testing, but reminder notifications themselves still require a development build or release build

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
- Web/PWA companion scaffolding and companion-mode guidance

### Roadmap

- Stronger attachment-aware shared trip imports and richer participant acceptance flows
- Optional encrypted sync destinations beyond manual-share packet exchange
- Better in-app PDF viewing
- Multi-trip archive filtering and search

### Release support docs

- Google Play draft copy and screenshot guidance: [docs/GOOGLE_PLAY_DRAFT.md](docs/GOOGLE_PLAY_DRAFT.md)
- Internal release-readiness notes: [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md)
