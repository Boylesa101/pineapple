# Release Readiness

## Scope

This pass focused on stabilising Pineapple for internal Android testing and Google Play preparation without changing the established visual language.

## Checks completed

- Verified first-launch and upgraded-install onboarding gating
- Verified document expiry warning logic, dashboard counts, and warning filters
- Verified local backup schema validation and restore safety messaging
- Reviewed notification scheduling and permission prompting for local-only reminders
- Reviewed vault and trip image import flows for denied-permission and picker-failure handling
- Reviewed destructive actions and critical empty states

## Bugs fixed

- Added a retryable startup error state instead of leaving bootstrap failures silent
- Stopped notification permission prompts from being triggered during ordinary app refreshes
- Added explicit permission handling and clearer messaging for photo imports
- Added confirmation before deleting vault documents
- Added warnings-screen row navigation so expiry items are easier to act on
- Clarified onboarding and settings privacy copy around local-only file and email import behavior

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
