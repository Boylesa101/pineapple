import { getDatabase } from './client';

import { createId } from '@/utils/ids';
import { createShareCode } from '@/utils/shareCodes';
import {
  decryptStructuredValue,
  encryptStructuredValue,
} from '@/utils/structuredDataEncryption';
import {
  defaultAppExpiryPreferences,
  normalizeAppPreferences,
  normalizeDocumentRecord,
  serializeExpiryReminderSchedule,
} from '@/utils/documentExpiry';
import { normalizeDrivingLicenceData } from '@/utils/drivingLicence';
import { normalizeFormalDocumentData } from '@/utils/formalDocument';
import { normalizeHealthCardData } from '@/utils/healthCard';
import { deleteLocalFile } from '@/utils/fileStorage';
import { normalizeHotelStayRecord } from '@/utils/hotels';
import { normalizePaymentCardData } from '@/utils/paymentCard';
import { normalizePassportData } from '@/utils/passport';
import { normalizeTripRecord } from '@/utils/trips';
import type {
  AppDataSnapshot,
  AppPreferences,
  AppPreferencesDraft,
  DocumentDraft,
  EmergencyInfoDraft,
  HotelStayDraft,
  ItineraryEventDraft,
  PackingItemDraft,
  ReminderSettingDraft,
  SavedVibeDraft,
  SharedTripStateDraft,
  SyncConflictDraft,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
  TripInviteDraft,
  TripParticipantDraft,
  VibeCacheEntryDraft,
} from '@/types/models';

function now() {
  return new Date().toISOString();
}

async function decryptField(value: string | null | undefined) {
  return decryptStructuredValue(value);
}

async function encryptField(value: string | null | undefined) {
  return encryptStructuredValue(value);
}

function parsePassportData(value: unknown) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return normalizePassportData(JSON.parse(value));
  } catch {
    return null;
  }
}

function parseDrivingLicenceData(value: unknown) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return normalizeDrivingLicenceData(JSON.parse(value));
  } catch {
    return null;
  }
}

function parseHealthCardData(value: unknown) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return normalizeHealthCardData(JSON.parse(value));
  } catch {
    return null;
  }
}

function parsePaymentCardData(value: unknown) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return normalizePaymentCardData(JSON.parse(value));
  } catch {
    return null;
  }
}

function parseFormalDocumentData(value: unknown) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return normalizeFormalDocumentData(JSON.parse(value));
  } catch {
    return null;
  }
}

async function cleanupDocumentFiles(
  document:
    | {
        localFileUri: string;
        previewUri: string | null;
        secondaryLocalFileUri?: string | null;
        secondaryPreviewUri?: string | null;
      }
    | null
    | undefined
) {
  if (!document) {
    return;
  }

  const uris = new Set(
    [document.localFileUri, document.previewUri, document.secondaryLocalFileUri, document.secondaryPreviewUri].filter(
      (value): value is string => Boolean(value)
    )
  );
  for (const uri of uris) {
    await deleteLocalFile(uri);
  }
}

async function cleanupTripFiles(tripId: string) {
  const db = await getDatabase();
  const trip = await db.getFirstAsync<{ coverImageUri: string | null; destinationImageLocalPath: string | null }>(
    'SELECT coverImageUri, destinationImageLocalPath FROM trips WHERE id = ?',
    tripId
  );
  const hotels = await db.getAllAsync<{ hotelImageLocalPath: string | null }>(
    'SELECT hotelImageLocalPath FROM hotel_stays WHERE tripId = ?',
    tripId
  );
  const documents = await db.getAllAsync<{
    localFileUri: string;
    previewUri: string | null;
    secondaryLocalFileUri: string | null;
    secondaryPreviewUri: string | null;
  }>(
    'SELECT localFileUri, previewUri, secondaryLocalFileUri, secondaryPreviewUri FROM documents WHERE tripId = ?',
    tripId
  );

  const tripImageUris = new Set([trip?.coverImageUri, trip?.destinationImageLocalPath].filter((value): value is string => Boolean(value)));
  for (const uri of tripImageUris) {
    await deleteLocalFile(uri);
  }

  const hotelImageUris = new Set(hotels.map((hotel) => hotel.hotelImageLocalPath).filter((value): value is string => Boolean(value)));
  for (const uri of hotelImageUris) {
    await deleteLocalFile(uri);
  }

  for (const document of documents) {
    await cleanupDocumentFiles(document);
  }
}

function toBool(value: number | boolean | null | undefined) {
  return value === 1 || value === true;
}

function defaultAppPreferences(timestamp = now()): AppPreferences {
  return {
    id: 'app',
    notificationsEnabled: false,
    ...defaultAppExpiryPreferences(),
    profileName: '',
    profilePhotoUri: null,
    syncEnabled: false,
    syncMode: 'manual_share',
    syncStatus: 'local_only',
    lastSyncAt: null,
    lastBackupAt: null,
    privacyMaskingMode: 'always',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function replacePackingAssignments(id: string, travellerIds: string[]) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM packing_item_travellers WHERE packingItemId = ?', id);

  for (const travellerId of travellerIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO packing_item_travellers (packingItemId, travellerId) VALUES (?, ?)',
      id,
      travellerId
    );
  }
}

