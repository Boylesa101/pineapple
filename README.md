## Pineapple

Pineapple is a local-first holiday planner and secure travel organiser built with Expo, React Native, and TypeScript. It runs fully offline after installation and keeps structured trip data in SQLite, sensitive security settings in secure device storage, and attached files in app-managed on-device storage.

### Core features

- PIN setup and lock flow with 4-digit or 6-digit PIN support
- Optional biometric unlock when the device supports it
- Expo Go first-run testing now clears stale PIN state when no onboarding or trip data exists yet
- Auto-lock after inactivity and best-effort privacy overlay for the app switcher
- Bottom-tab shell for Home, Trips, Packing, Itinerary, and Vault
- Trip CRUD with optional local cover image
- Multi-traveller trip profiles with DOB, nationality, relationship type, notes, and colour badges
- Traveller management with passport, GHIC / EHIC, and medical notes
- Secure vault for passports, insurance, visas, boarding passes, hotel bookings, excursion tickets, and custom docs
- Passport documents now render with a dedicated physical passport cover and identity spread experience instead of a generic document card
- Passport image scans can now prefill passport fields with on-device OCR and MRZ parsing in the Android build, while keeping the extracted fields editable before save
- Metadata-only document entries for cases where you want reminders and document numbers before attaching a file
- Vault filtering by traveller or document type with grouped traveller/type views and document expiry warnings
- Local image upload and PDF import with sensitive preview locking
- Reusable document expiry status system for passports, visas, GHIC / EHIC, travel insurance, driving licences, ID cards, and custom docs with expiry dates
- Packing lists grouped by category with multi-traveller assignment, templates, duplicate action, and priority flags
- Flight / travel segment management
- Hotel stay management
- Chronological itinerary timeline
- Emergency reference storage per trip
- High-contrast Travel Mode with family overview, traveller tabs/swipe, quick copy actions, and temporary sensitive reveal
- Printable branded trip PDF export with inclusion/hide controls
- Encrypted local backup export/import with `.pineapplebackup` files, validation, and attachment preservation where the original local files are still available
- Local reminders and notifications for trip start, passport/GHIC expiry, missing insurance, packing completeness, flights, and excursions
- Optional local expiry reminders for passports, GHIC / EHIC cards, insurance, visas, and supported custom documents
- Dedicated expiry warnings screen with filters for all, expiring soon, expired, and notifications off
- Optional manual-share trip sync with participant roles, invite records, conflict review, and trip-share export/import
- Expanded settings surface for security, reminders, sync, backup/restore, and privacy masking
- Expo web/PWA companion mode for trip overview, packing, itinerary, emergency info, and printable summaries
- Five-screen first-launch onboarding with PIN setup, first-trip creation, and a setup checklist
- Retryable startup recovery if local bootstrap fails unexpectedly
- Lighter startup path with lazy file-directory creation for faster cold launch
- Development-only demo data reset for QA

### Stack

- Expo SDK 54
- React Native 0.81
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
- Backup encryption via PBKDF2-derived AES with HMAC integrity using `crypto-js`
- State management via `zustand`

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
- It currently works with local image scans stored on the device
- PDF passport files still need manual review and field entry
- Pineapple always lets the user review and edit extracted passport fields before saving

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

### Backup and restore

- Backups are exported as encrypted `.pineapplebackup` files from Settings > Backup & Restore
- Backup payloads include trips, travellers, document metadata, packing items, itinerary items, hotel stays, travel segments, emergency info, reminder settings, app preferences that are safe to restore, participant/share records, and sync conflict records
- Pineapple attempts to include locally managed attachment files such as trip cover images and vault files; if a referenced local file is no longer readable, its database metadata remains in the backup and the export still completes
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
