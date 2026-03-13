# Pineapple Project Charter

## Product goal

Pineapple is a calm, premium, local-first holiday planner for mobile devices. v1 focuses on secure on-device organisation without any backend dependency.

## Current shipped outcomes

- Make trip planning usable fully offline after installation
- Keep travel details, documents, packing lists, hotel info, itinerary items, and emergency references in one place
- Provide a fast Travel Mode screen for use under time pressure
- Protect sensitive data with a clean PIN-first unlock flow
- Support multiple travellers per trip with family-oriented organisation
- Support printable travel-pack export and encrypted local backup/restore

## Constraints

- Expo + React Native + TypeScript
- SQLite for structured local data
- Secure device storage for security settings
- App-managed local storage for images and PDFs
- No cloud sync in v1
- No backend dependency in phase 2

## Quality bar

- Modular, typed, extendable code
- Good empty states and polished baseline UX
- Calm premium visual language
- No remote backend dependency
- Backward-compatible local data upgrades from phase 1
