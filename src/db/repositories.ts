import { getDatabase } from './client';

import { createId } from '@/utils/ids';
import {
  defaultAppExpiryPreferences,
  normalizeAppPreferences,
  normalizeDocumentRecord,
  serializeExpiryReminderSchedule,
} from '@/utils/documentExpiry';
import { deleteLocalFile } from '@/utils/fileStorage';
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
  SharedTripStateDraft,
  SyncConflictDraft,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
  TripInviteDraft,
  TripParticipantDraft,
} from '@/types/models';

function now() {
  return new Date().toISOString();
}

async function cleanupDocumentFiles(document: { localFileUri: string; previewUri: string | null } | null | undefined) {
  if (!document) {
    return;
  }

  const uris = new Set([document.localFileUri, document.previewUri].filter((value): value is string => Boolean(value)));
  for (const uri of uris) {
    await deleteLocalFile(uri);
  }
}

async function cleanupTripFiles(tripId: string) {
  const db = await getDatabase();
  const trip = await db.getFirstAsync<{ coverImageUri: string | null }>('SELECT coverImageUri FROM trips WHERE id = ?', tripId);
  const documents = await db.getAllAsync<{ localFileUri: string; previewUri: string | null }>(
    'SELECT localFileUri, previewUri FROM documents WHERE tripId = ?',
    tripId
  );

  if (trip?.coverImageUri) {
    await deleteLocalFile(trip.coverImageUri);
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
    appPreferencesRaw,
    tripParticipants,
    tripInvites,
    sharedTripStates,
    syncConflicts,
  ] = await Promise.all([
    db.getAllAsync<any>('SELECT * FROM trips ORDER BY startDate ASC'),
    db.getAllAsync<any>('SELECT * FROM travellers ORDER BY fullName ASC'),
    db.getAllAsync<any>('SELECT * FROM documents ORDER BY createdAt DESC'),
    db.getAllAsync<any>('SELECT * FROM packing_items ORDER BY category ASC, title ASC'),
    db.getAllAsync<{ packingItemId: string; travellerId: string }>(
      'SELECT packingItemId, travellerId FROM packing_item_travellers'
    ),
    db.getAllAsync<any>('SELECT * FROM travel_segments ORDER BY departureTime ASC'),
    db.getAllAsync<any>('SELECT * FROM hotel_stays ORDER BY checkIn ASC'),
    db.getAllAsync<any>('SELECT * FROM itinerary_events ORDER BY dateTime ASC'),
    db.getAllAsync<any>('SELECT * FROM emergency_infos ORDER BY createdAt DESC'),
    db.getAllAsync<any>('SELECT * FROM reminder_settings ORDER BY tripId ASC, kind ASC'),
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
        syncEnabled: toBool(appPreferencesRaw.syncEnabled),
      })
    : defaultAppPreferences();

  return {
    trips,
    travellers,
    documents: documents.map((document) =>
      normalizeDocumentRecord({
        ...document,
        sensitive: toBool(document.sensitive),
        expiryReminderEnabled: toBool(document.expiryReminderEnabled ?? 1),
        expiryReminderSchedule: document.expiryReminderSchedule,
      })
    ),
    packingItems: packingItemsRaw.map((item) => ({
      ...item,
      isPacked: toBool(item.isPacked),
      travellerIds: assignmentMap[item.id] ?? (item.travellerId ? [item.travellerId] : []),
    })),
    travelSegments,
    hotelStays,
    itineraryEvents,
    emergencyInfos,
    reminderSettings: reminderSettings.map((setting) => ({
      ...setting,
      enabled: toBool(setting.enabled),
    })),
    appPreferences,
    tripParticipants: tripParticipants.map((participant) => ({
      ...participant,
      isLocalProfile: toBool(participant.isLocalProfile),
    })),
    tripInvites,
    sharedTripStates: sharedTripStates.map((state) => ({
      ...state,
      syncEnabled: toBool(state.syncEnabled),
    })),
    syncConflicts,
  };
}

