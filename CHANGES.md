# Changelog

## 1.7.0 - 2026-03-20

- Travel-flow rebuild: trip detail now supports outbound/return transport entries with a real flight/train switch, searchable airline/operator selection, provider-logo rendering with safe fallback, and a cleaner contextual trip footer for `Packing`, `Itinerary`, `Flight`, and `Hotel`
- Hotel search upgrade: hotel stays can now be found with a lightweight OpenStreetMap / Nominatim lookup, then reviewed and corrected before save while still keeping the existing free hotel-image pipeline and local cache behavior
- Transfer flow fix: trip transfers are no longer a dead summary field; Pineapple now saves pickup provider, method, location, time, and notes as structured trip data with add/edit/clear support
- Shell simplification: the bottom nav now only exposes `Home`, `Vault`, and `SOS`, while `Trips`, `Packing`, and `Itinerary` move into clearer in-flow trip navigation instead of lingering as half-global tabs
- Home and trip-card routing polish: account now sits left of notifications in the home header, notifications stay on the far right, trip-card shortcut icons are larger, and the card now shows `Days till trip` beside the key-doc state
- Vault unlock and ordering fix: vault PIN unlock now uses the real lockout-aware auth path, biometric vault unlock closes cleanly, and the vault overview now renders in a stable order of passport, driving licence, health card, flights, train, transfer, hotel, then other travel docs
- Honest limitation: airline logos currently come from a lightweight mapped remote-logo source with safe initials fallback rather than a bundled official asset library, and Google Wallet flight handoff still remains an internal Pineapple route rather than a live wallet deep link

## 1.6.9 - 2026-03-20

- Destination picker reliability fix: trip destination suggestions now stay tappable while the keyboard is open, with safer focus/blur timing so selecting places like `Bali, Indonesia` actually applies the choice instead of dismissing the list
- Home-screen cleanup: removed the old `Travel Status` / `Document Vault` / `SOS` action band from the dashboard so the top of the app is cleaner and less repetitive
- Shell navigation adjustment: `Account` now moves out of the bottom nav and into the home top-right action row beside notifications, while the bottom nav keeps the simpler `Home`, `Vault`, `Trips`, and `SOS` layout
- Footer polish: enlarged the remaining bottom-nav icons and labels slightly so they read more clearly on-device without reintroducing the old white container treatment

## 1.6.8 - 2026-03-20

- Flight entry upgrade: travel segments now use a bundled searchable airport picker with IATA-code suggestions, so typing places like London, Newcastle, or New York resolves real airports even when the phone is offline
- Travel-segment data model upgrade: Pineapple now persists departure and arrival airport codes alongside the airport names, keeps those fields encrypted with the rest of structured trip data, and uses the codes in trip UI, PDF export, and reminders
- Hotel image pipeline: hotel stays now try to resolve a free image from the hotel name and typed address by combining address geocoding with Pexels-first and Wikimedia fallback queries, then cache the chosen image locally for later offline use
- Hotel UI cleanup: the trip detail hotel section now shows each stay with an image-led row and clearer save-state messaging while Pineapple fetches the hotel or local-area image in the background
- Honest limitation: free hotel-photo lookup cannot guarantee the exact property exterior every time, so Pineapple falls back to a relevant local-area stay/travel image when the hotel itself is not available from the free sources

## 1.6.7 - 2026-03-20

- Destination image system upgrade: trip cards now resolve imagery through a stricter pipeline with optional Pexels-first lookup, Wikimedia Commons fallback, encrypted local caching, and a guaranteed Pineapple fallback image so cards never render blank
- Root-cause image fix: the trip-card overlay stack was still painting an opaque fallback gradient over successful image results, so destination images were being hidden even when lookup succeeded; the card now keeps the readability overlay without blocking the photo itself
- Attribution UI: each trip card now includes a small `i` icon that opens Pineapple-styled attribution details for Pexels, Wikimedia Commons, or the bundled fallback image
- Data-model and migration update: trips now persist destination-image source, local cache path, remote source URL, attribution text, and attribution metadata without breaking older trips
- Runtime parity: native and web snapshot repositories now preserve the same destination-image fields, and first-trip/demo/test fixtures were updated so the new image pipeline stays consistent across onboarding and regression checks

## 1.6.6 - 2026-03-19

