import assert from 'node:assert/strict';
import test from 'node:test';

import { NOTIFICATION_PROOF_TRIP_ID } from '../src/data/notificationProofBuild';
import { createReminderContent } from '../src/services/notificationPlanner';
import type { AppDataSnapshot } from '../src/types/models';

function createSnapshot(): AppDataSnapshot {
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
  return {
    trips: [
      {
        id: 'trip_1',
        name: 'Spain getaway',
        destination: 'Malaga',
        destinationType: 'place',
        startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
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
      notificationsEnabled: true,
      expiryRemindersEnabled: true,
      expiryReminderSchedule: [90, 30, 7, 1, 0],
      expiryReminderSilent: true,
      structuredDataProtected: true,
      profileName: '',
      profilePhotoUri: 'file:///profile.jpg',
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

test('document reminder scheduling creates future reminders for the selected schedule', () => {
  const reminders = createReminderContent(createSnapshot());
  assert.equal(reminders.length, 5);
  assert.equal(reminders.every((item) => item.silent === true), true);
  assert.equal(reminders[0]?.title, 'Travel document reminder');
  assert.equal(reminders[0]?.body.includes('passport'), false);
  assert.equal(reminders[0]?.body.includes('Passport'), false);
  assert.equal(reminders[0]?.href, '/vault?editDocumentId=doc_1');
  assert.equal(reminders[0]?.activeTripId, 'trip_1');
});

test('deleting a document removes its scheduled expiry reminders from generated content', () => {
  const snapshot = createSnapshot();
  snapshot.documents = [];
  const reminders = createReminderContent(snapshot);
  assert.equal(reminders.some((item) => item.title === 'Travel document reminder'), false);
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
      checkIn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      notes: '',
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
  ];
  snapshot.trips[0] = {
    ...snapshot.trips[0],
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    transferMethod: 'Hotel shuttle',
    transferLocation: 'PMI arrivals',
    transferTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  };
  snapshot.reminderSettings = [
    {
      id: 'trip_today',
      tripId: 'trip_1',
      kind: 'trip_today',
      enabled: true,
      leadTimeDays: 0,
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
    {
      id: 'hotel_check_in',
      tripId: 'trip_1',
      kind: 'hotel_check_in',
      enabled: true,
      leadTimeDays: 0,
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
    {
      id: 'transfer_reminder',
      tripId: 'trip_1',
      kind: 'transfer_reminder',
      enabled: true,
      leadTimeDays: 0,
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
    {
      id: 'travel_mode_reminder',
      tripId: 'trip_1',
      kind: 'travel_mode_reminder',
      enabled: true,
      leadTimeDays: 0,
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
    {
      id: 'sos_ready',
      tripId: 'trip_1',
      kind: 'sos_ready',
      enabled: true,
      leadTimeDays: 0,
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
  ];

  const reminders = createReminderContent(snapshot);
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1'), true);
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1?focus=hotel'), true);
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1?focus=transfer'), true);
  assert.equal(reminders.some((item) => item.href === '/trip/trip_1/travel-mode'), true);
  assert.equal(reminders.some((item) => item.href === '/sos'), true);
});

test('trip countdown reminders cover 30, 7, 3, 1 day, and trip-day scheduling', () => {
  const snapshot = createSnapshot();
  snapshot.trips[0] = {
    ...snapshot.trips[0],
    startDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
  };
  snapshot.reminderSettings = [
    ['trip_countdown_30_days', 30],
    ['trip_countdown_7_days', 7],
    ['trip_countdown_3_days', 3],
    ['trip_countdown_1_day', 1],
    ['trip_today', 0],
  ].map(([kind, leadTimeDays], index) => ({
    id: `trip_countdown_${index}`,
    tripId: 'trip_1',
    kind: kind as AppDataSnapshot['reminderSettings'][number]['kind'],
    enabled: true,
    leadTimeDays: leadTimeDays as AppDataSnapshot['reminderSettings'][number]['leadTimeDays'],
    createdAt: snapshot.appPreferences.createdAt,
    updatedAt: snapshot.appPreferences.updatedAt,
  }));

  const reminders = createReminderContent(snapshot);
  const tripReminders = reminders.filter((item) => item.activeTripId === 'trip_1' && item.href === '/trip/trip_1');

  assert.equal(tripReminders.length, 5);
  assert.equal(tripReminders.some((item) => item.body === '30 days until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.body === '7 days until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.body === '3 days until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.body === '1 day until Malaga.'), true);
  assert.equal(tripReminders.some((item) => item.title === 'Spain getaway is today'), true);
});

test('notification proof trip compresses reminder dates into a fast local test cadence', () => {
  const now = new Date('2026-03-27T10:00:00.000Z');
  const snapshot = createSnapshot();
  snapshot.trips = [
    {
      ...snapshot.trips[0],
      id: NOTIFICATION_PROOF_TRIP_ID,
      name: 'Notification Proof Trip',
      destination: 'Barcelona',
      startDate: new Date('2026-05-12T09:00:00.000Z').toISOString(),
      endDate: new Date('2026-05-16T09:00:00.000Z').toISOString(),
      transferMethod: 'Airport transfer',
      transferLocation: 'Barcelona arrivals',
      transferTime: new Date('2026-05-12T12:00:00.000Z').toISOString(),
    },
  ];
  snapshot.packingItems = [
    {
      id: 'packing_1',
      tripId: NOTIFICATION_PROOF_TRIP_ID,
      title: 'Passport wallet',
      category: 'documents',
      quantity: 1,
      isPacked: false,
      luggageType: 'carry_on',
      assignmentScope: 'trip',
      travellerIds: [],
      priority: 'essential',
      notes: '',
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
  ];
  snapshot.travelSegments = [
    {
      id: 'segment_1',
      tripId: NOTIFICATION_PROOF_TRIP_ID,
      transportType: 'flight',
      travelDirection: 'outbound',
      airline: 'British Airways',
      providerCode: 'BA',
      providerLogoUrl: null,
      flightNumber: 'BA482',
      departureAirport: 'London Gatwick Airport',
      departureAirportCode: 'LGW',
      arrivalAirport: 'Barcelona-El Prat Airport',
      arrivalAirportCode: 'BCN',
      departureTime: new Date('2026-05-12T09:00:00.000Z').toISOString(),
      arrivalTime: new Date('2026-05-12T11:00:00.000Z').toISOString(),
      terminal: 'S',
      gate: '10',
      bookingRef: 'PROOF22',
      notes: '',
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
  ];
  snapshot.hotelStays = [
    {
      id: 'hotel_1',
      tripId: NOTIFICATION_PROOF_TRIP_ID,
      hotelName: 'Proof Stay',
      address: 'Passeig de Gracia 1',
      city: 'Barcelona',
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
      checkIn: new Date('2026-05-12T09:00:00.000Z').toISOString(),
      checkOut: new Date('2026-05-16T09:00:00.000Z').toISOString(),
      notes: '',
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
  ];
  snapshot.itineraryEvents = [
    {
      id: 'event_1',
      tripId: NOTIFICATION_PROOF_TRIP_ID,
      title: 'Proof walking tour',
      type: 'excursion',
      dateTime: new Date('2026-05-13T11:00:00.000Z').toISOString(),
      location: 'Gothic Quarter',
      confirmationNumber: '',
      notes: '',
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: snapshot.appPreferences.updatedAt,
    },
  ];
  snapshot.reminderSettings = [
    ['trip_countdown_30_days', 30],
    ['trip_countdown_7_days', 7],
    ['packing_incomplete', 6],
    ['trip_countdown_3_days', 3],
    ['insurance_missing', 7],
    ['trip_countdown_1_day', 1],
    ['trip_today', 0],
    ['flight_check_in', 1],
    ['hotel_check_in', 0],
    ['transfer_reminder', 0],
    ['travel_mode_reminder', 0],
    ['sos_ready', 0],
    ['excursion_reminder', 1],
  ].map(([kind, leadTimeDays], index) => ({
    id: `proof_${index}`,
    tripId: NOTIFICATION_PROOF_TRIP_ID,
    kind: kind as AppDataSnapshot['reminderSettings'][number]['kind'],
    enabled: true,
    leadTimeDays: leadTimeDays as AppDataSnapshot['reminderSettings'][number]['leadTimeDays'],
    createdAt: snapshot.appPreferences.createdAt,
    updatedAt: snapshot.appPreferences.updatedAt,
  }));

  const reminders = createReminderContent(snapshot, { now });
  const proofReminders = reminders.filter((item) => item.activeTripId === NOTIFICATION_PROOF_TRIP_ID);

  assert.equal(proofReminders.length, 13);
  assert.equal(proofReminders[0]?.date.toISOString(), '2026-03-27T10:02:00.000Z');
  assert.equal(proofReminders[1]?.date.toISOString(), '2026-03-27T10:04:00.000Z');
  assert.equal(proofReminders[6]?.date.toISOString(), '2026-03-27T10:14:00.000Z');
  assert.equal(proofReminders[12]?.date.toISOString(), '2026-03-27T10:26:00.000Z');
  assert.equal(proofReminders.some((item) => item.href === `/trip/${NOTIFICATION_PROOF_TRIP_ID}?focus=transfer`), true);
  assert.equal(proofReminders.some((item) => item.href === `/trip/${NOTIFICATION_PROOF_TRIP_ID}/travel-mode`), true);
  assert.equal(proofReminders.some((item) => item.href === '/sos'), true);
});