export async function upsertTrip(input: TripDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('trip');
  const existing = input.id
    ? await db.getFirstAsync<{ coverImageUri: string | null }>('SELECT coverImageUri FROM trips WHERE id = ?', input.id)
    : null;

  await db.runAsync(
    `INSERT INTO trips (id, name, destination, startDate, endDate, coverImageUri, notes, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       destination = excluded.destination,
       startDate = excluded.startDate,
       endDate = excluded.endDate,
       coverImageUri = excluded.coverImageUri,
       notes = excluded.notes,
       status = excluded.status,
       updatedAt = excluded.updatedAt`,
    id,
    input.name,
    input.destination,
    input.startDate,
    input.endDate,
    input.coverImageUri,
    input.notes,
    input.status,
    timestamp,
    timestamp
  );

  if (existing?.coverImageUri && existing.coverImageUri !== input.coverImageUri) {
    await deleteLocalFile(existing.coverImageUri);
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO shared_trip_states (
      tripId, shareCode, syncEnabled, syncStatus, lastSyncAt, lastExportedAt, lastImportedAt, lastKnownRemoteUpdatedAt, createdAt, updatedAt
    ) VALUES (?, ?, 0, 'local_only', NULL, NULL, NULL, NULL, ?, ?)`,
    id,
    `PINE-${id.slice(-6).toUpperCase()}`,
    timestamp,
    timestamp
  );

  await db.runAsync(
    `INSERT OR IGNORE INTO trip_participants (
      id, tripId, displayName, email, role, avatarColor, inviteCode, isLocalProfile, createdAt, updatedAt
    ) VALUES (?, ?, 'You', '', 'owner', '#F4B400', ?, 1, ?, ?)`,
    `participant_${id}`,
    id,
    `PINE-${id.slice(-6).toUpperCase()}`,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertTraveller(input: TravellerDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('traveller');

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
    input.fullName,
    input.dateOfBirth,
    input.passportNationality,
    input.passportNumber,
    input.ghicNumber,
    input.medicalNote,
    input.notes,
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
    ? await db.getFirstAsync<{ localFileUri: string; previewUri: string | null }>(
        'SELECT localFileUri, previewUri FROM documents WHERE id = ?',
        input.id
      )
    : null;

  await db.runAsync(
    `INSERT INTO documents (id, tripId, travellerId, holderName, documentType, documentNumber, issueDate, expiryDate, expiryReminderEnabled, expiryReminderSchedule, notes, localFileUri, previewUri, mimeType, sensitive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
       sensitive = excluded.sensitive,
       updatedAt = excluded.updatedAt`,
    id,
    normalized.tripId,
    normalized.travellerId,
    normalized.holderName,
    normalized.documentType,
    normalized.documentNumber,
    normalized.issueDate,
    normalized.expiryDate,
    normalized.expiryReminderEnabled ? 1 : 0,
    serializeExpiryReminderSchedule(normalized.expiryReminderSchedule),
    normalized.notes,
    normalized.localFileUri,
    normalized.previewUri,
    normalized.mimeType,
    normalized.sensitive ? 1 : 0,
    timestamp,
    timestamp
  );

  if (
    existing &&
    (existing.localFileUri !== normalized.localFileUri || existing.previewUri !== normalized.previewUri)
  ) {
    const nextUris = new Set([normalized.localFileUri, normalized.previewUri].filter((value): value is string => Boolean(value)));
    for (const uri of [existing.localFileUri, existing.previewUri].filter((value): value is string => Boolean(value))) {
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
    input.title,
    input.category,
    input.quantity,
    input.isPacked ? 1 : 0,
    input.luggageType,
    input.assignmentScope,
    input.priority,
    input.notes,
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

  await db.runAsync(
    `INSERT INTO travel_segments (id, tripId, airline, flightNumber, departureAirport, arrivalAirport, departureTime, arrivalTime, terminal, gate, bookingRef, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       airline = excluded.airline,
       flightNumber = excluded.flightNumber,
       departureAirport = excluded.departureAirport,
       arrivalAirport = excluded.arrivalAirport,
       departureTime = excluded.departureTime,
       arrivalTime = excluded.arrivalTime,
       terminal = excluded.terminal,
       gate = excluded.gate,
       bookingRef = excluded.bookingRef,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.airline,
    input.flightNumber,
    input.departureAirport,
    input.arrivalAirport,
    input.departureTime,
    input.arrivalTime,
    input.terminal,
    input.gate,
    input.bookingRef,
    input.notes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertHotelStay(input: HotelStayDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('hotel');

  await db.runAsync(
    `INSERT INTO hotel_stays (id, tripId, hotelName, address, phone, bookingRef, checkIn, checkOut, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tripId = excluded.tripId,
       hotelName = excluded.hotelName,
       address = excluded.address,
       phone = excluded.phone,
       bookingRef = excluded.bookingRef,
       checkIn = excluded.checkIn,
       checkOut = excluded.checkOut,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt`,
    id,
    input.tripId,
    input.hotelName,
    input.address,
    input.phone,
    input.bookingRef,
    input.checkIn,
    input.checkOut,
    input.notes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertItineraryEvent(input: ItineraryEventDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('event');

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
    input.title,
    input.type,
    input.dateTime,
    input.location,
    input.confirmationNumber,
    input.notes,
    timestamp,
    timestamp
  );

  return id;
}

export async function upsertEmergencyInfo(input: EmergencyInfoDraft) {
  const db = await getDatabase();
  const timestamp = now();
  const id = input.id ?? createId('emergency');

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
    input.insurerEmergencyNumber,
    input.hotelPhone,
    input.airlinePhone,
    input.localEmergencyNote,
    input.embassyConsulateNote,
    input.travellerMedicalNote,
    input.emergencyContacts,
    timestamp,
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
    `INSERT INTO app_preferences (id, notificationsEnabled, expiryRemindersEnabled, expiryReminderSchedule, expiryReminderSilent, syncEnabled, syncMode, syncStatus, lastSyncAt, lastBackupAt, privacyMaskingMode, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       notificationsEnabled = excluded.notificationsEnabled,
       expiryRemindersEnabled = excluded.expiryRemindersEnabled,
       expiryReminderSchedule = excluded.expiryReminderSchedule,
       expiryReminderSilent = excluded.expiryReminderSilent,
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
    input.displayName,
    input.email,
    input.role,
    input.avatarColor,
    input.inviteCode,
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
    input.email,
    input.inviteCode,
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
    input.shareCode,
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
    input.shareCode,
    input.summary,
    input.localUpdatedAt,
    input.incomingUpdatedAt,
    input.incomingPayload,
    input.status,
    timestamp,
    timestamp
  );

  return id;
}

export async function deleteById(table: string, id: string) {
  const db = await getDatabase();
  if (table === 'documents') {
    const document = await db.getFirstAsync<{ localFileUri: string; previewUri: string | null }>(
      'SELECT localFileUri, previewUri FROM documents WHERE id = ?',
      id
    );
    await cleanupDocumentFiles(document);
  }

  if (table === 'trips') {
    await cleanupTripFiles(id);
  }

  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
}

export async function clearAllData() {
  const db = await getDatabase();
  const [trips, documents] = await Promise.all([
    db.getAllAsync<{ coverImageUri: string | null }>('SELECT coverImageUri FROM trips'),
    db.getAllAsync<{ localFileUri: string; previewUri: string | null }>('SELECT localFileUri, previewUri FROM documents'),
  ]);

  for (const trip of trips) {
    if (trip.coverImageUri) {
      await deleteLocalFile(trip.coverImageUri);
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
  for (const conflict of snapshot.syncConflicts) await upsertSyncConflict(conflict);
}

export async function replaceAllData(snapshot: AppDataSnapshot) {
  await clearAllData();
  await persistSnapshot(snapshot);
}