- Trip-creation crash fix: traced the Android device failure to `saveTrip -> upsertTrip -> createId`, where Pineapple was using `expo-crypto`'s `randomUUID()` for local record IDs and hitting the runtime error `Native crypto module could not be used to get secure random number`
- Runtime-safe ID generation: local record IDs for trips, travellers, documents, reminders, invites, conflicts, and related records now use one shared app-local ID generator instead of relying on the native crypto UUID path
- Secure randomness cleanup: genuine security-sensitive paths now share one explicit secure-random helper for PIN salts, encrypted-file keys, structured-data keys, and backup salt/IV generation instead of mixing `randomUUID()`, `getRandomValues()`, and `CryptoJS` randomness
- Cleaner save failures: trip creation and first-trip setup now translate low-level runtime errors into safer Pineapple user copy instead of exposing raw crypto/runtime wording to end users
- Regression coverage: added ID-generation and secure-random error-message tests so local record creation can keep working even if a runtime lacks the broken UUID path

## 1.6.5 - 2026-03-19

- Trip creation fix: creating a trip now works reliably even if the user only enters a destination, with safer save feedback and normalized destination handling in both the main Trips flow and the first-trip setup flow
- Destination search + hero-image fix: trip destination entry now uses a lightweight searchable town/city/country field, and the destination-image service was hardened so Wikipedia lookups stop failing on `429` responses and cache cleanly after the first successful fetch
- Trip-card polish: trip cards keep the premium image-led layout, remove the boxed styling around the flight/hotel/transfer shortcuts, and fall back to a clean gradient state instead of appearing blank when an image is unavailable
- Home action-row alignment: `Travel Status`, `Document Vault`, and `SOS` now render as matching cards with `SOS` pinned at the far right
- Vault cleanup: the Vault now leads with a quick-access row for flights, passports, and hotels, and its main document list now presents the physical-style passport, driving-licence, health-card, payment-card, and formal-document components as the primary items instead of bulky generic rows
- Honest limitation: Google Wallet deep-linking for flight tickets is still not implemented, so Pineapple now routes that quick-access shortcut into an internal flight-tickets screen that explains the current limitation and opens the trip travel area instead

## 1.6.4 - 2026-03-18

- Security hardening pass: upgraded current PIN protection to a stronger PBKDF2-based hash, persisted failed-attempt lockout state across app restarts, and reset cooldown state safely after valid PIN or biometric unlock
- Backup and restore hardening: tightened backup schema validation for malformed/tampered attachment metadata, sanitized restored filenames, and now force Pineapple back to a locked state after restore instead of leaving the previous unlock state in place
- Android privacy hardening: enabled `FLAG_SECURE` to block screenshots/screen recording capture, disabled Android OS backup in favor of Pineapple's encrypted backup flow, and removed unnecessary broad storage and overlay permissions
- Release-build hardening: release builds now default to code shrinking and resource shrinking, and the recommended fast test path is now an arm64 release APK rather than Expo Go
- Product workflow cleanup: Pineapple now treats installable APKs and release bundles as the supported test/release path, while keeping only internal crash-safe fallbacks for unsupported runtimes
- Documentation and threat-model update: added `SECURITY.md`, refreshed the README security model, and documented the current honest limitation that Pineapple still protects sensitive SQLite data with field-level encryption rather than full SQLCipher-style database encryption

## 1.6.3 - 2026-03-18

- Live document scanner integration: Pineapple now uses the native `react-native-document-scanner-plugin` scan flow for camera-based document capture on supported native builds, giving the Vault a real live edge-detection scanner instead of only the plain camera fallback
- Safe scanner abstraction: live capture is now wrapped behind a shared scanner service with a controlled fallback to the old camera picker path if the native scanner is unavailable, so the app stays usable across runtimes
- Cloudflare test page update: `pinapple-dev.pages.dev` and the stable `pineapple-latest.apk` download now point to the current 1.6.x release line instead of the stale 1.5.1 test build

## 1.6.2 - 2026-03-18

