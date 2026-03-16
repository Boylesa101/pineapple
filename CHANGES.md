# Changelog

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
