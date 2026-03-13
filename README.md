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
- Reminder model groundwork for passport expiry, packing, and trip-start warnings
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

### Security model

- PIN hashes are stored in secure device storage with a random salt
- SQLite stores only structured trip data, not raw PINs
- Sensitive vault previews stay hidden until the vault is authenticated
- App content is relocked after inactivity and on background return past the configured timeout
- Biometric unlock is optional and device-dependent
- Backup export/import uses password-protected AES encryption in the local backup layer

### Brand direction

- Soft sand backgrounds and white cards
- Ocean blue accents
- Pineapple gold highlights
- Sunset coral for timeline and action emphasis
- Poppins for headings
- Inter for body copy
- Minimal geometric pineapple mark for icon, splash, and lock flows

### Current phase 2 additions

- Family and multi-traveller support across trips, packing, vault, and travel mode
- Printable travel pack PDF export
- Encrypted local backup export/import
- Dashboard prompts and trip-state improvements
- Reminder groundwork for later local notification scheduling

### Roadmap

- Family sharing across devices
- Optional encrypted sync
- Better in-app PDF viewing
- Actual local notification scheduling on top of reminder models
- Multi-trip archive filtering and search
