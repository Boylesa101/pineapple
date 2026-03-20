import { del, get, set } from 'idb-keyval';

import { createId } from '@/utils/ids';
import {
  defaultAppExpiryPreferences,
  normalizeAppPreferences,
  normalizeDocumentRecord,
} from '@/utils/documentExpiry';
import { normalizeHotelStayRecord } from '@/utils/hotels';
import { decryptStructuredValue, encryptStructuredValue } from '@/utils/structuredDataEncryption';
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
  SharedTripStateDraft,
  SyncConflictDraft,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
  TripInviteDraft,
  TripParticipantDraft,
} from '@/types/models';

const SNAPSHOT_KEY = 'pineapple.snapshot';

function now() {
  return new Date().toISOString();
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

function emptySnapshot(timestamp = now()): AppDataSnapshot {
  return {
    trips: [],
    travellers: [],
    documents: [],
    packingItems: [],
    travelSegments: [],
    hotelStays: [],
    itineraryEvents: [],
    emergencyInfos: [],
    reminderSettings: [],
    appPreferences: defaultAppPreferences(timestamp),
    tripParticipants: [],
    tripInvites: [],
    sharedTripStates: [],
    syncConflicts: [],
  };
}

async function decryptSnapshot(snapshot: AppDataSnapshot): Promise<AppDataSnapshot> {
  return {
    ...snapshot,
    trips: await Promise.all(
      (snapshot.trips ?? []).map(async (trip) => ({
        ...trip,
        name: (await decryptStructuredValue(trip.name)) ?? '',
        destination: (await decryptStructuredValue(trip.destination)) ?? '',
        destinationImageRemoteUrl: await decryptStructuredValue(trip.destinationImageRemoteUrl),
        heroImageRemoteUrl: await decryptStructuredValue(trip.heroImageRemoteUrl),
        attributionText: await decryptStructuredValue(trip.attributionText),
        attributionMeta: await decryptStructuredValue(trip.attributionMeta as unknown as string | null),
        notes: (await decryptStructuredValue(trip.notes)) ?? '',
        transferSummary: (await decryptStructuredValue(trip.transferSummary)) ?? '',
      }))
    ),
    travellers: await Promise.all(
      (snapshot.travellers ?? []).map(async (traveller) => ({
        ...traveller,
        fullName: (await decryptStructuredValue(traveller.fullName)) ?? '',
        dateOfBirth: await decryptStructuredValue(traveller.dateOfBirth),
        passportNationality: (await decryptStructuredValue(traveller.passportNationality)) ?? '',
        passportNumber: (await decryptStructuredValue(traveller.passportNumber)) ?? '',
        ghicNumber: (await decryptStructuredValue(traveller.ghicNumber)) ?? '',
        medicalNote: (await decryptStructuredValue(traveller.medicalNote)) ?? '',
        notes: (await decryptStructuredValue(traveller.notes)) ?? '',
      }))
    ),
    documents: await Promise.all(
      (snapshot.documents ?? []).map(async (document) => ({
        ...document,
        holderName: (await decryptStructuredValue(document.holderName)) ?? '',
        documentNumber: (await decryptStructuredValue(document.documentNumber)) ?? '',
        notes: (await decryptStructuredValue(document.notes)) ?? '',
        passportData: document.passportData,
        drivingLicenceData: document.drivingLicenceData,
        healthCardData: document.healthCardData,
        paymentCardData: document.paymentCardData,
        formalDocumentData: document.formalDocumentData,
      }))
    ),
    packingItems: await Promise.all(
      (snapshot.packingItems ?? []).map(async (item) => ({
        ...item,
        title: (await decryptStructuredValue(item.title)) ?? '',
        notes: (await decryptStructuredValue(item.notes)) ?? '',
      }))
    ),
    travelSegments: await Promise.all(
      (snapshot.travelSegments ?? []).map(async (segment) => ({
        ...segment,
        airline: (await decryptStructuredValue(segment.airline)) ?? '',
        flightNumber: (await decryptStructuredValue(segment.flightNumber)) ?? '',
        departureAirport: (await decryptStructuredValue(segment.departureAirport)) ?? '',
        departureAirportCode: (await decryptStructuredValue(segment.departureAirportCode)) ?? '',
        arrivalAirport: (await decryptStructuredValue(segment.arrivalAirport)) ?? '',
        arrivalAirportCode: (await decryptStructuredValue(segment.arrivalAirportCode)) ?? '',
        terminal: (await decryptStructuredValue(segment.terminal)) ?? '',
        gate: (await decryptStructuredValue(segment.gate)) ?? '',
        bookingRef: (await decryptStructuredValue(segment.bookingRef)) ?? '',
        notes: (await decryptStructuredValue(segment.notes)) ?? '',
      }))
    ),
    hotelStays: await Promise.all(
      (snapshot.hotelStays ?? []).map(async (hotel) => {
        const decryptedAttributionMeta = (await decryptStructuredValue(hotel.hotelImageAttributionMeta as unknown as string)) ?? null;
        return normalizeHotelStayRecord({
          id: hotel.id,
          tripId: hotel.tripId,
          hotelName: (await decryptStructuredValue(hotel.hotelName)) ?? '',
          address: (await decryptStructuredValue(hotel.address)) ?? '',
          hotelImageLocalPath: hotel.hotelImageLocalPath ?? null,
          hotelImageRemoteUrl: (await decryptStructuredValue(hotel.hotelImageRemoteUrl)) ?? null,
          hotelImageSource: hotel.hotelImageSource,
          hotelImageAttributionText: (await decryptStructuredValue(hotel.hotelImageAttributionText)) ?? null,
          hotelImageAttributionMeta: decryptedAttributionMeta as unknown,
          hotelImageStatus: hotel.hotelImageStatus,
          phone: (await decryptStructuredValue(hotel.phone)) ?? '',
          bookingRef: (await decryptStructuredValue(hotel.bookingRef)) ?? '',
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          notes: (await decryptStructuredValue(hotel.notes)) ?? '',
          createdAt: hotel.createdAt,
          updatedAt: hotel.updatedAt,
        } as any);
      })
    ),
    itineraryEvents: await Promise.all(
      (snapshot.itineraryEvents ?? []).map(async (event) => ({
        ...event,
        title: (await decryptStructuredValue(event.title)) ?? '',
        location: (await decryptStructuredValue(event.location)) ?? '',
        confirmationNumber: (await decryptStructuredValue(event.confirmationNumber)) ?? '',
        notes: (await decryptStructuredValue(event.notes)) ?? '',
      }))
    ),
    emergencyInfos: await Promise.all(
      (snapshot.emergencyInfos ?? []).map(async (info) => ({
        ...info,
        insurerEmergencyNumber: (await decryptStructuredValue(info.insurerEmergencyNumber)) ?? '',
        hotelPhone: (await decryptStructuredValue(info.hotelPhone)) ?? '',
        airlinePhone: (await decryptStructuredValue(info.airlinePhone)) ?? '',
        localEmergencyNote: (await decryptStructuredValue(info.localEmergencyNote)) ?? '',
        embassyConsulateNote: (await decryptStructuredValue(info.embassyConsulateNote)) ?? '',
        travellerMedicalNote: (await decryptStructuredValue(info.travellerMedicalNote)) ?? '',
        emergencyContacts: (await decryptStructuredValue(info.emergencyContacts)) ?? '',
      }))
    ),
    tripParticipants: await Promise.all(
      (snapshot.tripParticipants ?? []).map(async (participant) => ({
        ...participant,
        displayName: (await decryptStructuredValue(participant.displayName)) ?? '',
        email: (await decryptStructuredValue(participant.email)) ?? '',
        inviteCode: (await decryptStructuredValue(participant.inviteCode)) ?? '',
      }))
    ),
    tripInvites: await Promise.all(
      (snapshot.tripInvites ?? []).map(async (invite) => ({
        ...invite,
        email: (await decryptStructuredValue(invite.email)) ?? '',
        inviteCode: (await decryptStructuredValue(invite.inviteCode)) ?? '',
      }))
    ),
    sharedTripStates: await Promise.all(
      (snapshot.sharedTripStates ?? []).map(async (state) => ({
        ...state,
        shareCode: (await decryptStructuredValue(state.shareCode)) ?? '',
      }))
    ),
    syncConflicts: await Promise.all(
      (snapshot.syncConflicts ?? []).map(async (conflict) => ({
        ...conflict,
        shareCode: (await decryptStructuredValue(conflict.shareCode)) ?? '',
        summary: (await decryptStructuredValue(conflict.summary)) ?? '',
        incomingPayload: (await decryptStructuredValue(conflict.incomingPayload)) ?? '',
      }))
    ),
  } as AppDataSnapshot;
}

async function encryptSnapshot(snapshot: AppDataSnapshot): Promise<AppDataSnapshot> {
  return {
    ...snapshot,
    appPreferences: {
      ...snapshot.appPreferences,
      structuredDataProtected: true,
    },
    trips: await Promise.all(
      (snapshot.trips ?? []).map(async (trip) => ({
        ...trip,
        name: (await encryptStructuredValue(trip.name)) ?? '',
        destination: (await encryptStructuredValue(trip.destination)) ?? '',
        destinationImageRemoteUrl: await encryptStructuredValue(trip.destinationImageRemoteUrl),
        heroImageRemoteUrl: await encryptStructuredValue(trip.heroImageRemoteUrl),
        attributionText: await encryptStructuredValue(trip.attributionText),
        attributionMeta: await encryptStructuredValue(
          trip.attributionMeta ? JSON.stringify(trip.attributionMeta) : null
        ),
        notes: (await encryptStructuredValue(trip.notes)) ?? '',
        transferSummary: (await encryptStructuredValue(trip.transferSummary)) ?? '',
      }))
    ),
    travellers: await Promise.all(
      (snapshot.travellers ?? []).map(async (traveller) => ({
        ...traveller,
        fullName: (await encryptStructuredValue(traveller.fullName)) ?? '',
        dateOfBirth: await encryptStructuredValue(traveller.dateOfBirth),
        passportNationality: (await encryptStructuredValue(traveller.passportNationality)) ?? '',
        passportNumber: (await encryptStructuredValue(traveller.passportNumber)) ?? '',
        ghicNumber: (await encryptStructuredValue(traveller.ghicNumber)) ?? '',
        medicalNote: (await encryptStructuredValue(traveller.medicalNote)) ?? '',
        notes: (await encryptStructuredValue(traveller.notes)) ?? '',
      }))
    ),
    documents: await Promise.all(
      (snapshot.documents ?? []).map(async (document) => ({
        ...document,
        holderName: (await encryptStructuredValue(document.holderName)) ?? '',
        documentNumber: (await encryptStructuredValue(document.documentNumber)) ?? '',
        notes: (await encryptStructuredValue(document.notes)) ?? '',
      }))
    ),
    packingItems: await Promise.all(
      (snapshot.packingItems ?? []).map(async (item) => ({
        ...item,
        title: (await encryptStructuredValue(item.title)) ?? '',
        notes: (await encryptStructuredValue(item.notes)) ?? '',
      }))
    ),
    travelSegments: await Promise.all(
      (snapshot.travelSegments ?? []).map(async (segment) => ({
        ...segment,
        airline: (await encryptStructuredValue(segment.airline)) ?? '',
        flightNumber: (await encryptStructuredValue(segment.flightNumber)) ?? '',
        departureAirport: (await encryptStructuredValue(segment.departureAirport)) ?? '',
        departureAirportCode: (await encryptStructuredValue(segment.departureAirportCode)) ?? '',
        arrivalAirport: (await encryptStructuredValue(segment.arrivalAirport)) ?? '',
        arrivalAirportCode: (await encryptStructuredValue(segment.arrivalAirportCode)) ?? '',
        terminal: (await encryptStructuredValue(segment.terminal)) ?? '',
        gate: (await encryptStructuredValue(segment.gate)) ?? '',
        bookingRef: (await encryptStructuredValue(segment.bookingRef)) ?? '',
        notes: (await encryptStructuredValue(segment.notes)) ?? '',
      }))
    ),
    hotelStays: await Promise.all(
      (snapshot.hotelStays ?? []).map(async (hotel) => ({
        ...hotel,
        hotelName: (await encryptStructuredValue(hotel.hotelName)) ?? '',
        address: (await encryptStructuredValue(hotel.address)) ?? '',
        hotelImageRemoteUrl: (await encryptStructuredValue(hotel.hotelImageRemoteUrl)) ?? null,
        hotelImageAttributionText: (await encryptStructuredValue(hotel.hotelImageAttributionText)) ?? null,
        hotelImageAttributionMeta: (await encryptStructuredValue(JSON.stringify(hotel.hotelImageAttributionMeta ?? null))) ?? null,
        phone: (await encryptStructuredValue(hotel.phone)) ?? '',
        bookingRef: (await encryptStructuredValue(hotel.bookingRef)) ?? '',
        notes: (await encryptStructuredValue(hotel.notes)) ?? '',
      }))
    ),
    itineraryEvents: await Promise.all(
      (snapshot.itineraryEvents ?? []).map(async (event) => ({
        ...event,
        title: (await encryptStructuredValue(event.title)) ?? '',
        location: (await encryptStructuredValue(event.location)) ?? '',
        confirmationNumber: (await encryptStructuredValue(event.confirmationNumber)) ?? '',
        notes: (await encryptStructuredValue(event.notes)) ?? '',
      }))
    ),
    emergencyInfos: await Promise.all(
      (snapshot.emergencyInfos ?? []).map(async (info) => ({
        ...info,
        insurerEmergencyNumber: (await encryptStructuredValue(info.insurerEmergencyNumber)) ?? '',
        hotelPhone: (await encryptStructuredValue(info.hotelPhone)) ?? '',
        airlinePhone: (await encryptStructuredValue(info.airlinePhone)) ?? '',
        localEmergencyNote: (await encryptStructuredValue(info.localEmergencyNote)) ?? '',
        embassyConsulateNote: (await encryptStructuredValue(info.embassyConsulateNote)) ?? '',
        travellerMedicalNote: (await encryptStructuredValue(info.travellerMedicalNote)) ?? '',
        emergencyContacts: (await encryptStructuredValue(info.emergencyContacts)) ?? '',
      }))
    ),
    tripParticipants: await Promise.all(
      (snapshot.tripParticipants ?? []).map(async (participant) => ({
        ...participant,
        displayName: (await encryptStructuredValue(participant.displayName)) ?? '',
        email: (await encryptStructuredValue(participant.email)) ?? '',
        inviteCode: (await encryptStructuredValue(participant.inviteCode)) ?? '',
      }))
    ),
    tripInvites: await Promise.all(
      (snapshot.tripInvites ?? []).map(async (invite) => ({
        ...invite,
        email: (await encryptStructuredValue(invite.email)) ?? '',
        inviteCode: (await encryptStructuredValue(invite.inviteCode)) ?? '',
      }))
    ),
    sharedTripStates: await Promise.all(
      (snapshot.sharedTripStates ?? []).map(async (state) => ({
        ...state,
        shareCode: (await encryptStructuredValue(state.shareCode)) ?? '',
      }))
    ),
    syncConflicts: await Promise.all(
      (snapshot.syncConflicts ?? []).map(async (conflict) => ({
        ...conflict,
        shareCode: (await encryptStructuredValue(conflict.shareCode)) ?? '',
        summary: (await encryptStructuredValue(conflict.summary)) ?? '',
        incomingPayload: (await encryptStructuredValue(conflict.incomingPayload)) ?? '',
      }))
    ),
  } as AppDataSnapshot;
}

async function readSnapshot() {
  const snapshot = (await get<AppDataSnapshot>(SNAPSHOT_KEY)) ?? emptySnapshot();
  const decrypted = await decryptSnapshot(snapshot);
  return {
    ...decrypted,
    trips: (decrypted.trips ?? []).map((trip) => normalizeTripRecord(trip as any)),
    documents: (decrypted.documents ?? []).map((document) => normalizeDocumentRecord(document as any)),
    appPreferences: {
      ...normalizeAppPreferences({
        ...defaultAppPreferences(decrypted.appPreferences?.createdAt ?? now()),
        ...decrypted.appPreferences,
        lastBackupAt: decrypted.appPreferences?.lastBackupAt ?? null,
      } as any),
    },
  };
}

function normalizeSnapshot(snapshot: AppDataSnapshot) {
  return {
    ...snapshot,
    trips: (snapshot.trips ?? []).map((trip) => normalizeTripRecord(trip as any)),
    documents: (snapshot.documents ?? []).map((document) => normalizeDocumentRecord(document as any)),
    appPreferences: normalizeAppPreferences({
      ...defaultAppPreferences(snapshot.appPreferences?.createdAt ?? now()),
      ...snapshot.appPreferences,
      lastBackupAt: snapshot.appPreferences?.lastBackupAt ?? null,
    } as any),
  };
}

async function writeSnapshot(snapshot: AppDataSnapshot) {
  await set(SNAPSHOT_KEY, await encryptSnapshot(normalizeSnapshot(snapshot)));
}

function withUpsert<T extends { id: string }>(items: T[], nextItem: T) {
  return [...items.filter((item) => item.id !== nextItem.id), nextItem];
}

function withTripUpsert<T extends { tripId: string }>(items: T[], nextItem: T) {
  return [...items.filter((item) => item.tripId !== nextItem.tripId), nextItem];
}

export async function loadSnapshot(): Promise<AppDataSnapshot> {
  return readSnapshot();
}

export async function upsertTrip(input: TripDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('trip');
  const destinationImageLocalPath = input.destinationImageLocalPath ?? input.coverImageUri ?? null;
  const destinationImageRemoteUrl = input.destinationImageRemoteUrl ?? input.heroImageRemoteUrl ?? null;
  await writeSnapshot({
    ...snapshot,
    trips: withUpsert(snapshot.trips, {
      ...input,
      id,
      destinationType: input.destinationType ?? 'unknown',
      destinationImageLocalPath,
      destinationImageRemoteUrl,
      destinationImageSource: input.destinationImageSource ?? 'fallback',
      attributionText: input.attributionText ?? 'Default trip background',
      attributionMeta: input.attributionMeta ?? { source: 'fallback', sourceLabel: 'Default trip background' },
      coverImageUri: destinationImageLocalPath,
      heroImageRemoteUrl: destinationImageRemoteUrl,
      heroImageStatus: input.heroImageStatus ?? 'idle',
      notes: input.notes ?? '',
      transferSummary: input.transferSummary ?? '',
      createdAt: snapshot.trips.find((trip) => trip.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
    tripParticipants: snapshot.tripParticipants.some((participant) => participant.tripId === id)
      ? snapshot.tripParticipants
      : [
          ...snapshot.tripParticipants,
          {
            id: `participant_${id}`,
            tripId: id,
            displayName: 'You',
            email: '',
            role: 'owner',
            avatarColor: '#F4B400',
            inviteCode: `PINE-${id.slice(-6).toUpperCase()}`,
            isLocalProfile: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
    sharedTripStates: snapshot.sharedTripStates.some((state) => state.tripId === id)
      ? snapshot.sharedTripStates
      : [
          ...snapshot.sharedTripStates,
          {
            tripId: id,
            shareCode: `PINE-${id.slice(-6).toUpperCase()}`,
            syncEnabled: false,
            syncStatus: 'local_only',
            lastSyncAt: null,
            lastExportedAt: null,
            lastImportedAt: null,
            lastKnownRemoteUpdatedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
  });
  return id;
}

export async function upsertTraveller(input: TravellerDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('traveller');
  await writeSnapshot({
    ...snapshot,
    travellers: withUpsert(snapshot.travellers, {
      ...input,
      id,
      createdAt: snapshot.travellers.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertDocument(input: DocumentDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('document');
  const normalized = normalizeDocumentRecord(input as any);
  await writeSnapshot({
    ...snapshot,
    documents: withUpsert(snapshot.documents, {
      ...normalized,
      id,
      createdAt: snapshot.documents.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertPackingItem(input: PackingItemDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('packing');
  await writeSnapshot({
    ...snapshot,
    packingItems: withUpsert(snapshot.packingItems, {
      ...input,
      id,
      createdAt: snapshot.packingItems.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertTravelSegment(input: TravelSegmentDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('segment');
  await writeSnapshot({
    ...snapshot,
    travelSegments: withUpsert(snapshot.travelSegments, {
      ...input,
      id,
      createdAt: snapshot.travelSegments.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertHotelStay(input: HotelStayDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('hotel');
  await writeSnapshot({
    ...snapshot,
    hotelStays: withUpsert(snapshot.hotelStays, {
      ...input,
      id,
      createdAt: snapshot.hotelStays.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertItineraryEvent(input: ItineraryEventDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('event');
  await writeSnapshot({
    ...snapshot,
    itineraryEvents: withUpsert(snapshot.itineraryEvents, {
      ...input,
      id,
      createdAt: snapshot.itineraryEvents.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertEmergencyInfo(input: EmergencyInfoDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('emergency');
  await writeSnapshot({
    ...snapshot,
    emergencyInfos: withTripUpsert(snapshot.emergencyInfos, {
      ...input,
      id,
      createdAt: snapshot.emergencyInfos.find((item) => item.tripId === input.tripId)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertReminderSetting(input: ReminderSettingDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('reminder');
  await writeSnapshot({
    ...snapshot,
    reminderSettings: withUpsert(snapshot.reminderSettings, {
      ...input,
      id,
      createdAt: snapshot.reminderSettings.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertAppPreferences(input: AppPreferencesDraft) {
  const snapshot = await readSnapshot();
  const normalized = normalizeAppPreferences({
    ...snapshot.appPreferences,
    ...input,
    id: 'app',
  } as any);
  await writeSnapshot({
    ...snapshot,
    appPreferences: {
      ...normalized,
      createdAt: snapshot.appPreferences.createdAt,
      updatedAt: now(),
    },
  });
  return 'app';
}

export async function upsertTripParticipant(input: TripParticipantDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('participant');
  await writeSnapshot({
    ...snapshot,
    tripParticipants: withUpsert(snapshot.tripParticipants, {
      ...input,
      id,
      createdAt: snapshot.tripParticipants.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertTripInvite(input: TripInviteDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('invite');
  await writeSnapshot({
    ...snapshot,
    tripInvites: withUpsert(snapshot.tripInvites, {
      ...input,
      id,
      createdAt: snapshot.tripInvites.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function upsertSharedTripState(input: SharedTripStateDraft) {
  const snapshot = await readSnapshot();
  await writeSnapshot({
    ...snapshot,
    sharedTripStates: withTripUpsert(snapshot.sharedTripStates, {
      ...snapshot.sharedTripStates.find((item) => item.tripId === input.tripId),
      ...input,
      tripId: input.tripId,
      createdAt: snapshot.sharedTripStates.find((item) => item.tripId === input.tripId)?.createdAt ?? now(),
      updatedAt: now(),
    }),
  });
  return input.tripId;
}

export async function upsertSyncConflict(input: SyncConflictDraft) {
  const snapshot = await readSnapshot();
  const timestamp = now();
  const id = input.id ?? createId('conflict');
  await writeSnapshot({
    ...snapshot,
    syncConflicts: withUpsert(snapshot.syncConflicts, {
      ...input,
      id,
      createdAt: snapshot.syncConflicts.find((item) => item.id === id)?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
  });
  return id;
}

export async function deleteById(table: string, id: string) {
  const snapshot = await readSnapshot();
  const next = { ...snapshot };

  switch (table) {
    case 'trips':
      next.trips = snapshot.trips.filter((item) => item.id !== id);
      next.travellers = snapshot.travellers.filter((item) => item.tripId !== id);
      next.documents = snapshot.documents.filter((item) => item.tripId !== id);
      next.packingItems = snapshot.packingItems.filter((item) => item.tripId !== id);
      next.travelSegments = snapshot.travelSegments.filter((item) => item.tripId !== id);
      next.hotelStays = snapshot.hotelStays.filter((item) => item.tripId !== id);
      next.itineraryEvents = snapshot.itineraryEvents.filter((item) => item.tripId !== id);
      next.emergencyInfos = snapshot.emergencyInfos.filter((item) => item.tripId !== id);
      next.reminderSettings = snapshot.reminderSettings.filter((item) => item.tripId !== id);
      next.tripParticipants = snapshot.tripParticipants.filter((item) => item.tripId !== id);
      next.tripInvites = snapshot.tripInvites.filter((item) => item.tripId !== id);
      next.sharedTripStates = snapshot.sharedTripStates.filter((item) => item.tripId !== id);
      next.syncConflicts = snapshot.syncConflicts.filter((item) => item.tripId !== id);
      break;
    case 'travellers':
      next.travellers = snapshot.travellers.filter((item) => item.id !== id);
      next.documents = snapshot.documents.map((item) => (item.travellerId === id ? { ...item, travellerId: null } : item));
      next.packingItems = snapshot.packingItems.map((item) =>
        item.travellerIds.includes(id) ? { ...item, travellerIds: item.travellerIds.filter((travellerId) => travellerId !== id) } : item
      );
      break;
    case 'documents':
      next.documents = snapshot.documents.filter((item) => item.id !== id);
      break;
    case 'packing_items':
      next.packingItems = snapshot.packingItems.filter((item) => item.id !== id);
      break;
    case 'travel_segments':
      next.travelSegments = snapshot.travelSegments.filter((item) => item.id !== id);
      break;
    case 'hotel_stays':
      next.hotelStays = snapshot.hotelStays.filter((item) => item.id !== id);
      break;
    case 'itinerary_events':
      next.itineraryEvents = snapshot.itineraryEvents.filter((item) => item.id !== id);
      break;
    case 'emergency_infos':
      next.emergencyInfos = snapshot.emergencyInfos.filter((item) => item.id !== id);
      break;
    case 'trip_participants':
      next.tripParticipants = snapshot.tripParticipants.filter((item) => item.id !== id);
      break;
    case 'trip_invites':
      next.tripInvites = snapshot.tripInvites.filter((item) => item.id !== id);
      break;
    case 'sync_conflicts':
      next.syncConflicts = snapshot.syncConflicts.filter((item) => item.id !== id);
      break;
    default:
      break;
  }

  await writeSnapshot(next);
}

export async function clearAllData() {
  await del(SNAPSHOT_KEY);
  await writeSnapshot(emptySnapshot());
}

export async function persistSnapshot(snapshot: AppDataSnapshot) {
  await writeSnapshot(snapshot);
}

export async function replaceAllData(snapshot: AppDataSnapshot) {
  await writeSnapshot(snapshot);
}