export async function loadSnapshot(): Promise<AppDataSnapshot> {
  const db = await getDatabase();
  const [
    trips,
    travellers,
    documents,
    packingItemsRaw,
    packingAssignments,
    travelSegments,
    hotelStays,
    itineraryEvents,
    emergencyInfos,
    reminderSettings,
    savedVibes,
    vibeCacheEntries,
    appPreferencesRaw,
    tripParticipants,
    tripInvites,
    sharedTripStates,
    syncConflicts,
  ] = await Promise.all([
    db.getAllAsync<any>('SELECT * FROM trips ORDER BY startDate ASC'),
    db.getAllAsync<any>('SELECT * FROM travellers ORDER BY createdAt ASC'),
    db.getAllAsync<any>('SELECT * FROM documents ORDER BY createdAt DESC'),
    db.getAllAsync<any>('SELECT * FROM packing_items ORDER BY createdAt ASC'),
    db.getAllAsync<{ packingItemId: string; travellerId: string }>(
      'SELECT packingItemId, travellerId FROM packing_item_travellers'
    ),
    db.getAllAsync<any>('SELECT * FROM travel_segments ORDER BY departureTime ASC'),
    db.getAllAsync<any>('SELECT * FROM hotel_stays ORDER BY checkIn ASC'),
    db.getAllAsync<any>('SELECT * FROM itinerary_events ORDER BY dateTime ASC'),
    db.getAllAsync<any>('SELECT * FROM emergency_infos ORDER BY createdAt DESC'),
    db.getAllAsync<any>('SELECT * FROM reminder_settings ORDER BY tripId ASC, kind ASC'),
    db.getAllAsync<any>('SELECT * FROM saved_vibes ORDER BY savedAt DESC'),
    db.getAllAsync<any>('SELECT * FROM vibe_cache_entries ORDER BY updatedAt DESC'),
    db.getFirstAsync<any>('SELECT * FROM app_preferences WHERE id = ?', 'app'),
    db.getAllAsync<any>('SELECT * FROM trip_participants ORDER BY tripId ASC, createdAt ASC'),
    db.getAllAsync<any>('SELECT * FROM trip_invites ORDER BY tripId ASC, createdAt ASC'),
    db.getAllAsync<any>('SELECT * FROM shared_trip_states ORDER BY updatedAt DESC'),
    db.getAllAsync<any>('SELECT * FROM sync_conflicts ORDER BY createdAt DESC'),
  ]);

  const assignmentMap = packingAssignments.reduce<Record<string, string[]>>((accumulator, row) => {
    accumulator[row.packingItemId] = [...(accumulator[row.packingItemId] ?? []), row.travellerId];
    return accumulator;
  }, {});

  const appPreferences = appPreferencesRaw
    ? normalizeAppPreferences({
        ...appPreferencesRaw,
        notificationsEnabled: toBool(appPreferencesRaw.notificationsEnabled),
        expiryRemindersEnabled: toBool(appPreferencesRaw.expiryRemindersEnabled ?? 1),
        expiryReminderSilent: toBool(appPreferencesRaw.expiryReminderSilent ?? 0),
        structuredDataProtected: toBool(appPreferencesRaw.structuredDataProtected ?? 0),
        profileName: appPreferencesRaw.profileName ?? '',
        profilePhotoUri: appPreferencesRaw.profilePhotoUri ?? null,
        syncEnabled: toBool(appPreferencesRaw.syncEnabled),
      })
    : defaultAppPreferences();

  const decryptedTrips = await Promise.all(
    trips.map(async (trip) =>
      normalizeTripRecord({
        ...trip,
        name: (await decryptField(trip.name)) ?? '',
        destination: (await decryptField(trip.destination)) ?? '',
        destinationImageRemoteUrl: await decryptField(trip.destinationImageRemoteUrl),
        heroImageRemoteUrl: await decryptField(trip.heroImageRemoteUrl),
        attributionText: await decryptField(trip.attributionText),
        attributionMeta: await decryptField(trip.attributionMeta),
        notes: (await decryptField(trip.notes)) ?? '',
        transferSummary: (await decryptField(trip.transferSummary)) ?? '',
        transferProvider: (await decryptField(trip.transferProvider)) ?? '',
        transferMethod: (await decryptField(trip.transferMethod)) ?? '',
        transferLocation: (await decryptField(trip.transferLocation)) ?? '',
        transferTime: trip.transferTime ?? null,
        airportTravelDurationMinutes:
          typeof trip.airportTravelDurationMinutes === 'number'
            ? trip.airportTravelDurationMinutes
            : trip.airportTravelDurationMinutes
              ? Number(trip.airportTravelDurationMinutes)
              : null,
        transferNotes: (await decryptField(trip.transferNotes)) ?? '',
      })
    )
  );

  const decryptedTravellers = await Promise.all(
    travellers.map(async (traveller) => ({
      ...traveller,
      fullName: (await decryptField(traveller.fullName)) ?? '',
      dateOfBirth: await decryptField(traveller.dateOfBirth),
      passportNationality: (await decryptField(traveller.passportNationality)) ?? '',
      passportNumber: (await decryptField(traveller.passportNumber)) ?? '',
      ghicNumber: (await decryptField(traveller.ghicNumber)) ?? '',
      medicalNote: (await decryptField(traveller.medicalNote)) ?? '',
      notes: (await decryptField(traveller.notes)) ?? '',
    }))
  );

  const decryptedDocuments = await Promise.all(
    documents.map(async (document) =>
      normalizeDocumentRecord({
        ...document,
        holderName: (await decryptField(document.holderName)) ?? '',
        documentNumber: (await decryptField(document.documentNumber)) ?? '',
        notes: (await decryptField(document.notes)) ?? '',
        sensitive: toBool(document.sensitive),
        expiryReminderEnabled: toBool(document.expiryReminderEnabled ?? 1),
        expiryReminderSchedule: document.expiryReminderSchedule,
        passportData: parsePassportData(await decryptField(document.passportData)),
        secondaryLocalFileUri: document.secondaryLocalFileUri ?? null,
        secondaryPreviewUri: document.secondaryPreviewUri ?? null,
        secondaryMimeType: document.secondaryMimeType ?? null,
        drivingLicenceData: parseDrivingLicenceData(await decryptField(document.drivingLicenceData)),
        healthCardData: parseHealthCardData(await decryptField(document.healthCardData)),
        paymentCardData: parsePaymentCardData(await decryptField(document.paymentCardData)),
        formalDocumentData: parseFormalDocumentData(await decryptField(document.formalDocumentData)),
      })
    )
  );

  const decryptedPackingItems = await Promise.all(
    packingItemsRaw.map(async (item) => ({
      ...item,
      title: (await decryptField(item.title)) ?? '',
      notes: (await decryptField(item.notes)) ?? '',
      isPacked: toBool(item.isPacked),
      travellerIds: assignmentMap[item.id] ?? (item.travellerId ? [item.travellerId] : []),
    }))
  );

  const decryptedTravelSegments = await Promise.all(
    travelSegments.map(async (segment) => ({
      ...segment,
      transportType: segment.transportType === 'train' ? 'train' : 'flight',
      travelDirection:
        segment.travelDirection === 'outbound' || segment.travelDirection === 'return' ? segment.travelDirection : 'other',
      airline: (await decryptField(segment.airline)) ?? '',
      providerCode: (await decryptField(segment.providerCode)) ?? '',
      providerLogoUrl: await decryptField(segment.providerLogoUrl),
      flightNumber: (await decryptField(segment.flightNumber)) ?? '',
      departureAirport: (await decryptField(segment.departureAirport)) ?? '',
      departureAirportCode: (await decryptField(segment.departureAirportCode)) ?? '',
      arrivalAirport: (await decryptField(segment.arrivalAirport)) ?? '',
      arrivalAirportCode: (await decryptField(segment.arrivalAirportCode)) ?? '',
      terminal: (await decryptField(segment.terminal)) ?? '',
      gate: (await decryptField(segment.gate)) ?? '',
      bookingRef: (await decryptField(segment.bookingRef)) ?? '',
      notes: (await decryptField(segment.notes)) ?? '',
    }))
  );

  const decryptedHotelStays = await Promise.all(
    hotelStays.map(async (hotel) =>
      normalizeHotelStayRecord({
        ...hotel,
        hotelName: (await decryptField(hotel.hotelName)) ?? '',
        address: (await decryptField(hotel.address)) ?? '',
        city: (await decryptField(hotel.city)) ?? '',
        country: (await decryptField(hotel.country)) ?? '',
        latitude: typeof hotel.latitude === 'number' ? hotel.latitude : hotel.latitude ? Number(hotel.latitude) : null,
        longitude: typeof hotel.longitude === 'number' ? hotel.longitude : hotel.longitude ? Number(hotel.longitude) : null,
        hotelImageLocalPath: hotel.hotelImageLocalPath ?? null,
        hotelImageRemoteUrl: await decryptField(hotel.hotelImageRemoteUrl),
        hotelImageAttributionText: await decryptField(hotel.hotelImageAttributionText),
        hotelImageAttributionMeta: await decryptField(hotel.hotelImageAttributionMeta),
        phone: (await decryptField(hotel.phone)) ?? '',
        bookingRef: (await decryptField(hotel.bookingRef)) ?? '',
        notes: (await decryptField(hotel.notes)) ?? '',
      })
    )
  );

  const decryptedItineraryEvents = await Promise.all(
    itineraryEvents.map(async (event) => ({
      ...event,
      title: (await decryptField(event.title)) ?? '',
      location: (await decryptField(event.location)) ?? '',
      confirmationNumber: (await decryptField(event.confirmationNumber)) ?? '',
      notes: (await decryptField(event.notes)) ?? '',
    }))
  );

  const decryptedEmergencyInfos = await Promise.all(
    emergencyInfos.map(async (info) => ({
      ...info,
      insurerEmergencyNumber: (await decryptField(info.insurerEmergencyNumber)) ?? '',
      hotelPhone: (await decryptField(info.hotelPhone)) ?? '',
      airlinePhone: (await decryptField(info.airlinePhone)) ?? '',
      localEmergencyNote: (await decryptField(info.localEmergencyNote)) ?? '',
      embassyConsulateNote: (await decryptField(info.embassyConsulateNote)) ?? '',
      travellerMedicalNote: (await decryptField(info.travellerMedicalNote)) ?? '',
      emergencyContacts: (await decryptField(info.emergencyContacts)) ?? '',
    }))
  );

  const decryptedSavedVibes = await Promise.all(
    savedVibes.map(async (item) => ({
      ...item,
      source: item.source === 'tripadvisor' ? 'tripadvisor' : 'tripadvisor',
      name: (await decryptField(item.name)) ?? '',
      displayCategory: (await decryptField(item.displayCategory)) ?? '',
      address: (await decryptField(item.address)) ?? '',
      rating: await decryptField(item.rating),
      ranking: await decryptField(item.ranking),
      tripadvisorUrl: await decryptField(item.tripadvisorUrl),
      websiteUrl: await decryptField(item.websiteUrl),
      imageUrl: await decryptField(item.imageUrl),
    }))
  );

  const decryptedVibeCacheEntries = await Promise.all(
    vibeCacheEntries.map(async (entry) => ({
      ...entry,
      areaLabel: (await decryptField(entry.areaLabel)) ?? '',
      payloadJson: (await decryptField(entry.payloadJson)) ?? '[]',
      source: entry.source === 'tripadvisor' ? 'tripadvisor' : 'tripadvisor',
    }))
  );

  const decryptedTripParticipants = await Promise.all(
    tripParticipants.map(async (participant) => ({
      ...participant,
      displayName: (await decryptField(participant.displayName)) ?? '',
      email: (await decryptField(participant.email)) ?? '',
      inviteCode: (await decryptField(participant.inviteCode)) ?? '',
      isLocalProfile: toBool(participant.isLocalProfile),
    }))
  );

  const decryptedTripInvites = await Promise.all(
    tripInvites.map(async (invite) => ({
      ...invite,
      email: (await decryptField(invite.email)) ?? '',
      inviteCode: (await decryptField(invite.inviteCode)) ?? '',
    }))
  );

  const decryptedSharedTripStates = await Promise.all(
    sharedTripStates.map(async (state) => ({
      ...state,
      shareCode: (await decryptField(state.shareCode)) ?? '',
      syncEnabled: toBool(state.syncEnabled),
    }))
  );

  const decryptedSyncConflicts = await Promise.all(
    syncConflicts.map(async (conflict) => ({
      ...conflict,
      shareCode: (await decryptField(conflict.shareCode)) ?? '',
      summary: (await decryptField(conflict.summary)) ?? '',
      incomingPayload: (await decryptField(conflict.incomingPayload)) ?? '',
    }))
  );

  return {
    trips: decryptedTrips,
    travellers: decryptedTravellers.sort((left, right) => left.fullName.localeCompare(right.fullName)),
    documents: decryptedDocuments,
    packingItems: decryptedPackingItems.sort((left, right) => `${left.category}:${left.title}`.localeCompare(`${right.category}:${right.title}`)),
    travelSegments: decryptedTravelSegments,
    hotelStays: decryptedHotelStays,
    itineraryEvents: decryptedItineraryEvents,
    emergencyInfos: decryptedEmergencyInfos,
    reminderSettings: reminderSettings.map((setting) => ({
      ...setting,
      enabled: toBool(setting.enabled),
    })),
    savedVibes: decryptedSavedVibes,
    vibeCacheEntries: decryptedVibeCacheEntries,
    appPreferences,
    tripParticipants: decryptedTripParticipants,
    tripInvites: decryptedTripInvites,
    sharedTripStates: decryptedSharedTripStates,
    syncConflicts: decryptedSyncConflicts,
  };
}

