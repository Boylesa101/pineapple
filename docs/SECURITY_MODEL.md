# Pineapple Security Model

## Storage

- Structured app data is stored locally in SQLite.
- PIN configuration is stored in secure device storage.
- PIN values are never stored in plaintext.
- Imported files are copied into app-managed storage under the app document directory.
- Backup exports are written locally and can be shared via device-native share sheets.

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

## Biometrics

- Biometrics are optional.
- Pineapple checks device hardware and enrollment before enabling the feature.
- Biometric auth can unlock the app or the vault session.

## Known v1 tradeoff

## Phase 2 backup layer

- Backup export/import uses password-protected AES encryption via a local JS crypto layer.
- PIN hashes are not exported.
- Safe preferences such as auto-lock duration may be restored.
- Backup restore replaces current local structured data.

## Known tradeoffs

- PDFs are stored locally and can be opened with the device viewer, but they are not rendered inline inside the app yet.
- Backup encryption is implemented in the app layer rather than a platform-specific encrypted archive format.
