# Release Readiness

## Scope

This pass focused on stabilising Pineapple for internal Android testing and Google Play preparation without changing the established visual language. The shipped first-run path is now language, name, PIN, biometrics, then passport / traveller setup.

## Checks completed

- Verified first-launch and upgraded-install onboarding gating
- Verified document expiry warning logic, dashboard counts, and warning filters
- Verified local backup schema validation and restore safety messaging
- Reviewed notification scheduling and permission prompting for local-only reminders
- Reviewed vault and trip image import flows for denied-permission and picker-failure handling
- Reviewed destructive actions and critical empty states

## Bugs fixed

- Tightened onboarding completion to use explicit stored state with safer migration for older installs
- Restored the intended first-run order so language and name no longer get skipped before PIN setup
- Hardened shared-trip import with schema validation and integrity checks for newly exported packets
- Removed stale Android exact-alarm and boot permissions from the checked-in native config
- Clarified that Pineapple web is a companion surface rather than a supported sensitive-data surface
- Reduced obvious mixed-language UI by wiring the selected app language through traveller setup, account, warnings, trips, packing, itinerary, and the legal/support wrapper screens

## Remaining known limitations

- Pineapple does not auto-read a live inbox; “email import” is limited to local files the user chooses on-device
- OCR-style date extraction is still manual/user-confirmed rather than automatic
- Inline PDF rendering is still limited; Pineapple opens local PDFs with the device viewer

## Recommended internal test focus

- First install through onboarding, PIN setup, first trip, and checklist
- Vault add/edit/delete flows with denied and granted photo permissions
- Expiry reminder enabling, disabling, and editing existing document schedules
- Backup export, restore confirmation, and invalid-file handling
- Travel Mode with masked and temporarily revealed sensitive values
