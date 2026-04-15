# Transport Stack

Pineapple now renders trip transport items through one shared stack-card system with four states:

- `top_of_stack`: the lead card with the strongest hierarchy
- `in_stack`: compact branded cards lower in the stack
- `clicked`: the selected card expanded with a white inline summary container
- `open`: a full white transport detail surface with a branded header

## Shared model

UI components do not read provider payloads directly. Every provider maps into the unified transport model in `src/services/transport/types.ts`.

Key fields include:

- `type`
- `operatorName`
- `operatorBrandColor`
- `operatorLogoXml` / `operatorLogoUrl`
- `status`
- `liveStatus`
- `liveState`
- `departureTime`
- `arrivalTime`
- `originCode` / `destinationCode`
- `bookingReference`
- `ticketReference`
- `passengerName`
- `seat`
- `coach`
- `qrOrBarcodeValue`
- `lastUpdatedAt`
- `fallbackSource`

## Provider adapters

Provider adapters live under `src/services/transport/providers/`.

- `aviationstack.ts`: airline enrichment for flight-number/status/timing updates
- `darwin.ts`: UK rail live running information via Darwin
- `bods.ts`: bus metadata / stop-level updates via BODS
- `mock.ts`: development-only demo provider

The app builds and runs without any provider credentials. When provider configuration is missing or live lookups fail, Pineapple falls back to the user-entered trip data and marks the card as manual-only or unavailable instead of breaking the trip screen.

## Environment variables

- `EXPO_PUBLIC_TRANSPORT_PROVIDER_MODE=mock`
- `EXPO_PUBLIC_AVIATIONSTACK_API_KEY`
- `EXPO_PUBLIC_AVIATIONSTACK_PLAN`
- `EXPO_PUBLIC_AVIATIONSTACK_BASE_URL`
- `EXPO_PUBLIC_DARWIN_TOKEN`
- `EXPO_PUBLIC_DARWIN_ENDPOINT`
- `EXPO_PUBLIC_BODS_API_KEY`
- `EXPO_PUBLIC_BODS_API_BASE_URL`
- `EXPO_PUBLIC_BODS_ENDPOINT`

## Fallback rules

- Missing credentials: card stays usable from saved trip details
- Rate limit or network failure: card stays usable and surfaces a fallback notice
- Partial provider data: keep saved booking/passenger data, only overlay safe live fields
- Manual booking details always win for passenger name, seat, booking ref, barcode payload, and other non-public data

## Aviationstack limitations

- The configured plan may not support the same realtime/schedule/future-flight coverage on every key
- Future-flight lookups should not be assumed on the free tier
- Live passenger boarding data does not come from Aviationstack

## Darwin limitations

- Darwin credentials are required before realtime rail updates can be queried
- Pineapple preserves stored ticket/seat/coach fields locally because Darwin running data does not replace booking data

## BODS limitations

- BODS coverage varies by operator and service
- Some services will only return timetable or metadata-level information rather than a live estimate
