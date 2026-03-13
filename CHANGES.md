# Changelog

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
