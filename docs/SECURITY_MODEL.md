# Pineapple Security Model

## Storage

- Structured app data is stored locally in SQLite.
- PIN configuration is stored in secure device storage.
- PIN values are never stored in plaintext.
- Imported files are copied into app-managed storage under the app document directory.

## PIN handling

- First launch requires a 4-digit or 6-digit PIN.
- PINs are salted and hashed before persistence.
- The app starts in a locked state whenever a PIN is already configured.

## Runtime protections

- Auto-lock is enforced after inactivity.
- Returning from background past the auto-lock timeout requires re-authentication.
- Sensitive vault previews remain hidden until the vault is unlocked.
- A privacy overlay is applied while the app is backgrounding, where feasible.

## Biometrics

- Biometrics are optional.
- Pineapple checks device hardware and enrollment before enabling the feature.
- Biometric auth can unlock the app or the vault session.

## Known v1 tradeoff

- PDFs are stored locally and can be opened with the device viewer, but they are not rendered inline inside the app yet.