export async function upsertTrip(input: TripDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('trip');
  const existing = input.id
    ? await db.getFirstAsync<{ coverImageUri: string | null; destinationImageLocalPath: string | null }>(
        'SELECT coverImageUri, destinationImageLocalPath FROM trips WHERE id = ?',
        input.id
      )
    : null;
  const encryptedName = (await encryptField(input.name)) ?? '';
  const encryptedDestination = (await encryptField(input.destination)) ?? '';
  const destinationImageLocalPath = input.destinationImageLocalPath ?? input.coverImageUri ?? null;
  const destinationImageRemoteUrl = input.destinationImageRemoteUrl ?? input.heroImageRemoteUrl ?? null;
  const encryptedDestinationImageRemoteUrl = await encryptField(destinationImageRemoteUrl);
  const encryptedAttributionText = await encryptField(input.attributionText ?? null);
  const encryptedAttributionMeta = await encryptField(input.attributionMeta ? JSON.stringify(input.attributionMeta) : null);
  const encryptedNotes = (await encryptField(input.notes ?? '')) ?? '';
  const encryptedTransferSummary = (await encryptField(input.transferSummary ?? '')) ?? '';
  const encryptedTransferProvider = (await encryptField(input.transferProvider ?? '')) ?? '';
  const encryptedTransferMethod = (await encryptField(input.transferMethod ?? '')) ?? '';
  const encryptedTransferLocation = (await encryptField(input.transferLocation ?? '')) ?? '';
  const encryptedTransferNotes = (await encryptField(input.transferNotes ?? '')) ?? '';

  await db.runAsync(
    `INSERT INTO trips (
      id, name, destination, destinationType, startDate, endDate, destinationImageLocalPath, destinationImageRemoteUrl, destinationImageSource, attributionText, attributionMeta, coverImageUri, heroImageRemoteUrl, heroImageStatus, notes, transferSummary, transferProvider, transferMethod, transferLocation, transferTime, airportTravelDurationMinutes, transferNotes, status, createdAt, updatedAt
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       destination = excluded.destination,
       destinationType = excluded.destinationType,
       startDate = excluded.startDate,
       endDate = excluded.endDate,
       destinationImageLocalPath = excluded.destinationImageLocalPath,
       destinationImageRemoteUrl = excluded.destinationImageRemoteUrl,
       destinationImageSource = excluded.destinationImageSource,
       attributionText = excluded.attributionText,
       attributionMeta = excluded.attributionMeta,
       coverImageUri = excluded.coverImageUri,
       heroImageRemoteUrl = excluded.heroImageRemoteUrl,
       heroImageStatus = excluded.heroImageStatus,
       notes = excluded.notes,
       transferSummary = excluded.transferSummary,
       transferProvider = excluded.transferProvider,
       transferMethod = excluded.transferMethod,
       transferLocation = excluded.transferLocation,
       transferTime = excluded.transferTime,
       airportTravelDurationMinutes = excluded.airportTravelDurationMinutes,
       transferNotes = excluded.transferNotes,
       status = excluded.status,
       updatedAt = excluded.updatedAt`,
    id,
    encryptedName,
    encryptedDestination,
    input.destinationType ?? 'unknown',
    input.startDate,
    input.endDate,
    destinationImageLocalPath,
    encryptedDestinationImageRemoteUrl,
    input.destinationImageSource ?? 'fallback',
    encryptedAttributionText,
    encryptedAttributionMeta,
    destinationImageLocalPath,
    encryptedDestinationImageRemoteUrl,
    input.heroImageStatus ?? 'idle',
    encryptedNotes,
    encryptedTransferSummary,
    encryptedTransferProvider,
    encryptedTransferMethod,
    encryptedTransferLocation,
    input.transferTime ?? null,
    input.airportTravelDurationMinutes ?? null,
    encryptedTransferNotes,
    input.status,
    timestamp,
    timestamp
  );

  const previousUris = new Set([existing?.coverImageUri, existing?.destinationImageLocalPath].filter((value): value is string => Boolean(value)));
  for (const uri of previousUris) {
    if (uri !== destinationImageLocalPath) {
      await deleteLocalFile(uri);
    }
  }

  const shareCode = createShareCode();

  await db.runAsync(
    `INSERT OR IGNORE INTO shared_trip_states (
      tripId, shareCode, syncEnabled, syncStatus, lastSyncAt, lastExportedAt, lastImportedAt, lastKnownRemoteUpdatedAt, createdAt, updatedAt
    ) VALUES (?, ?, 0, 'local_only', NULL, NULL, NULL, NULL, ?, ?)`,
    id,
    (await encryptField(shareCode)) ?? '',
    timestamp,
    timestamp
  );

  await db.runAsync(
    `INSERT OR IGNORE INTO trip_participants (
      id, tripId, displayName, email, role, avatarColor, inviteCode, isLocalProfile, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, 'owner', '#F4B400', ?, 1, ?, ?)`,
    `participant_${id}`,
    id,
    (await encryptField('You')) ?? '',
    '',
    (await encryptField(shareCode)) ?? '',
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertTraveller(input: TravellerDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('traveller');
  const encryptedFullName = (await encryptField(input.fullName)) ?? '';
  const encryptedDateOfBirth = await encryptField(input.dateOfBirth);
  const encryptedPassportNationality = (await encryptField(input.passportNationality)) ?? '';
  const encryptedPassportNumber = (await encryptField(input.passportNumber)) ?? '';
  const encryptedGhicNumber = (await encryptField(input.ghicNumber)) ?? '';
  const encryptedMedicalNote = (await encryptField(input.medicalNote)) ?? '';
  const encryptedNotes = (await encryptField(input.notes)) ?? '';

  await db.runAsync(
    `INSERT INTO travellers (id, tripId, fullName, dateOfBirth, passportNationality, passportNumber, ghicNumber, medicalNote, notes, avatarColor, relationshipType, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       fullName = excluded.fullName,
       dateOfBirth = excluded.dateOfBirth,
       passportNationality = excluded.passportNationality,
       passportNumber = excluded.passportNumber,
       ghicNumber = excluded.ghicNumber,
       medicalNote = excluded.medicalNote,
       notes = excluded.notes,
       avatarColor = excluded.avatarColor,
       relationshipType = excluded.relationshipType,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    encryptedFullName,
    encryptedDateOfBirth,
    encryptedPassportNationality,
    encryptedPassportNumber,
    encryptedGhicNumber,
    encryptedMedicalNote,
    encryptedNotes,
    input.avatarColor,
    input.relationshipType,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertDocument(input: DocumentDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('document');
  const normalized = normalizeDocumentRecord(input as any);
  const existing = input.id
    ? await db.getFirstAsync<{
        localFileUri: string;
        previewUri: string | null;
        secondaryLocalFileUri: string | null;
        secondaryPreviewUri: string | null;
      }>(
        'SELECT localFileUri, previewUri, secondaryLocalFileUri, secondaryPreviewUri FROM documents WHERE id = ?',
        input.id
      )
    : null;
  const encryptedHolderName = (await encryptField(normalized.holderName)) ?? '';
  const encryptedDocumentNumber = (await encryptField(normalized.documentNumber)) ?? '';
  const encryptedNotes = (await encryptField(normalized.notes)) ?? '';
  const encryptedPassportData = await encryptField(normalized.passportData ? JSON.stringify(normalized.passportData) : null);
  const encryptedDrivingLicenceData = await encryptField(
    normalized.drivingLicenceData ? JSON.stringify(normalized.drivingLicenceData) : null
  );
  const encryptedHealthCardData = await encryptField(
    normalized.healthCardData ? JSON.stringify(normalized.healthCardData) : null
  );
  const encryptedPaymentCardData = await encryptField(
    normalized.paymentCardData ? JSON.stringify(normalized.paymentCardData) : null
  );
  const encryptedFormalDocumentData = await encryptField(
    normalized.formalDocumentData ? JSON.stringify(normalized.formalDocumentData) : null
  );

  await db.runAsync(
    `INSERT INTO documents (id, tripId, travellerId, holderName, documentType, documentNumber, issueDate, expiryDate, expiryReminderEnabled, expiryReminderSchedule, notes, localFileUri, previewUri, mimeType, passportData, secondaryLocalFileUri, secondaryPreviewUri, secondaryMimeType, drivingLicenceData, healthCardData, paymentCardData, formalDocumentData, sensitive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       travellerId = excluded.travellerId,
       holderName = excluded.holderName,
       documentType = excluded.documentType,
       documentNumber = excluded.documentNumber,
       issueDate = excluded.issueDate,
       expiryDate = excluded.expiryDate,
       expiryReminderEnabled = excluded.expiryReminderEnabled,
       expiryReminderSchedule = excluded.expiryReminderSchedule,
       notes = excluded.notes,
       localFileUri = excluded.localFileUri,
       previewUri = excluded.previewUri,
       mimeType = excluded.mimeType,
       passportData = excluded.passportData,
       secondaryLocalFileUri = excluded.secondaryLocalFileUri,
       secondaryPreviewUri = excluded.secondaryPreviewUri,
       secondaryMimeType = excluded.secondaryMimeType,
       drivingLicenceData = excluded.drivingLicenceData,
       healthCardData = excluded.healthCardData,
       paymentCardData = excluded.paymentCardData,
       formalDocumentData = excluded.formalDocumentData,
       sensitive = excluded.sensitive,
       updatedAt = excluded.updatedAt`,
    id,
    normalized.tripId,
    normalized.travellerId,
    encryptedHolderName,
    normalized.documentType,
    encryptedDocumentNumber,
    normalized.issueDate,
    normalized.expiryDate,
    normalized.expiryReminderEnabled ? 1 : 0,
    serializeExpiryReminderSchedule(normalized.expiryReminderSchedule),
    encryptedNotes,
    normalized.localFileUri,
    normalized.previewUri,
    normalized.mimeType,
    encryptedPassportData,
    normalized.secondaryLocalFileUri,
    normalized.secondaryPreviewUri,
    normalized.secondaryMimeType,
    encryptedDrivingLicenceData,
    encryptedHealthCardData,
    encryptedPaymentCardData,
    encryptedFormalDocumentData,
    normalized.sensitive ? 1 : 0,
    timestamp,
    timestamp
  );

  if (
    existing &&
    (
      existing.localFileUri !== normalized.localFileUri ||
      existing.previewUri !== normalized.previewUri ||
      existing.secondaryLocalFileUri !== normalized.secondaryLocalFileUri ||
      existing.secondaryPreviewUri !== normalized.secondaryPreviewUri
    )
  ) {
    const nextUris = new Set(
      [normalized.localFileUri, normalized.previewUri, normalized.secondaryLocalFileUri, normalized.secondaryPreviewUri].filter(
        (value): value is string => Boolean(value)
      )
    );
    for (const uri of [existing.localFileUri, existing.previewUri, existing.secondaryLocalFileUri, existing.secondaryPreviewUri].filter((value): value is string => Boolean(value))) {
      if (!nextUris.has(uri)) {
        await deleteLocalFile(uri);
      }
    }
  }

  return id;
}

export async function upsertPackingItem(input: PackingItemDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('packing');
  const primaryTravellerId = input.travellerIds[0] ?? null;
  const encryptedTitle = (await encryptField(input.title)) ?? '';
  const encryptedNotes = (await encryptField(input.notes)) ?? '';

  await db.runAsync(
    `INSERT INTO packing_items (id, tripId, travellerId, title, category, quantity, isPacked, luggageType, assignmentScope, priority, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       travellerId = excluded.travellerId,
       title = excluded.title,
       category = excluded.category,
       quantity = excluded.quantity,
       isPacked = excluded.isPacked,
       luggageType = excluded.luggageType,
       assignmentScope = excluded.assignmentScope,
       priority = excluded.priority,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    primaryTravellerId,
    encryptedTitle,
    input.category,
    input.quantity,
    input.isPacked ? 1 : 0,
    input.luggageType,
    input.assignmentScope,
    input.priority,
    encryptedNotes,
    timestamp,
    timestamp
  );

  await replacePackingAssignments(id, input.assignmentScope === 'travellers' ? input.travellerIds : []);
  return id;
}

export async function upsertTravelSegment(input: TravelSegmentDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('segment');
  const encryptedAirline = (await encryptField(input.airline)) ?? '';
  const encryptedProviderCode = (await encryptField(input.providerCode ?? '')) ?? '';
  const encryptedProviderLogoUrl = await encryptField(input.providerLogoUrl ?? null);
  const encryptedFlightNumber = (await encryptField(input.flightNumber)) ?? '';
  const encryptedDepartureAirport = (await encryptField(input.departureAirport)) ?? '';
  const encryptedDepartureAirportCode = (await encryptField(input.departureAirportCode)) ?? '';
  const encryptedArrivalAirport = (await encryptField(input.arrivalAirport)) ?? '';
  const encryptedArrivalAirportCode = (await encryptField(input.arrivalAirportCode)) ?? '';
  const encryptedTerminal = (await encryptField(input.terminal)) ?? '';
  const encryptedGate = (await encryptField(input.gate)) ?? '';
  const encryptedBookingRef = (await encryptField(input.bookingRef)) ?? '';
  const encryptedNotes = (await encryptField(input.notes)) ?? '';

  await db.runAsync(
    `INSERT INTO travel_segments (id, tripId, transportType, travelDirection, airline, providerCode, providerLogoUrl, flightNumber, departureAirport, departureAirportCode, arrivalAirport, arrivalAirportCode, departureTime, arrivalTime, terminal, gate, bookingRef, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       transportType = excluded.transportType,
       travelDirection = excluded.travelDirection,
       airline = excluded.airline,
       providerCode = excluded.providerCode,
       providerLogoUrl = excluded.providerLogoUrl,
       flightNumber = excluded.flightNumber,
       departureAirport = excluded.departureAirport,
       departureAirportCode = excluded.departureAirportCode,
       arrivalAirport = excluded.arrivalAirport,
       arrivalAirportCode = excluded.arrivalAirportCode,
       departureTime = excluded.departureTime,
       arrivalTime = excluded.arrivalTime,
       terminal = excluded.terminal,
       gate = excluded.gate,
       bookingRef = excluded.bookingRef,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.transportType ?? 'flight',
    input.travelDirection ?? 'other',
    encryptedAirline,
    encryptedProviderCode,
    encryptedProviderLogoUrl,
    encryptedFlightNumber,
    encryptedDepartureAirport,
    encryptedDepartureAirportCode,
    encryptedArrivalAirport,
    encryptedArrivalAirportCode,
    input.departureTime,
    input.arrivalTime,
    encryptedTerminal,
    encryptedGate,
    encryptedBookingRef,
    encryptedNotes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertHotelStay(input: HotelStayDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('hotel');
  const existing = await db.getFirstAsync<{ hotelImageLocalPath: string | null }>(
    'SELECT hotelImageLocalPath FROM hotel_stays WHERE id = ?',
    id
  );
  const encryptedHotelName = (await encryptField(input.hotelName)) ?? '';
  const encryptedAddress = (await encryptField(input.address)) ?? '';
  const encryptedCity = (await encryptField(input.city ?? '')) ?? '';
  const encryptedCountry = (await encryptField(input.country ?? '')) ?? '';
  const encryptedHotelImageRemoteUrl = (await encryptField(input.hotelImageRemoteUrl)) ?? null;
  const encryptedHotelImageAttributionText = (await encryptField(input.hotelImageAttributionText)) ?? null;
  const encryptedHotelImageAttributionMeta = (await encryptField(JSON.stringify(input.hotelImageAttributionMeta ?? null))) ?? null;
  const encryptedPhone = (await encryptField(input.phone)) ?? '';
  const encryptedBookingRef = (await encryptField(input.bookingRef)) ?? '';
  const encryptedNotes = (await encryptField(input.notes)) ?? '';

  await db.runAsync(
    `INSERT INTO hotel_stays (id, tripId, hotelName, address, city, country, latitude, longitude, hotelImageLocalPath, hotelImageRemoteUrl, hotelImageSource, hotelImageAttributionText, hotelImageAttributionMeta, hotelImageStatus, phone, bookingRef, checkIn, checkOut, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       hotelName = excluded.hotelName,
       address = excluded.address,
       city = excluded.city,
       country = excluded.country,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       hotelImageLocalPath = excluded.hotelImageLocalPath,
       hotelImageRemoteUrl = excluded.hotelImageRemoteUrl,
       hotelImageSource = excluded.hotelImageSource,
       hotelImageAttributionText = excluded.hotelImageAttributionText,
       hotelImageAttributionMeta = excluded.hotelImageAttributionMeta,
       hotelImageStatus = excluded.hotelImageStatus,
       phone = excluded.phone,
       bookingRef = excluded.bookingRef,
       checkIn = excluded.checkIn,
       checkOut = excluded.checkOut,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    encryptedHotelName,
    encryptedAddress,
    encryptedCity,
    encryptedCountry,
    input.latitude ?? null,
    input.longitude ?? null,
    input.hotelImageLocalPath ?? null,
    encryptedHotelImageRemoteUrl,
    input.hotelImageSource,
    encryptedHotelImageAttributionText,
    encryptedHotelImageAttributionMeta,
    input.hotelImageStatus,
    encryptedPhone,
    encryptedBookingRef,
    input.checkIn,
    input.checkOut,
    encryptedNotes,
    timestamp,
    timestamp
  );

  if (existing?.hotelImageLocalPath && existing.hotelImageLocalPath !== input.hotelImageLocalPath) {
    await deleteLocalFile(existing.hotelImageLocalPath);
  }

  return id;
}

export async function upsertItineraryEvent(input: ItineraryEventDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('event');
  const encryptedTitle = (await encryptField(input.title)) ?? '';
  const encryptedLocation = (await encryptField(input.location)) ?? '';
  const encryptedConfirmationNumber = (await encryptField(input.confirmationNumber)) ?? '';
  const encryptedNotes = (await encryptField(input.notes)) ?? '';

  await db.runAsync(
    `INSERT INTO itinerary_events (id, tripId, title, type, dateTime, location, confirmationNumber, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       title = excluded.title,
       type = excluded.type,
       dateTime = excluded.dateTime,
       location = excluded.location,
       confirmationNumber = excluded.confirmationNumber,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    encryptedTitle,
    input.type,
    input.dateTime,
    encryptedLocation,
    encryptedConfirmationNumber,
    encryptedNotes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertEmergencyInfo(input: EmergencyInfoDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('emergency');
  const encryptedInsurerEmergencyNumber = (await encryptField(input.insurerEmergencyNumber)) ?? '';
  const encryptedHotelPhone = (await encryptField(input.hotelPhone)) ?? '';
  const encryptedAirlinePhone = (await encryptField(input.airlinePhone)) ?? '';
  const encryptedLocalEmergencyNote = (await encryptField(input.localEmergencyNote)) ?? '';
  const encryptedEmbassyConsulateNote = (await encryptField(input.embassyConsulateNote)) ?? '';
  const encryptedTravellerMedicalNote = (await encryptField(input.travellerMedicalNote)) ?? '';
  const encryptedEmergencyContacts = (await encryptField(input.emergencyContacts)) ?? '';

  await db.runAsync(
    `INSERT INTO emergency_infos (id, tripId, insurerEmergencyNumber, hotelPhone, airlinePhone, localEmergencyNote, embassyConsulateNote, travellerMedicalNote, emergencyContacts, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tripId) DO UPDATE SET
       insurerEmergencyNumber = excluded.insurerEmergencyNumber,
       hotelPhone = excluded.hotelPhone,
       airlinePhone = excluded.airlinePhone,
       localEmergencyNote = excluded.localEmergencyNote,
       embassyConsulateNote = excluded.embassyConsulateNote,
       travellerMedicalNote = excluded.travellerMedicalNote,
       emergencyContacts = excluded.emergencyContacts,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    encryptedInsurerEmergencyNumber,
    encryptedHotelPhone,
    encryptedAirlinePhone,
    encryptedLocalEmergencyNote,
    encryptedEmbassyConsulateNote,
    encryptedTravellerMedicalNote,
    encryptedEmergencyContacts,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertSavedVibe(input: SavedVibeDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const existing = await db.getFirstAsync<{ id: string; createdAt: string }>(
    'SELECT id, createdAt FROM saved_vibes WHERE tripId = ? AND source = ? AND sourceItemId = ?',
    input.tripId,
    input.source,
    input.sourceItemId
  );
  const id = existing?.id ?? input.id ?? createId('mood');
  const createdAt = existing?.createdAt ?? timestamp;
  const encryptedName = (await encryptField(input.name)) ?? '';
  const encryptedDisplayCategory = (await encryptField(input.displayCategory)) ?? '';
  const encryptedAddress = (await encryptField(input.address)) ?? '';
  const encryptedRating = await encryptField(input.rating);
  const encryptedRanking = await encryptField(input.ranking);
  const encryptedTripadvisorUrl = await encryptField(input.tripadvisorUrl);
  const encryptedWebsiteUrl = await encryptField(input.websiteUrl);
  const encryptedImageUrl = await encryptField(input.imageUrl);

  await db.runAsync(
    `INSERT INTO saved_vibes (
      id, tripId, source, sourceItemId, name, category, displayCategory, address, rating, ranking, tripadvisorUrl, websiteUrl, imageUrl, savedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tripId, source, sourceItemId) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      displayCategory = excluded.displayCategory,
      address = excluded.address,
      rating = excluded.rating,
      ranking = excluded.ranking,
      tripadvisorUrl = excluded.tripadvisorUrl,
      websiteUrl = excluded.websiteUrl,
      imageUrl = excluded.imageUrl,
      savedAt = excluded.savedAt,
      updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.source,
    input.sourceItemId,
    encryptedName,
    input.category,
    encryptedDisplayCategory,
    encryptedAddress,
    encryptedRating,
    encryptedRanking,
    encryptedTripadvisorUrl,
    encryptedWebsiteUrl,
    encryptedImageUrl,
    input.savedAt,
    createdAt,
    timestamp
  );

  return id;
}

export async function upsertVibeCacheEntry(input: VibeCacheEntryDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const existing = await db.getFirstAsync<{ id: string; createdAt: string }>(
    'SELECT id, createdAt FROM vibe_cache_entries WHERE queryKey = ?',
    input.queryKey
  );
  const id = existing?.id ?? input.id ?? createId('vibe_cache');
  const createdAt = existing?.createdAt ?? timestamp;
  const encryptedAreaLabel = (await encryptField(input.areaLabel)) ?? '';
  const encryptedPayloadJson = (await encryptField(input.payloadJson)) ?? '[]';

  await db.runAsync(
    `INSERT INTO vibe_cache_entries (
      id, tripId, queryKey, areaLabel, source, payloadJson, fetchedAt, expiresAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(queryKey) DO UPDATE SET
      tripId = excluded.tripId,
      areaLabel = excluded.areaLabel,
      source = excluded.source,
      payloadJson = excluded.payloadJson,
      fetchedAt = excluded.fetchedAt,
      expiresAt = excluded.expiresAt,
      updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.queryKey,
    encryptedAreaLabel,
    input.source,
    encryptedPayloadJson,
    input.fetchedAt,
    input.expiresAt,
    createdAt,
    timestamp
  );

  return id;
}

export async function upsertReminderSetting(input: ReminderSettingDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('reminder');

  await db.runAsync(
    `INSERT INTO reminder_settings (id, tripId, kind, enabled, leadTimeDays, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       kind = excluded.kind,
       enabled = excluded.enabled,
       leadTimeDays = excluded.leadTimeDays,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.kind,
    input.enabled ? 1 : 0,
    input.leadTimeDays,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertAppPreferences(input: AppPreferencesDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const normalized = normalizeAppPreferences(input as any);

  await db.runAsync(
    `INSERT INTO app_preferences (id, notificationsEnabled, expiryRemindersEnabled, expiryReminderSchedule, expiryReminderSilent, structuredDataProtected, profileName, profilePhotoUri, syncEnabled, syncMode, syncStatus, lastSyncAt, lastBackupAt, privacyMaskingMode, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       notificationsEnabled = excluded.notificationsEnabled,
       expiryRemindersEnabled = excluded.expiryRemindersEnabled,
       expiryReminderSchedule = excluded.expiryReminderSchedule,
       expiryReminderSilent = excluded.expiryReminderSilent,
       structuredDataProtected = excluded.structuredDataProtected,
       profileName = excluded.profileName,
       profilePhotoUri = excluded.profilePhotoUri,
       syncEnabled = excluded.syncEnabled,
       syncMode = excluded.syncMode,
       syncStatus = excluded.syncStatus,
       lastSyncAt = excluded.lastSyncAt,
       lastBackupAt = excluded.lastBackupAt,
       privacyMaskingMode = excluded.privacyMaskingMode,
       updatedAt = excluded.updatedAt`,
    normalized.id,
    normalized.notificationsEnabled ? 1 : 0,
    normalized.expiryRemindersEnabled ? 1 : 0,
    serializeExpiryReminderSchedule(normalized.expiryReminderSchedule),
    normalized.expiryReminderSilent ? 1 : 0,
    normalized.structuredDataProtected ? 1 : 0,
    normalized.profileName,
    normalized.profilePhotoUri,
    normalized.syncEnabled ? 1 : 0,
    normalized.syncMode,
    normalized.syncStatus,
    normalized.lastSyncAt,
    normalized.lastBackupAt,
    normalized.privacyMaskingMode,
    timestamp,
    timestamp
  );

  return input.id;
}

export async function upsertTripParticipant(input: TripParticipantDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('participant');
  const encryptedDisplayName = (await encryptField(input.displayName)) ?? '';
  const encryptedEmail = (await encryptField(input.email)) ?? '';
  const encryptedInviteCode = (await encryptField(input.inviteCode)) ?? '';

  await db.runAsync(
    `INSERT INTO trip_participants (id, tripId, displayName, email, role, avatarColor, inviteCode, isLocalProfile, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       displayName = excluded.displayName,
       email = excluded.email,
       role = excluded.role,
       avatarColor = excluded.avatarColor,
       inviteCode = excluded.inviteCode,
       isLocalProfile = excluded.isLocalProfile,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    encryptedDisplayName,
    encryptedEmail,
    input.role,
    input.avatarColor,
    encryptedInviteCode,
    input.isLocalProfile ? 1 : 0,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertTripInvite(input: TripInviteDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('invite');
  const encryptedEmail = (await encryptField(input.email)) ?? '';
  const encryptedInviteCode = (await encryptField(input.inviteCode)) ?? '';

  await db.runAsync(
    `INSERT INTO trip_invites (id, tripId, email, inviteCode, role, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       email = excluded.email,
       inviteCode = excluded.inviteCode,
       role = excluded.role,
       status = excluded.status,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    encryptedEmail,
    encryptedInviteCode,
    input.role,
    input.status,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertSharedTripState(input: SharedTripStateDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const encryptedShareCode = (await encryptField(input.shareCode)) ?? '';

  await db.runAsync(
    `INSERT INTO shared_trip_states (
      tripId, shareCode, syncEnabled, syncStatus, lastSyncAt, lastExportedAt, lastImportedAt, lastKnownRemoteUpdatedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tripId) DO UPDATE SET
      shareCode = excluded.shareCode,
      syncEnabled = excluded.syncEnabled,
      syncStatus = excluded.syncStatus,
      lastSyncAt = excluded.lastSyncAt,
      lastExportedAt = excluded.lastExportedAt,
      lastImportedAt = excluded.lastImportedAt,
      lastKnownRemoteUpdatedAt = excluded.lastKnownRemoteUpdatedAt,
      updatedAt = excluded.updatedAt`,
    input.tripId,
    encryptedShareCode,
    input.syncEnabled ? 1 : 0,
    input.syncStatus,
    input.lastSyncAt,
    input.lastExportedAt,
    input.lastImportedAt,
    input.lastKnownRemoteUpdatedAt,
    timestamp,
    timestamp
  );

  return input.tripId;
}

export async function upsertSyncConflict(input: SyncConflictDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('conflict');
  const encryptedShareCode = (await encryptField(input.shareCode)) ?? '';
  const encryptedSummary = (await encryptField(input.summary)) ?? '';
  const encryptedIncomingPayload = (await encryptField(input.incomingPayload)) ?? '';

  await db.runAsync(
    `INSERT INTO sync_conflicts (
      id, tripId, shareCode, summary, localUpdatedAt, incomingUpdatedAt, incomingPayload, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tripId = excluded.tripId,
      shareCode = excluded.shareCode,
      summary = excluded.summary,
      localUpdatedAt = excluded.localUpdatedAt,
      incomingUpdatedAt = excluded.incomingUpdatedAt,
      incomingPayload = excluded.incomingPayload,
      status = excluded.status,
      updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    encryptedShareCode,
    encryptedSummary,
    input.localUpdatedAt,
    input.incomingUpdatedAt,
    encryptedIncomingPayload,
    input.status,
    timestamp,
    timestamp
  );

  return id;
}

export async function deleteById(table: string, id: string) {
  const db = await getDatabase();
  if (table === 'documents') {
    const document = await db.getFirstAsync<{
      localFileUri: string;
      previewUri: string | null;
      secondaryLocalFileUri: string | null;
      secondaryPreviewUri: string | null;
    }>(
      'SELECT localFileUri, previewUri, secondaryLocalFileUri, secondaryPreviewUri FROM documents WHERE id = ?',
      id
    );
    await cleanupDocumentFiles(document);
  }

  if (table === 'trips') {
    await cleanupTripFiles(id);
  }

  if (table === 'hotel_stays') {
    const hotel = await db.getFirstAsync<{ hotelImageLocalPath: string | null }>(
      'SELECT hotelImageLocalPath FROM hotel_stays WHERE id = ?',
      id
    );
    if (hotel?.hotelImageLocalPath) {
      await deleteLocalFile(hotel.hotelImageLocalPath);
    }
  }

  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
}

export async function clearAllData() {
  const db = await getDatabase();
  const [trips, documents] = await Promise.all([
    db.getAllAsync<{ coverImageUri: string | null; destinationImageLocalPath: string | null }>(
      'SELECT coverImageUri, destinationImageLocalPath FROM trips'
    ),
    db.getAllAsync<{
      localFileUri: string;
      previewUri: string | null;
      secondaryLocalFileUri: string | null;
      secondaryPreviewUri: string | null;
    }>('SELECT localFileUri, previewUri, secondaryLocalFileUri, secondaryPreviewUri FROM documents'),
  ]);

  for (const trip of trips) {
    const tripImageUris = new Set([trip.coverImageUri, trip.destinationImageLocalPath].filter((value): value is string => Boolean(value)));
    for (const uri of tripImageUris) {
      await deleteLocalFile(uri);
    }
  }

  for (const document of documents) {
    await cleanupDocumentFiles(document);
  }

  await db.execAsync(`
    DELETE FROM sync_conflicts;
    DELETE FROM trip_invites;
    DELETE FROM trip_participants;
    DELETE FROM shared_trip_states;
    DELETE FROM reminder_settings;
    DELETE FROM packing_item_travellers;
    DELETE FROM emergency_infos;
    DELETE FROM itinerary_events;
    DELETE FROM hotel_stays;
    DELETE FROM travel_segments;
    DELETE FROM saved_vibes;
    DELETE FROM vibe_cache_entries;
    DELETE FROM packing_items;
    DELETE FROM documents;
    DELETE FROM travellers;
    DELETE FROM trips;
    DELETE FROM app_preferences;
  `);
  await upsertAppPreferences(defaultAppPreferences());
}

export async function persistSnapshot(snapshot: AppDataSnapshot) {
  await upsertAppPreferences(snapshot.appPreferences);
  for (const trip of snapshot.trips) await upsertTrip(trip);
  for (const traveller of snapshot.travellers) await upsertTraveller(traveller);
  for (const participant of snapshot.tripParticipants) await upsertTripParticipant(participant);
  for (const invite of snapshot.tripInvites) await upsertTripInvite(invite);
  for (const sharedTripState of snapshot.sharedTripStates) await upsertSharedTripState(sharedTripState);
  for (const document of snapshot.documents) await upsertDocument(document);
  for (const item of snapshot.packingItems) await upsertPackingItem(item);
  for (const segment of snapshot.travelSegments) await upsertTravelSegment(segment);
  for (const hotel of snapshot.hotelStays) await upsertHotelStay(hotel);
  for (const event of snapshot.itineraryEvents) await upsertItineraryEvent(event);
  for (const emergency of snapshot.emergencyInfos) await upsertEmergencyInfo(emergency);
  for (const reminder of snapshot.reminderSettings) await upsertReminderSetting(reminder);
  for (const savedVibe of snapshot.savedVibes) await upsertSavedVibe(savedVibe);
  for (const cacheEntry of snapshot.vibeCacheEntries) await upsertVibeCacheEntry(cacheEntry);
  for (const conflict of snapshot.syncConflicts) await upsertSyncConflict(conflict);
}

export async function replaceAllData(snapshot: AppDataSnapshot) {
  await clearAllData();
  await persistSnapshot(snapshot);
}
