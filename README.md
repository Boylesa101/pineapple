## Pineapple

Pineapple is a local-first holiday planner and secure travel organiser built with Expo, React Native, and TypeScript. It runs fully offline after installation and keeps structured trip data in SQLite, sensitive security settings in secure device storage, and attached files in app-managed on-device storage.

### Core features

- PIN setup and lock flow with 4-digit or 6-digit PIN support
- Optional biometric unlock when the device supports it
- Auto-lock after inactivity and best-effort privacy overlay for the app switcher
- Bottom-tab shell for Home, Trips, Packing, Itinerary, and Vault
- Trip CRUD with optional local cover image
- Multi-traveller trip profiles with DOB, nationality, relationship type, notes, and colour badges
- Traveller management with passport, GHIC / EHIC, and medical notes
- Secure vault for passports, insurance, visas, boarding passes, hotel bookings, excursion tickets, and custom docs
- Vault filtering by traveller or document type with grouped traveller/type views and expiry warnings
- Local image upload and PDF import with sensitive preview locking
- Packing lists grouped by category with multi-traveller assignment, templates, duplicate action, and priority flags
- Flight / travel segment management
- Hotel stay management
- Chronological itinerary timeline
- Emergency reference storage per trip
- High-contrast Travel Mode with family overview, traveller tabs/swipe, quick copy actions, and temporary sensitive reveal
- Printable branded trip PDF export with inclusion/hide controls
- Encrypted local backup export/import with attachment preservation
- Local reminders and notifications for trip start, passport/GHIC expiry, missing insurance, packing completeness, flights, and excursions
- Optional manual-share trip sync with participant roles, invite records, conflict review, and trip-share export/import
- Expanded settings surface for security, reminders, sync, backup/recovery, and privacy masking
- Expo web/PWA companion mode for trip overview, packing, itinerary, emergency info, and printable summaries
- Five-screen first-launch onboarding with PIN setup, first-trip creation, and a setup checklist
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
- Backup encryption via `crypto-js` AES
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
npm run typecheck
npx expo export --platform ios --platform android
npx expo export --platform web
```

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

### Brand direction

- Soft sand backgrounds and white cards
- Ocean blue accents
- Pineapple gold highlights
- Sunset coral for timeline and action emphasis
- Poppins for headings
- Inter for body copy
- Minimal geometric pineapple mark for icon, splash, and lock flows

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