- Premium Vault and scan UX refresh: rebuilt the document-vault entry flow around a branded floating blue `+` action, a cleaner add/import sheet, and a more consistent blue-and-white Pineapple document shell
- Guided scan/import experience: document capture now uses a framed scan UI with clearer states for positioning, hold-steady, processing, extraction, and review handoff instead of abrupt picker jumps and raw OCR alerts
- OCR review polish: OCR success, warning, and failure outcomes now surface as in-app review notices inside the document editor so users can keep moving without jarring alert stacks
- Document editor/detail cleanup: source previews, cleaner review messaging, softer grouped rows, and improved modal styling now make Passport, Driving Licence, Health Card, Payment Card, and Formal Document flows feel like one coherent product
- Vault layout cleanup: removed the old utility-style controls card, tightened spacing and row actions, preserved physical-style document components in the list, and kept expiry/verification behaviors intact

## 1.6.1 - 2026-03-18

- Structured-data hardening: Pineapple now encrypts sensitive structured record fields before writing them to local storage instead of only encrypting attachment files, covering trips, travellers, vault metadata, itinerary, hotel, flight, emergency, and sync records
- One-time local migration: older installs are rewritten through the encrypted write path during bootstrap so existing SQLite travel data is not left in plaintext after upgrade
- Honest security model update: attachment encryption remains in place, and Pineapple now protects sensitive text fields too, but identifiers, routing fields, timestamps, and expiry dates still remain plaintext where the app needs them for indexing and routing
- Web snapshot parity: the companion web snapshot layer now protects the same sensitive text fields instead of reporting a protected state without actually encrypting them
- Trip hero-image feature from 1.6.0 remains in place unchanged: automatic destination imagery, cached local hero images, and right-side trip shortcuts still ship as part of the current build

## 1.6.0 - 2026-03-18

- Trip hero image upgrade: trip cards now resolve destination imagery automatically from the destination text, distinguish country-only entries from places, cache the chosen image locally after the first fetch, and fall back cleanly when no image can be resolved
- Premium trip-card redesign: trips now render as taller image-led cards with larger white destination text, dark readability overlays, and quick right-side shortcuts into flight info, hotel info, and transfer / pickup details
- Main-screen layout tidy-up: the home action row now keeps `Document Vault` and `SOS` at matching widths with cleaner side-by-side spacing while preserving the approved Pineapple shell
- Expanded local file protection: trip hero images now join Vault attachments in encrypted-at-rest Pineapple storage, and legacy plain trip covers are migrated into the protected format during bootstrap when possible
- New trip data wiring: trips now store destination type, remote hero reference, local cached hero state, and transfer / pickup summary without breaking older trips or older backups
- Reliability pass: destination-image lookup is non-blocking, failed lookups never block trip creation, and the app continues to render stable fallback cards offline

## 1.5.2 - 2026-03-17

- Auth/storage/OCR/backup audit pass: traced the live auth and data-protection paths, removed remaining plaintext Vault attachment writes, and tightened the post-audit weak spots instead of only documenting them
- Vault document encryption at rest: Pineapple now encrypts Vault-managed document files on device, decrypts them only into a managed temporary cache when OCR/viewing needs access, and clears that readable cache when the app locks or backgrounds
- Legacy Vault protection migration: existing readable Vault attachments are now migrated opportunistically into the encrypted-at-rest format during bootstrap without breaking startup if an old file is already missing
- Backup/export hardening: encrypted backups now export the real attachment contents from both plain and encrypted local files, and restore re-applies encrypted-at-rest storage for Vault attachments instead of writing restored sensitive files back in plaintext
- OCR/read-path hardening: OCR now materializes encrypted source files safely before recognition, document viewers now open readable temporary copies instead of raw encrypted paths, and OCR error messaging now falls back to user-safe wording
- Notification privacy tightening: expiry reminder notifications no longer include traveller names or specific document types, reducing sensitive information on the lock screen while keeping reminder timing intact

## 1.5.1 - 2026-03-16

- Unlock screen greeting + etiquette facts: removed the extra pre-auth landing step and rebuilt the real unlock screen with rotating multilingual greetings plus a curated set of 100 short etiquette facts for first meetings
- Removal of redundant locked screen: locked users now route straight into `/lock`, and the old `Pineapple is locked` overlay text was removed so the app no longer shows a dead intermediate lock layer
- Home screen simplification: removed the Pineapple logo, hamburger, title, travel-organiser text, quick actions, and recent alerts from the dashboard top area, replacing them with a cleaner greeting bar and bell-based alerts entry
- Alerts bell + red dot behavior: home now shows a bell icon with a red dot only when Pineapple has active trip or document alerts, and the alerts view now combines current trip issues with document expiry detail in one place
- Security hardening / encryption review: confirmed PIN state remains in secure device storage and backups remain encrypted, removed transient document-import copies from picker/cache directories after Pineapple stores them locally, and kept OCR temp cleanup in place to reduce plaintext leftovers
- Unlock performance improvements: bypassed the old root welcome screen for locked users, send successful PIN and biometric unlocks straight to the post-auth route, and deferred notification refresh work until after unlock so the app reaches the main shell faster

