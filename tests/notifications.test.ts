import assert from 'node:assert/strict';
import test from 'node:test';

import { NOTIFICATION_PROOF_TRIP_ID, withNotificationProofTrip } from '../src/data/notificationProofBuild';
import { createReminderContent } from '../src/services/notificationPlanner';
import type { AppDataSnapshot, ReminderKind, TravelSegment } from '../src/types/models';

function createSnapshot(): AppDataSnapshot {
  const now = new Date('2026-03-27T10:00:00.000Z').toISOString();
  const expiry = new Date('2026-07-25T10:00:00.000Z').toISOString();
  return {
    trips: [
      {
        id: 'trip_1',
        name: 'Spain getaway',
        destination: 'Malaga',
        destinationType: 'place',
        startDate: new Date('2026-04-16T09:00:00.000Z').toISOString(),
        endDate: new Date('2026-04-23T09:00:00.000Z').toISOString(),
        destinationImageLocalPath: null,
        destinationImageRemoteUrl: null,
        destinationImageSource: 'fallback',
        attributionText: 'Default trip background',
        attributionMeta: { source: 'fallback', sourceLabel: 'Default trip background' },
        coverImageUri: null,
        heroImageRemoteUrl: null,
        heroImageStatus: 'idle',
        notes: '',
        transferSummary: '',
        transferProvider: '',
        transferMethod: '',
        transferLocation: '',
        transferTime: null,
        airportTravelDurationMinutes: null,
        transferNotes: '',
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      },
    ],
    travellers: [],
    documents: [
      {
        id: 'doc_1',
        tripId: 'trip_1',
        travellerId: null,
        holderName: 'Passport',
        documentType: 'passport',
        documentNumber: '1234',
        issueDate: null,
        expiryDate: expiry,
        expiryReminderEnabled: true,
        expiryReminderSchedule: [90, 30, 7, 1, 0],
        expiredStatus: false,
        expiringSoonStatus: true,
        notes: '',
        localFileUri: 'file:///passport.jpg',
        previewUri: null,
        mimeType: 'image/jpeg',
        sensitive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    packingItems: [],
    travelSegments: [],
    hotelStays: [],
    itineraryEvents: [],
    emergencyInfos: [],
    reminderSettings: [],
    savedVibes: [],
    vibeCacheEntries: [],
    appPreferences: {
      id: 'app',
      appLanguage: 'en-GB',
      notificationsEnabled: true,
      expiryRemindersEnabled: true,
      expiryReminderSchedule: [90, 30, 7, 1, 0],
      expiryReminderSilent: true,
      structuredDataProtected: true,
      profileName: '',
      profilePhotoUri: 'file:///profile.jpg',
      travelStyle: 'mixed',
      syncEnabled: false,
      syncMode: 'manual_share',
      syncStatus: 'local_only',
      lastSyncAt: null,
      lastBackupAt: null,
      privacyMaskingMode: 'always',
      vibesIntroSeenAt: null,
      createdAt: now,
      updatedAt: now,
    },
    tripParticipants: [],
    tripInvites: [],
    sharedTripStates: [],
    syncConflicts: [],
  };
}

function createReminderSetting(
  snapshot: AppDataSnapshot,
  kind: ReminderKind,
  leadTimeDays: AppDataSnapshot['reminderSettings'][number]['leadTimeDays'],
  tripId = 'trip_1'
) {
  return {
    id: `${tripId}_${kind}`,
    tripId,
    kind,
    enabled: true,
    leadTimeDays,
    createdAt: snapshot.appPreferences.createdAt,
    updatedAt: snapshot.appPreferences.updatedAt,
  };
}

function createTransportSegment(
  snapshot: AppDataSnapshot,
  id: string,
  transportType: TravelSegment['transportType'],
  departureTime: string,
  arrivalTime: string,
  overrides: Partial<TravelSegment> = {}
): TravelSegment {
  return {
    id,
    tripId: 'trip_1',
    transportType,
    travelDirection: 'outbound',
    airline:
      transportType === 'train'
        ? 'LNER'
        : transportType === 'bus'
          ? 'National Express'
          : transportType === 'underground'
            ? 'London Underground'
            : transportType === 'metro'
              ? 'Tyne and Wear Metro'
        : transportType === 'taxi'
          ? 'Uber'
          : transportType === 'ferry'
            ? 'P&O Ferries'
            : transportType === 'eurotunnel'
              ? 'LeShuttle'
              : 'British Airways',
    providerCode: transportType === 'flight' ? 'BA' : '',
    providerLogoUrl: null,
    flightNumber:
      transportType === 'train'
        ? '1D24'
        : transportType === 'bus'
          ? 'A8'
          : transportType === 'underground'
            ? 'Piccadilly line'
            : transportType === 'metro'
              ? 'Green line'
        : transportType === 'taxi'
          ? 'RIDE-11'
          : transportType === 'ferry'
            ? 'PO123'
            : transportType === 'eurotunnel'
              ? 'LT456'
              : 'BA482',
    departureAirport:
      transportType === 'train'
        ? 'York Station'
        : transportType === 'bus'
          ? 'Birmingham Coach Station'
          : transportType === 'underground'
            ? 'King’s Cross St Pancras'
            : transportType === 'metro'
              ? 'Monument'
        : transportType === 'taxi'
          ? 'Home pickup'
          : transportType === 'ferry'
            ? 'Dover Ferry Terminal'
            : transportType === 'eurotunnel'
              ? 'Folkestone Terminal'
              : 'London Gatwick Airport',
    departureAirportCode: transportType === 'flight' ? 'LGW' : '',
    arrivalAirport:
      transportType === 'train'
        ? 'London Kings Cross'
        : transportType === 'bus'
          ? 'London Victoria Coach Station'
          : transportType === 'underground'
            ? 'Heathrow Terminal 5'
            : transportType === 'metro'
              ? 'Newcastle Airport'
        : transportType === 'taxi'
          ? 'Heathrow Terminal 5'
          : transportType === 'ferry'
            ? 'Calais Port'
            : transportType === 'eurotunnel'
              ? 'Calais Terminal'
              : 'Malaga Airport',
    arrivalAirportCode: transportType === 'flight' ? 'AGP' : '',
    departureTime,
    departureTimeZone: 'Europe/London',
    arrivalTime,
    terminal: '',
    gate: '',
    bookingRef: `${id}-ref`,
    notificationSummary: '',
    scheduledNotificationIds: [],
    notes: '',
    createdAt: snapshot.appPreferences.createdAt,
    updatedAt: snapshot.appPreferences.updatedAt,
    ...overrides,
  };
}

test('document reminder scheduling creates future reminders for the selected schedule', () => {
  const reminders = createReminderContent(createSnapshot(), { now: new Date('2026-03-27T10:00:00.000Z') });
  assert.equal(reminders.length, 5);
  assert.equal(reminders.every((item) => item.silent === true), true);
  assert.equal(reminders[0]?.title, 'Travel document reminder');
  assert.equal(reminders[0]?.body.includes('passport'), false);
  assert.equal(reminders[0]?.body.includes('Passport'), false);
  assert.equal(reminders[0]?.href, '/vault?editDocumentId=doc_1');
  assert.equal(reminders[0]?.activeTripId, 'trip_1');
});

test('trip-level reminder settings generate travel, hotel, transfer, travel mode, and sos reminders with routes', () => {
  const snapshot = createSnapshot();
  snapshot.appPreferences.profileName = 'Andrew';
  snapshot.hotelStays = [
    {
      id: 'hotel_1',
      tripId: 'trip_1',
      hotelName: 'Canopy Palma',
      address: 'Marina 19',
      city: 'Palma',
      country: 'Spain',
      latitude: null,
      longitude: null,
      hotelImageLocalPath: null,
      hotelImageRemoteUrl: null,
      hotelImageSource: 'fallback',
      hotelImageAttributionText: null,
      hotelImageAttributionMeta: null,
      hotelImageStatus: 'idle',
      phone: '',
      bookingRef: '',
      checkIn: new Date('2026-03-28T09:00:00.000Z').toISOString(),
      checkOut: new Date('2026-03-29T09:00:00.000Z').toISOString(),
      notes: '',
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
  ];
  snapshot.trips[0] = {
    ...snapshot.trips[0],
    startDate: new Date('2026-03-28T09:00:00.000Z').toISOString(),
    transferMethod: 'Hotel shuttle',
    transferLocation: 'PMI arrivals',
    transferTime: new Date('2026-03-27T15:00:00.000Z').toISOString(),
  };
  snapshot.reminderSettings = [
    createReminderSetting(snapshot, 'trip_today', 0),
    createReminderSetting(snapshot, 'hotel_check_in', 0),
    createReminderSetting(snapshot, 'transfer_reminder', 0),
    createReminderSetting(snapshot, 'travel_mode_reminder', 0),
    createReminderSetting(snapshot, 'sos_ready', 0),
  ];

  const reminders = createReminderContent(snapshot, { now: new Date('2026-03-27T10:00:00.000Z') });
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1'), true);
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1?focus=hotel'), true);
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1?focus=transfer'), true);
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1/travel-mode'), true);
  assert.equal(reminders.some((item) => item.href === '/sos'), true);
});

test('flight check-in reminders schedule 24 hours before departure when enabled', () => {
  const snapshot = createSnapshot();
  snapshot.travelSegments = [
    createTransportSegment(
      snapshot,
      'segment_flight',
      'flight',
      new Date('2026-03-28T12:00:00.000Z').toISOString(),
      new Date('2026-03-28T15:00:00.000Z').toISOString()
    ),
  ];
  snapshot.reminderSettings = [createReminderSetting(snapshot, 'flight_check_in', 1)];

  const reminders = createReminderContent(snapshot, { now: new Date('2026-03-27T08:00:00.000Z') });
  const checkInReminder = reminders.find((item) => item.kind === 'flight_check_in');

  assert.equal(Boolean(checkInReminder), true);
  assert.equal(checkInReminder?.channelId, 'pineapple-transport');
  assert.equal(checkInReminder?.transportSegmentId, 'segment_flight');
  assert.match(checkInReminder?.title ?? '', /Check in/);
});

test('trip countdown reminders cover 30, 7, 3, 1 day, and trip-day scheduling', () => {
  const snapshot = createSnapshot();
  snapshot.trips[0] = {
    ...snapshot.trips[0],
    startDate: new Date('2026-05-06T09:00:00.000Z').toISOString(),
  };
  snapshot.reminderSettings = [
    createReminderSetting(snapshot, 'trip_countdown_30_days', 30),
    createReminderSetting(snapshot, 'trip_countdown_7_days', 7),
    createReminderSetting(snapshot, 'trip_countdown_3_days', 3),
    createReminderSetting(snapshot, 'trip_countdown_1_day', 1),
    createReminderSetting(snapshot, 'trip_today', 0),
  ];

  const reminders = createReminderContent(snapshot, { now: new Date('2026-03-27T10:00:00.000Z') });
  const tripReminders = reminders.filter((item) => item.activeTripId === 'trip_1' && item.href === '/trip/trip_1');

  assert.equal(tripReminders.length, 5);
  assert.equal(tripReminders.some((item) => item.body === '30 days until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.body === '7 days until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.body === '3 days until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.body === '1 day until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.title === 'Spain getaway is today'), true);
});

test('transport reminders schedule the correct per-segment matrix with travel routes and transport channel', () => {
  const snapshot = createSnapshot();
  snapshot.travelSegments = [
    createTransportSegment(snapshot, 'segment_flight', 'flight', '2026-04-06T10:00:00.000Z', '2026-04-06T13:00:00.000Z'),
    createTransportSegment(snapshot, 'segment_ferry', 'ferry', '2026-04-06T14:00:00.000Z', '2026-04-06T16:00:00.000Z'),
    createTransportSegment(
      snapshot,
      'segment_eurotunnel',
      'eurotunnel',
      '2026-04-06T18:00:00.000Z',
      '2026-04-06T19:00:00.000Z'
    ),
    createTransportSegment(snapshot, 'segment_train', 'train', '2026-03-27T12:00:00.000Z', '2026-03-27T14:00:00.000Z'),
    createTransportSegment(snapshot, 'segment_bus', 'bus', '2026-03-27T12:10:00.000Z', '2026-03-27T13:40:00.000Z'),
    createTransportSegment(snapshot, 'segment_underground', 'underground', '2026-03-27T12:20:00.000Z', '2026-03-27T13:00:00.000Z'),
    createTransportSegment(snapshot, 'segment_metro', 'metro', '2026-03-27T12:25:00.000Z', '2026-03-27T13:05:00.000Z'),
    createTransportSegment(snapshot, 'segment_hire_car', 'hire_car', '2026-03-27T12:30:00.000Z', '2026-03-27T13:30:00.000Z'),
    createTransportSegment(snapshot, 'segment_taxi', 'taxi', '2026-03-27T13:00:00.000Z', '2026-03-27T14:00:00.000Z'),
  ];
  snapshot.reminderSettings = [createReminderSetting(snapshot, 'transport_departure', 0)];

  const reminders = createReminderContent(snapshot, { now: new Date('2026-03-27T10:00:00.000Z') }).filter(
    (item) => item.kind === 'transport_departure'
  );

  assert.equal(reminders.length, 33);
  assert.equal(reminders.every((item) => item.channelId === 'pineapple-transport'), true);
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_flight').length,
    7
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_ferry').length,
    7
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_eurotunnel').length,
    7
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_train').length,
    2
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_bus').length,
    2
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_underground').length,
    2
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_metro').length,
    2
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_hire_car').length,
    2
  );
  assert.equal(
    reminders.filter((item) => item.transportSegmentId === 'segment_taxi').length,
    2
  );
  assert.equal(
    reminders.some(
      (item) => item.transportSegmentId === 'segment_train' && item.href === '/trip/trip_1?focus=travel&segmentId=segment_train'
    ),
    true
  );
  assert.equal(
    reminders.some((item) => item.transportSegmentId === 'segment_train' && item.title.includes('in 1 hour')),
    true
  );
  assert.equal(
    reminders.some((item) => item.transportSegmentId === 'segment_bus' && item.title.includes('Bus')),
    true
  );
  assert.equal(
    reminders.some((item) => item.transportSegmentId === 'segment_underground' && item.title.includes('Underground')),
    true
  );
  assert.equal(
    reminders.some((item) => item.transportSegmentId === 'segment_metro' && item.title.includes('Metro')),
    true
  );
  assert.equal(
    reminders.some((item) => item.transportSegmentId === 'segment_taxi' && item.title.includes('Taxi to Heathrow Terminal 5 arrives in 15 minutes')),
    true
  );
  assert.equal(
    reminders.some((item) => item.transportSegmentId === 'segment_hire_car' && item.title.includes('Hire car')),
    true
  );
  assert.equal(
    reminders.some((item) => item.transportSegmentId === 'segment_eurotunnel' && item.title.includes('Eurotunnel')),
    true
  );
});

test('transport notification proof trip compresses all transport types into a fast local test cadence', () => {
  const now = new Date('2026-03-27T10:00:00.000Z');
  const proofSnapshot = withNotificationProofTrip(createSnapshot(), now).snapshot;
  const reminders = createReminderContent(proofSnapshot, { now }).filter(
    (item) => item.kind === 'transport_departure' && item.activeTripId === NOTIFICATION_PROOF_TRIP_ID
  );

  assert.equal(reminders.length, 31);
  assert.equal(reminders[0]?.date.toISOString(), '2026-03-27T10:02:00.000Z');
  assert.equal(reminders[30]?.date.toISOString(), '2026-03-27T10:32:00.000Z');
  assert.deepEqual(
    new Set(reminders.map((item) => item.transportType)),
    new Set(['flight', 'train', 'bus', 'underground', 'metro', 'taxi', 'ferry', 'eurotunnel'])
  );
  assert.equal(
    reminders.some((item) => item.href?.includes(`segmentId=segment_notification_proof_train`)),
    true
  );
});
