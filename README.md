## Pineapple

Pineapple is a local-first holiday planner and secure travel organiser built with Expo, React Native, and TypeScript. v1 runs fully offline after installation and keeps structured trip data in SQLite, sensitive security settings in secure device storage, and attached files in app-managed on-device storage.

### Core features

- PIN setup and lock flow with 4-digit or 6-digit PIN support
- Optional biometric unlock when the device supports it
- Auto-lock after inactivity and best-effort privacy overlay for the app switcher
- Bottom-tab shell for Home, Trips, Packing, Itinerary, and Vault
- Trip CRUD with optional local cover image
- Traveller management with passport, GHIC / EHIC, and medical notes
- Secure vault for passports, insurance, visas, boarding passes, hotel bookings, excursion tickets, and custom docs
- Local image upload and PDF import with sensitive preview locking
- Packing lists grouped by category with traveller assignment and luggage type
- Flight / travel segment management
- Hotel stay management
- Chronological itinerary timeline
- Emergency reference storage per trip
- High-contrast Travel Mode with quick copy actions and temporary sensitive reveal
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
- `AppSecuritySettings`

### Security model

- PIN hashes are stored in secure device storage with a random salt
- SQLite stores only structured trip data, not raw PINs
- Sensitive vault previews stay hidden until the vault is authenticated
- App content is relocked after inactivity and on background return past the configured timeout
- Biometric unlock is optional and device-dependent

### Brand direction

- Soft sand backgrounds and white cards
- Ocean blue accents
- Pineapple gold highlights
- Sunset coral for timeline and action emphasis
- Poppins for headings
- Inter for body copy
- Minimal geometric pineapple mark for icon, splash, and lock flows

### Roadmap

- Family sharing and traveller collaboration
- Optional encrypted sync
- Better PDF viewing in-app
- Rich reminders and notifications
- Multi-trip archive filtering and search
