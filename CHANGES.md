# Changelog

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
