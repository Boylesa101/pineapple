import { addDays, addHours, addMinutes } from 'date-fns';

import type { AppDataSnapshot, ReminderKind, ReminderSetting, TravelSegment, Trip } from '@/types/models';

export const NOTIFICATION_PROOF_BUILD_VERSION = '2.2.5';
export const NOTIFICATION_PROOF_TRIP_ID = 'trip_transport_notification_proof';

const NOTIFICATION_PROOF_SEGMENTS: Array<{
  id: string;
  transportType: TravelSegment['transportType'];
  airline: string;
  providerCode: string;
  flightNumber: string;
  departureAirport: string;
  departureAirportCode: string;
  arrivalAirport: string;
  arrivalAirportCode: string;
  departureOffsetHours: number;
  arrivalOffsetHours: number;
  terminal: string;
  gate: string;
  bookingRef: string;
}> = [
  {
    id: 'segment_notification_proof_flight',
    transportType: 'flight',
    airline: 'British Airways',
    providerCode: 'BA',
    flightNumber: 'BA0482',
    departureAirport: 'London Gatwick Airport',
    departureAirportCode: 'LGW',
    arrivalAirport: 'Malaga Airport',
    arrivalAirportCode: 'AGP',
    departureOffsetHours: 9,
    arrivalOffsetHours: 12,
    terminal: 'S',
    gate: '26',
    bookingRef: 'PROOF-FLT',
  },
  {
    id: 'segment_notification_proof_train',
    transportType: 'train',
    airline: 'LNER',
    providerCode: 'LNER',
    flightNumber: '1D24',
    departureAirport: 'York Station',
    departureAirportCode: '',
    arrivalAirport: 'London Kings Cross',
    arrivalAirportCode: '',
    departureOffsetHours: 13,
    arrivalOffsetHours: 15,
    terminal: 'Platform 4',
    gate: 'Coach B',
    bookingRef: 'PROOF-TRN',
  },
  {
    id: 'segment_notification_proof_taxi',
    transportType: 'taxi',
    airline: 'Uber',
    providerCode: '',
    flightNumber: 'RIDE-11',
    departureAirport: 'Home pickup',
    departureAirportCode: '',
    arrivalAirport: 'Heathrow Terminal 5',
    arrivalAirportCode: '',
    departureOffsetHours: 16,
    arrivalOffsetHours: 17,
    terminal: 'Outside front door',
    gate: 'Blue Toyota',
    bookingRef: 'PROOF-TAXI',
  },
  {
    id: 'segment_notification_proof_ferry',
    transportType: 'ferry',
    airline: 'P&O Ferries',
    providerCode: '',
    flightNumber: 'PO123',
    departureAirport: 'Dover Ferry Terminal',
    departureAirportCode: '',
    arrivalAirport: 'Calais Port',
    arrivalAirportCode: '',
    departureOffsetHours: 18,
    arrivalOffsetHours: 20,
    terminal: 'Check-in lane A',
    gate: 'Lane 8',
    bookingRef: 'PROOF-FRY',
  },
  {
    id: 'segment_notification_proof_eurotunnel',
    transportType: 'eurotunnel',
    airline: 'LeShuttle',
    providerCode: '',
    flightNumber: 'LT456',
    departureAirport: 'Folkestone Terminal',
    departureAirportCode: '',
    arrivalAirport: 'Calais Terminal',
    arrivalAirportCode: '',
    departureOffsetHours: 21,
    arrivalOffsetHours: 22,
    terminal: 'Check-in booth',
    gate: 'Lane C',
    bookingRef: 'PROOF-EURO',
  },
];

const LEGACY_REMINDER_OFFSETS_MINUTES: Partial<Record<ReminderKind, number>> = {
  trip_countdown_30_days: 2,
  trip_countdown_7_days: 4,
  packing_incomplete: 6,
  trip_countdown_3_days: 8,
  insurance_missing: 10,
  trip_countdown_1_day: 12,
  trip_today: 14,
  hotel_check_in: 16,
  transfer_reminder: 18,
  travel_mode_reminder: 20,
  sos_ready: 22,
  excursion_reminder: 24,
};

