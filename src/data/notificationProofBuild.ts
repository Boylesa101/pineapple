import { addDays, addHours, addMinutes } from 'date-fns';

import type { AppDataSnapshot, HotelStay, ItineraryEvent, PackingItem, ReminderKind, ReminderSetting, TravelSegment, Trip } from '@/types/models';

export const NOTIFICATION_PROOF_BUILD_VERSION = '2.2.2';
export const NOTIFICATION_PROOF_TRIP_ID = 'trip_notification_proof';

const NOTIFICATION_PROOF_SEGMENT_ID = 'segment_notification_proof';
const NOTIFICATION_PROOF_HOTEL_ID = 'hotel_notification_proof';
const NOTIFICATION_PROOF_PACKING_ID = 'packing_notification_proof';
const NOTIFICATION_PROOF_EVENT_ID = 'event_notification_proof';

export const NOTIFICATION_PROOF_REMINDER_OFFSETS_MINUTES: Partial<Record<ReminderKind, number>> = {
  trip_countdown_30_days: 2,
  trip_countdown_7_days: 4,
  packing_incomplete: 6,
  trip_countdown_3_days: 8,
  insurance_missing: 10,
  trip_countdown_1_day: 12,
  trip_today: 14,
  flight_check_in: 16,
  hotel_check_in: 18,
  transfer_reminder: 20,
  travel_mode_reminder: 22,
  sos_ready: 24,
  excursion_reminder: 26,
};

export function isNotificationProofBuildVersion(version: string | null | undefined) {
  return version === NOTIFICATION_PROOF_BUILD_VERSION;
}

export function isNotificationProofTripId(tripId: string | null | undefined) {
  return tripId === NOTIFICATION_PROOF_TRIP_ID;
}

export function getNotificationProofReminderDate(kind: ReminderKind, now: Date, occurrenceIndex = 0) {
  const baseOffset = NOTIFICATION_PROOF_REMINDER_OFFSETS_MINUTES[kind];
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
  const outbound = addHours(start, 9);
  const proofTrip: Trip = {
    id: NOTIFICATION_PROOF_TRIP_ID,
    name: 'Notification Proof Trip',
    destination: 'Barcelona',
    destinationType: 'place',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    destinationImageLocalPath: null,
    destinationImageRemoteUrl: null,
    destinationImageSource: 'fallback',
    attributionText: 'Temporary 2.2.2 notification verification trip',
    attributionMeta: { source: 'fallback', sourceLabel: 'Temporary 2.2.2 notification verification trip' },
    coverImageUri: null,
    heroImageRemoteUrl: null,
    heroImageStatus: 'idle',
    notes: 'Temporary seeded trip for Pineapple 2.2.2 notification verification. Remove after on-device lock-screen proof is confirmed.',
    transferSummary: 'Demo airport pickup for notification verification.',
    transferProvider: 'Pineapple test transfer',
    transferMethod: 'Airport transfer',
    transferLocation: 'Barcelona arrivals meeting point',
    transferTime: addHours(outbound, 3).toISOString(),
    airportTravelDurationMinutes: 75,
    transferNotes: 'Temporary proof-only transfer timing for notification testing.',
    status: 'upcoming',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const proofPackingItem: PackingItem = {
    id: NOTIFICATION_PROOF_PACKING_ID,
    tripId: NOTIFICATION_PROOF_TRIP_ID,
    title: 'Passport wallet',
    category: 'documents',
    quantity: 1,
    isPacked: false,
    luggageType: 'carry_on',
    assignmentScope: 'trip',
    travellerIds: [],
    priority: 'essential',
    notes: 'Left unpacked on purpose so the proof reminder can trigger.',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const proofTravelSegment: TravelSegment = {
    id: NOTIFICATION_PROOF_SEGMENT_ID,
    tripId: NOTIFICATION_PROOF_TRIP_ID,
    transportType: 'flight',
    travelDirection: 'outbound',
    airline: 'British Airways',
    providerCode: 'BA',
    providerLogoUrl: null,
    flightNumber: 'BA0482',
    departureAirport: 'London Gatwick Airport',
    departureAirportCode: 'LGW',
    arrivalAirport: 'Barcelona-El Prat Airport',
    arrivalAirportCode: 'BCN',
    departureTime: outbound.toISOString(),
    arrivalTime: addHours(outbound, 2).toISOString(),
    terminal: 'S',
    gate: '26',
    bookingRef: 'PROOF22',
    notes: 'Proof-only travel segment for notification scheduling.',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const proofHotelStay: HotelStay = {
    id: NOTIFICATION_PROOF_HOTEL_ID,
    tripId: NOTIFICATION_PROOF_TRIP_ID,
    hotelName: 'Pineapple Proof Stay',
    address: 'Passeig de Gracia 1, Barcelona',
    city: 'Barcelona',
    country: 'Spain',
    latitude: null,
    longitude: null,
    hotelImageLocalPath: null,
    hotelImageRemoteUrl: null,
    hotelImageSource: 'fallback',
    hotelImageAttributionText: 'Temporary 2.2.2 notification verification hotel',
    hotelImageAttributionMeta: { source: 'fallback', sourceLabel: 'Temporary 2.2.2 notification verification hotel' },
    hotelImageStatus: 'idle',
    phone: '+34 93 000 0000',
    bookingRef: 'PROOF-HOTEL',
    checkIn: start.toISOString(),
    checkOut: end.toISOString(),
    notes: 'Proof-only hotel stay for local reminder verification.',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const proofEvent: ItineraryEvent = {
    id: NOTIFICATION_PROOF_EVENT_ID,
    tripId: NOTIFICATION_PROOF_TRIP_ID,
    title: 'Proof walking tour',
    type: 'excursion',
    dateTime: addDays(start, 1).toISOString(),
    location: 'Gothic Quarter',
    confirmationNumber: 'PROOF-EXCURSION',
    notes: 'Proof-only excursion so itinerary reminders can be verified.',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    changed: true,
    snapshot: {
      ...snapshot,
      trips: [proofTrip, ...snapshot.trips],
      packingItems: [proofPackingItem, ...snapshot.packingItems],
      travelSegments: [proofTravelSegment, ...snapshot.travelSegments],
      hotelStays: [proofHotelStay, ...snapshot.hotelStays],
      itineraryEvents: [proofEvent, ...snapshot.itineraryEvents],
      reminderSettings: [
        buildReminderSetting('trip_countdown_30_days', 30, nowIso),
        buildReminderSetting('trip_countdown_7_days', 7, nowIso),
        buildReminderSetting('packing_incomplete', 6, nowIso),
        buildReminderSetting('trip_countdown_3_days', 3, nowIso),
        buildReminderSetting('insurance_missing', 7, nowIso),
        buildReminderSetting('trip_countdown_1_day', 1, nowIso),
        buildReminderSetting('trip_today', 0, nowIso),
        buildReminderSetting('flight_check_in', 1, nowIso),
        buildReminderSetting('hotel_check_in', 0, nowIso),
        buildReminderSetting('transfer_reminder', 0, nowIso),
        buildReminderSetting('travel_mode_reminder', 0, nowIso),
        buildReminderSetting('sos_ready', 0, nowIso),
        buildReminderSetting('excursion_reminder', 1, nowIso),
        ...snapshot.reminderSettings,
      ],
    },
  };
}