## 1.5.0 - 2026-03-16

- UI redesign to match approved mockup: rebuilt the main shell around a blue-and-white card layout with new shared headers, hero cards, action tiles, stat rows, and a floating-safe bottom navigation for `Home`, `Account`, `Vault`, `Trips`, and `SOS`
- Added dedicated native `Account` and `SOS` screens so the main app now matches the approved shell more closely while keeping existing Pineapple trip, traveller, and emergency functionality connected
- Updated the shared visual layer in `AppScreen`, `AppCard`, and `AppButton`, and added reusable UI primitives for the new mockup-inspired layout system
- OCR-first document import flow: replaced the old add-document ordering with `Scan document`, `Add photo for OCR`, then `Enter manually`, and applied that order in both Vault onboarding and later Vault use
- Added live camera scan capture for document intake and made OCR-supported document types open directly into editable review after scan/photo/PDF import
- Android bottom navigation safe-area fix: replaced the old tab bar with a safe-area-aware custom bottom nav so icons and labels stay visible above Pixel-style 3-button system navigation
- Kept the Round 4 auth route fix intact so successful PIN or biometric unlock still lands in the main app shell instead of looping between auth and setup routes

## 1.4.20 - 2026-03-16

- Round 4 testing fixes: identified the main auth failure as a route-guard loop that redirected unlocked no-trip users from `/create-first-trip` to `/home` and then immediately back again
- Replaced the ad hoc auth redirect checks with a single shared route resolver so onboarding, lock, PIN setup, biometric unlock, and main-app entry all use the same source of truth
- Confirmed the post-unlock main app route is `/home`, backed by the existing tab shell in `app/(tabs)/_layout.tsx` and `app/(tabs)/home.tsx`
- Added auth-flow debug logging for bootstrap, PIN setup, PIN unlock, biometric unlock, and route-guard decisions in development builds
- Added regression tests for the no-trip post-auth route so Pineapple no longer loops or stalls behind the auth gate after successful unlock

## 1.4.19 - 2026-03-16

- Round 3 testing fixes: removed the stale sand-colored backing baked into the native Android splash drawables so the launch icon now renders cleanly without the beige ring
- Rebuilt the auth keypad so setup and unlock now use an integrated `Enter 0 Cancel` bottom row and no longer rely on separate standalone Enter/Cancel buttons
- Fixed the main post-PIN crash path by removing redundant success navigation from the auth screens and letting the central auth route guard handle the transition after state changes
- Reduced PIN setup race risk by persisting the initial PIN and biometric preference in one auth write instead of two back-to-back secure storage updates
- Hardened PIN create/unlock error handling with safer validation and development logging so auth failures surface cleanly instead of crashing silently

## 1.4.18 - 2026-03-16

- Round 2 testing fixes: removed the extra JS startup loading layer so Pineapple now stays on the native splash until the first real screen is ready, instead of flashing a second splash-style screen
- Fixed the Android startup theme/background handoff so the app launches cleanly into the intended Pineapple blue instead of briefly showing the old sand splash colors
- Fixed the welcome screen centering by giving non-scroll screens a full-height layout container and rebalancing the welcome composition so the icon and `Let's go` button sit in the true visual center
- Fixed PIN setup and unlock centering by rebuilding the auth screens around symmetrical top, center, and bottom rails so the keypad remains centered across common Android screen sizes
- Kept the Round 1 PIN, Enter, Cancel, and biometric flows intact while tightening the underlying layout containers

## Distribution update - 2026-03-16

- Added a live Cloudflare Pages test-download site at `https://pinapple-dev.pages.dev`
- Added Cloudflare R2 hosting for the latest installable Android test APK so testers can download the current Pineapple phone build directly without using GitHub artifacts
- Added the static page source under `cloudflare/pinapple-dev/` and documented the update flow in the README
- Added a one-command `npm run deploy:pinapple-dev` script to upload the latest APK, refresh the page metadata, and redeploy the Cloudflare test page

## 1.4.16 - 2026-03-15