function getTransportSummary(transportType: TravelSegment['transportType']) {
  if (transportType === 'train' || transportType === 'taxi') {
    return 'Lock screen alerts 1h • 15m';
  }

  if (transportType === 'flight' || transportType === 'private_flight' || transportType === 'ferry' || transportType === 'eurotunnel') {
    return 'Lock screen alerts 7d • 3d • 2d • 1d • 2h • 1h • 15m';
  }

  return 'No automatic transport alerts';
}

export function isNotificationProofBuildVersion(version: string | null | undefined) {
  return version === NOTIFICATION_PROOF_BUILD_VERSION;
}

export function isNotificationProofTripId(tripId: string | null | undefined) {
  return tripId === NOTIFICATION_PROOF_TRIP_ID;
}

export function getNotificationProofReminderDate(kind: ReminderKind, now: Date, occurrenceIndex = 0) {
  if (kind === 'transport_departure') {
    return addMinutes(now, 2 + occurrenceIndex);
  }

  const baseOffset = LEGACY_REMINDER_OFFSETS_MINUTES[kind];
  if (baseOffset === undefined) {
    return null;
  }

  return addMinutes(now, baseOffset + occurrenceIndex);
}

function buildReminderSetting(kind: ReminderKind, leadTimeDays: ReminderSetting['leadTimeDays'], nowIso: string): ReminderSetting {
  return {
    id: `reminder_${kind}_notification_proof`,
    tripId: NOTIFICATION_PROOF_TRIP_ID,
    kind,
    enabled: true,
    leadTimeDays,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function withNotificationProofTrip(snapshot: AppDataSnapshot, now = new Date()) {
  if (snapshot.trips.some((trip) => trip.id === NOTIFICATION_PROOF_TRIP_ID)) {
    return { snapshot, changed: false };
  }

  const nowIso = now.toISOString();
  const start = addDays(now, 45);
  const end = addDays(start, 4);
  const proofTrip: Trip = {
    id: NOTIFICATION_PROOF_TRIP_ID,
    name: 'Transport Notification Proof Trip',
    destination: 'Calais',
    destinationType: 'place',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    destinationImageLocalPath: null,
    destinationImageRemoteUrl: null,
    destinationImageSource: 'fallback',
    attributionText: 'Temporary 2.2.5 transport notification verification trip',
    attributionMeta: { source: 'fallback', sourceLabel: 'Temporary 2.2.5 transport notification verification trip' },
    coverImageUri: null,
    heroImageRemoteUrl: null,
    heroImageStatus: 'idle',
    notes:
      'Temporary seeded trip for Pineapple 2.2.5 transport notification verification. Remove after on-device lock-screen proof is confirmed.',
    transferSummary: 'Transport departure proof trip',
    transferProvider: '',
    transferMethod: '',
    transferLocation: '',
    transferTime: null,
    airportTravelDurationMinutes: 75,
    transferNotes: '',
    status: 'upcoming',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const proofTravelSegments: TravelSegment[] = NOTIFICATION_PROOF_SEGMENTS.map((segment, index) => {
    const departureTime = addHours(start, segment.departureOffsetHours + index);
    const travelSegment: TravelSegment = {
      id: segment.id,
      tripId: NOTIFICATION_PROOF_TRIP_ID,
      transportType: segment.transportType,
      travelDirection: index === 0 ? 'outbound' : 'other',
      airline: segment.airline,
      providerCode: segment.providerCode,
      providerLogoUrl: null,
      flightNumber: segment.flightNumber,
      departureAirport: segment.departureAirport,
      departureAirportCode: segment.departureAirportCode,
      arrivalAirport: segment.arrivalAirport,
      arrivalAirportCode: segment.arrivalAirportCode,
      departureTime: departureTime.toISOString(),
      departureTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London',
      arrivalTime: addHours(start, segment.arrivalOffsetHours + index).toISOString(),
      terminal: segment.terminal,
      gate: segment.gate,
      bookingRef: segment.bookingRef,
      notificationSummary: '',
      scheduledNotificationIds: [],
      notes: 'Proof-only transport segment for local departure alert verification.',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return {
      ...travelSegment,
      notificationSummary: getTransportSummary(travelSegment.transportType),
    };
  });

  return {
    changed: true,
    snapshot: {
      ...snapshot,
      trips: [proofTrip, ...snapshot.trips],
      travelSegments: [...proofTravelSegments, ...snapshot.travelSegments],
      reminderSettings: [
        buildReminderSetting('transport_departure', 0, nowIso),
        ...snapshot.reminderSettings,
      ],
    },
  };
}
