# Pineapple Security Notes

## Threat model

Pineapple is designed for local-first handling of sensitive travel data on Android devices. The main attack surfaces are:

- Lost or stolen phone:
  risk: high
  mitigation: PIN gate, optional biometrics, app resume lock, screenshot blocking, encrypted document/file storage, encrypted sensitive structured fields
- Malicious app on the same device:
  risk: medium
  mitigation: app-private storage, SecureStore-backed key material, no exported content providers for app data, generic notification text
- Rooted device or forensic extraction:
  risk: high
  mitigation: encrypted attachments, encrypted sensitive record fields, encrypted backups, no plaintext PIN storage
  limitation: a rooted device still has a stronger local attack position than Pineapple can fully neutralize
- Reverse engineering the APK:
  risk: medium
  mitigation: release minification, resource shrinking, no hardcoded encryption keys, no production debug logging
- Backup theft:
  risk: high
  mitigation: password-based encrypted backup with integrity validation
- Local file extraction attempts:
  risk: medium
  mitigation: document attachments and trip hero images are encrypted at rest and only materialized temporarily when needed
- Memory inspection / active compromise:
  risk: medium to high
  mitigation: shortest practical materialization windows, relock on background timeout, no long-lived readable vault cache
  limitation: Pineapple cannot fully protect against a fully compromised runtime
- Screen recording / screenshots:
  risk: medium
  mitigation: Android `FLAG_SECURE` is enabled for the main activity
- PIN brute force:
  risk: medium
  mitigation: persistent cooldown after repeated failures, stronger PIN hashing, lock-state persistence across restarts

## Encryption model

- PIN secrets:
  stored in SecureStore, never in SQLite
- Sensitive structured data:
  encrypted before writing to SQLite
- Sensitive files:
  vault attachments and trip hero images are encrypted at rest in app storage
- Backups:
  encrypted with PBKDF2-derived AES plus HMAC integrity

### Honest limitation

Pineapple does not currently use SQLCipher or full database-engine encryption. It protects sensitive fields before they are written and keeps non-sensitive query/routing fields plaintext where the app needs them for navigation, filtering, reminders, and local queries.

Manual-share trip packets are validated and newly exported packets include a SHA-256 integrity hash, but they are not encrypted or cryptographically authenticated in the current release.

Pineapple web is a companion surface and should not be treated as equivalent to the installed Android app for sensitive vault data, encrypted backups, or manual-share sync.

## Release hardening

- Android release builds use minification and resource shrinking
- cleartext traffic is disabled
- Android OS backup is disabled in favor of Pineapple's own encrypted backup flow
- screenshots are blocked in the Android app

## Operational recommendations

- test only with release APKs or release-style builds
- use a real upload keystore before Play Store submission
- keep backup passwords strong and unique
- avoid using rooted devices for real travel data