- Moved Pineapple back to Expo SDK 55 with the matching React Native 0.83, React 19.2, Expo Router 55, and supporting native module versions
- Re-enabled the Android New Architecture setting required by Expo SDK 55 and removed the deprecated edge-to-edge compatibility property from `gradle.properties`
- Updated version metadata for the SDK 55 return and documented the current Node `20.19.4+` requirement for local native build verification

## 1.4.15 - 2026-03-15

- Added a full filesystem backup copy of the project at `/home/andrew/back up pineapple` before starting APK release-flow setup work
- Added Android build scripts for debug APK, release APK, and Play Store AAB generation
- Tuned the APK scripts for ARM device builds, stale native-cache cleanup, and no-daemon execution so sideload testing on a spare phone avoids emulator-only native build failures and produces smaller installable APKs
- Added a stable copied APK output at `build/apk/` so testing does not depend on Gradle's internal debug/release folder layout
- Added optional upload-keystore support via `PINEAPPLE_UPLOAD_*` environment variables while keeping local release APKs installable for testing when no keystore is configured yet
- Documented the APK/AAB output paths and the testing-to-Play-Store build flow in the README

## 1.4.14 - 2026-03-15

- Added a docs-specific first-time setup flow in Vault for empty trips, with secure local guidance, quick traveller-name capture, and strong first-document actions
- Added tailored prompts for passport or driving-licence first, then health card, insurance/formal docs, and other travel records
- Kept returning Vault flows unchanged once at least one document exists, while improving the no-results empty state for filtered views
- Added regression coverage for the new document-vault setup-state logic

## 1.4.13 - 2026-03-15

- Added a shared document-support layer for scan viewing, copy actions, verification badges, expiry badges, and extracted-field editing across Passport, Driving Licence, Health Card, Payment Card, and Formal Documents
- Added a reusable full-screen source viewer flow for local images and PDFs, with clearer fallback messaging when no file is attached
- Reduced duplicate metadata-row rendering across the document open views and aligned Vault detail actions around the shared viewer and edit flow
- Added regression tests for the shared verification/document-viewer helpers and kept the document-specific layouts intact

## 1.4.12 - 2026-03-15

- Added a dedicated formal-document Vault experience for insurance records, certificates, confirmations, letters, passes, and similar paperwork with an official folder-style closed state
- Added a document-focused open view that pairs extracted metadata with the original image/PDF preview, plus copy, edit, and source-opening actions
- Added on-device OCR parsing for formal paperwork metadata, including review warnings when multiple candidate dates or reference codes are detected
- Added safe local persistence, migration coverage, and regression tests for formal-document records so older installs continue upgrading without data loss

## 1.4.11 - 2026-03-15

- Extended on-device OCR for passports, driving licences, and health cards so attached PDFs can be read across multiple pages instead of only the first page
- Added OCR review warnings when Pineapple detects competing dates or document/card numbers, and surfaced those notes directly in the Vault extraction flow
- Added a dedicated payment-card Vault experience with a premium closed card, a secure details drawer, masked-number defaults, explicit reveal/hide action, and non-sensitive copy behaviour
- Added safe local persistence and migration support for payment-card records plus regression tests for OCR review warnings and secure card masking/copy rules

## 1.4.10 - 2026-03-15

- Added on-device driving-licence OCR for local front-scan images and PDFs in the Android build, with editable extracted fields kept in the existing Vault flow
- Added a dedicated GHIC / EHIC health-card document experience with a physical closed card, a quick-read open view, verification and expiry badges, copy actions, and editable extracted fields
- Added safe local persistence and migration support for health-card data so older installs continue upgrading without losing existing document records
- Added regression tests for driving-licence OCR parsing, health-card OCR parsing, health-card verification/copy behaviour, and health-card normalization

## 1.4.9 - 2026-03-15

- Added passport OCR preprocessing for attached PDF scans by rendering the first page to an image before ML Kit extraction in the Android build
- Added a dedicated UK driving-licence Vault experience with a physical photocard closed state, a fuller official record open state, verification and expiry badges, and copy/edit actions
- Added safe local storage and migration support for driving-licence extracted fields plus front and back scan files
- Added regression tests for driving-licence verification/copy behaviour and expanded passport OCR scan eligibility coverage

## 1.4.8 - 2026-03-15

