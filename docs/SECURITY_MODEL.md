# Pineapple Security Model

## Storage

- Structured app data is stored locally in SQLite.
- PIN configuration is stored in secure device storage.
- PIN values are never stored in plaintext.
- Imported files are copied into app-managed storage under the app document directory.
- Backup exports are written locally and can be shared via device-native share sheets.
- Shared-trip sync metadata, participants, invites, and conflict records are stored locally in SQLite alongside trip data.

## PIN handling

- First launch requires a 4-digit or 6-digit PIN.
- PINs are salted and hashed before persistence.
- The app starts in a locked state whenever a PIN is already configured.

## Runtime protections

- Auto-lock is enforced after inactivity.
- Returning from background past the auto-lock timeout requires re-authentication.
- Sensitive vault previews remain hidden until the vault is unlocked.
- A privacy overlay is applied while the app is backgrounding, where feasible.
- Travel Mode keeps sensitive values hidden by default and supports temporary reveal windows.
- Local reminders are scheduled on-device only and do not require a remote service.

## Biometrics

- Biometrics are optional.
- Pineapple checks device hardware and enrollment before enabling the feature.
- Biometric auth can unlock the app or the vault session.

## Phase 2 and 3 backup/sync layer

- Backup export/import uses password-protected AES encryption via a local JS crypto layer.
- PIN hashes are not exported.
- Safe preferences such as auto-lock duration may be restored.
- Backup restore replaces current local structured data.
- Shared trip exchange in phase 3 is manual-share only. Full vault images are intentionally not part of the shared-trip packet.
- Shared-trip exchange now uses a dedicated `pineapple-shared-trip-secure` envelope with PBKDF2-derived AES encryption plus HMAC integrity, and the receiving device must enter the separately shared transfer code before import.
- Conflicts are surfaced for manual review instead of silently overwriting local data.

## Known tradeoffs

- PDFs are stored locally and can be opened with the device viewer, but they are not rendered inline inside the app yet.
- Backup encryption is implemented in the app layer rather than a platform-specific encrypted archive format.
- Web/PWA is a companion surface and should not be treated as the primary place for sensitive document storage, encrypted backups, or manual-share sync.