- Added real on-device passport OCR using ML Kit in the Vault passport flow, including MRZ parsing and editable field prefill
- Added explicit `Extract from scan` actions for passport images in the editor and passport detail view, while keeping save confirmation manual
- Added regression tests for MRZ parsing, fallback labelled-text parsing, OCR merge behaviour, and image-scan eligibility checks
- Documented the current OCR scope: Android native build only, image scans only, with manual editing still available for PDFs and unsupported runtimes

## 1.4.7 - 2026-03-15

- Added a passport-specific Vault experience with a physical closed cover, an interactive passport spread, editable extracted passport fields, MRZ-style presentation, copy action, scan entry point, expiry badge, and verification badge
- Added safe local passport-data persistence and migration support without refactoring the wider document system
- Added regression tests for passport data derivation, verification state, copy payload generation, and MRZ-style formatting

## 1.4.6 - 2026-03-14

- Reset stale Expo Go first-run PIN state when there is no onboarding flag and no trip data, so fresh testing no longer gets blocked by an old PIN
- Restyled the setup-pin and lock screens with the requested blue background, round white keypad buttons, and blue keypad text
- Added the provided fingerprint SVG as the biometric icon inside white circular auth controls

## 1.4.5 - 2026-03-14

- Replaced the generated pineapple artwork with the provided sunglasses icon pack across launcher, splash, favicon, and adaptive icon assets
- Updated the in-app Pineapple brand mark to render the supplied icon/mark artwork instead of the old SVG drawing
- Updated the brand asset generator so future asset rebuilds continue using the provided logo files

## 1.4.4 - 2026-03-14

- Fixed an Expo Go Android crash by lazy-loading `expo-notifications` only in supported runtimes instead of importing it during app boot
- Added clearer Settings messaging when reminders are unavailable in Expo Go on Android, while keeping notifications available in development and release builds
- Verified web and Android exports after the startup/runtime compatibility fix

## 1.4.3 - 2026-03-14

- Fixed startup blocking by removing app-managed directory creation from the boot path
- Added platform-safe local storage fallbacks so the web companion no longer depends on native-only secure/file storage behavior during startup
- Kept file-directory creation lazy so Android import, export, and backup flows still work without slowing cold launch

## 1.4.17 - 2026-03-16

- Round 1 testing fixes: centered the welcome screen icon, updated the first-launch greeting copy, and restyled the welcome/onboarding/auth screens with the requested blue-and-white treatment
- Rebuilt PIN setup and unlock around explicit Enter and Cancel actions, removed the old 4-digit vs 6-digit chooser, and now accept any PIN length of 4 digits or more during setup
- Fixed setup and unlock navigation loops by removing auto-submit side effects and routing explicitly after successful PIN creation or unlock
- Hardened biometric auth handling so missing hardware, disabled enrollment, or runtime failures fall back safely instead of crashing the app
- Fixed the cold-start loading background so the first visible screen and splash transition stay aligned with the intended blue welcome flow
- Fixed Android release builds by pointing Hermes at the correct compiler package for React Native 0.83 / Expo SDK 55 and regenerated the standalone phone-test APK

## 1.4.2 - 2026-03-14

- Fixed orphaned local file cleanup when deleting vault documents, deleting trips, replacing trip cover images, clearing local data, and restoring backups
- Added proper metadata-only document support so users can save passports, insurance, and other records even when no file is attached yet
- Added duplicate-document detection in the vault save flow to catch accidental re-imports before creating another record
- Improved reminders settings messaging for revoked notification permission and tightened a few remaining backup/import error messages
- Added automated tests for metadata-only document validation and duplicate-document detection

## 1.4.1 - 2026-03-14

- Added a retryable startup error state so failed local bootstrap does not leave the app hanging silently
- Stopped ordinary local data refreshes from prompting for notification permission and moved reminder permission requests into the explicit Settings flow
- Hardened media import UX with clearer denied-permission and picker-failure messaging for vault and trip cover imports
- Added confirmation before deleting vault documents and improved warnings-screen navigation for faster editing
- Added onboarding/settings privacy wording plus Google Play draft documentation and release-readiness notes for internal testing
- Added automated tests for onboarding completion fallback logic and backup schema validation

## 1.4.0 - 2026-03-13

- Expanded document support for driving licences and ID cards and added per-document expiry reminder settings with stored schedules
- Added a full Step 6 document expiry system with reusable validity states, migration-safe defaults, home dashboard counts, a dedicated warnings screen, and Travel Mode warning surfacing
- Added configurable default expiry reminder schedules and silent reminder support in Settings, all using local device notifications only
- Added expiry-safe normalization for older local data, backup restores, and web snapshot storage
- Added automated tests for expiry calculations, reminder planning, dashboard counts, and legacy normalization

## 1.3.3 - 2026-03-13

- Added a reusable local document-expiry warning system with shared thresholds for expired, 7-day, 30-day, 3-month, and 6-month states
- Added stronger passport six-month warnings plus traveller-aware insurance and expiry prompts across the dashboard, vault, trip detail, and document detail surfaces
- Added an `Enable expiry reminders` setting and extended local-only notification scheduling for passports, GHIC / EHIC cards, insurance, visas, and supported custom documents
- Added additive app-preferences migration coverage for expiry reminder settings with offline-safe upgrade handling on native and web storage
- Updated README documentation for supported document expiry warnings, reminder behavior, and current limitations

## 1.3.2 - 2026-03-13

- Improved local backup and restore with stricter backup-file validation, explicit replace confirmation, and clearer Settings messaging
- Switched exported backup files to the `.pineapplebackup` extension and surfaced the last backup timestamp in Settings
- Added safe tracking of backup creation time in app preferences with additive migration coverage for existing installs
- Hardened attachment handling so backups still complete when a referenced local file is missing, while keeping metadata in the backup snapshot
- Documented backup contents, restore behavior, and current attachment handling in the README

## 1.3.1 - 2026-03-13

- Added a five-screen first-launch onboarding flow covering welcome, document storage, Travel Mode, import/share readiness, and expiry warnings
- Added biometric preference selection to PIN setup and routed first-launch users into a dedicated create-first-trip screen
- Added a post-creation setup checklist for passports, boarding passes, hotel details, packing, and Travel Mode readiness
- Persisted onboarding completion locally so the flow only appears once and does not block normal startup after completion

## 1.3.0 - 2026-03-13

- Added phase 3 SQLite migrations and snapshot support for app preferences, trip participants, invites, shared-trip state, and sync conflicts
- Added local notification scheduling via `expo-notifications` for trip start, passport/GHIC expiry, insurance gaps, packing completeness, flight check-in, and excursion reminders
- Added a dedicated Settings screen covering security, reminders, manual-share sync, privacy masking, backup/recovery, and conflict review
- Added optional shared-trip export/import with participant role records, invite codes, sync status metadata, and manual conflict resolution
- Improved Trip Detail with participant avatars, share controls, invite handling, and trip-scoped conflict surfacing
- Improved Travel Mode with next-action and today timeline cards while preserving the phase 1/2 visual language
- Added web/PWA companion scaffolding and documentation clarifying Android as the primary secure vault experience
- Updated docs and version metadata for phase 3

## 1.2.0 - 2026-03-13

- Added phase 2 multi-traveller support with DOB, nationality, relationship type, notes, and avatar badge colours
- Added additive SQLite migrations for traveller profile fields, packing assignment scope, packing priorities, join-table assignments, and reminder settings
- Expanded packing with multi-traveller assignment, templates, duplicate action, priority labels, and per-traveller progress
- Expanded Vault with traveller/type filtering, grouped views, and document expiry surfacing
- Upgraded Travel Mode with family overview plus traveller-specific swipe/tab summaries
- Added printable branded trip PDF export with privacy-oriented options
- Added encrypted local backup export/import with attachment preservation
- Improved Home and Trip dashboard surfaces with timeline cards, missing info prompts, and trip status chips
- Added reminder groundwork toggles for future local notification work
- Updated docs and metadata for phase 2

## 1.1.0 - 2026-03-13

- Rebuilt the project into a full Expo Router mobile app for Pineapple
- Added a premium travel-focused design system and a new Pineapple logo/app icon asset set
- Implemented local-first SQLite persistence for trips, travellers, documents, packing, travel, hotel, itinerary, and emergency data
- Added secure PIN setup, lock/unlock flow, biometric option, inactivity auto-lock, and privacy overlay behavior
- Built Home, Trips, Packing, Itinerary, Vault, Trip Detail, and Travel Mode screens
- Added local image/PDF document intake with app-managed file storage
- Added development demo-data reset flow
- Updated project metadata, README, and supporting docs
